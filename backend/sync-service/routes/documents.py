from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import hashlib
import logging
import os

from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue

from database import get_db, Database
from middleware.auth import get_current_active_user
from middleware.permissions import require_permission

logger = logging.getLogger("sync_service.documents")

QDRANT_URL = os.getenv("QDRANT_URL", "http://qdrant:6333")
COLLECTION_NAME = "document_chunks"

router = APIRouter(prefix="/knowledge-bases", tags=["Documents"])

class DocumentResponse(BaseModel):
    document_id: UUID
    kb_id: UUID
    source_path: str
    document_type: Optional[str]
    title: Optional[str]
    file_size_bytes: Optional[int]
    processing_status: str
    total_chunks: int
    health_score: int
    retrieval_count: int = 0
    last_retrieved_at: Optional[datetime] = None
    created_at: datetime

# List documents in KB
@router.get("/{kb_id}/documents", response_model=List[DocumentResponse])
async def list_documents(
    kb_id: UUID,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = require_permission("doc.read"),
    db: Database = Depends(get_db)
):
    """List all documents in a knowledge base"""
    
    # Verify KB exists and user has access
    kb = await db.fetch_one(
        "SELECT owner_id FROM knowledge_bases WHERE kb_id = $1",
        str(kb_id)
    )
    
    if not kb:
        raise HTTPException(status_code=404, detail="KB not found")
    
    if "admin" not in current_user["roles"] and str(kb["owner_id"]) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    docs = await db.fetch_all("""
        SELECT * FROM documents 
        WHERE kb_id = $1 
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
    """, str(kb_id), limit, skip)
    
    return [DocumentResponse(**dict(d)) for d in docs]

# Upload document (for MVP - manual upload)
@router.post("/{kb_id}/documents/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    kb_id: UUID,
    file: UploadFile = File(...),
    current_user: dict = require_permission("kb.update"),
    db: Database = Depends(get_db)
):
    """Upload a document to knowledge base (MVP - triggers processing)"""
    
    # Verify KB exists and user has access
    kb = await db.fetch_one(
        "SELECT owner_id FROM knowledge_bases WHERE kb_id = $1",
        str(kb_id)
    )
    
    if not kb:
        raise HTTPException(status_code=404, detail="KB not found")
    
    if "admin" not in current_user["roles"] and str(kb["owner_id"]) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Read file
    content = await file.read()
    file_size = len(content)
    file_hash = hashlib.sha256(content).hexdigest()
    
    # Save to local storage (MVP - just save locally)
    import os
    os.makedirs("/tmp/kb_uploads", exist_ok=True)
    local_path = f"/tmp/kb_uploads/{kb_id}/{file.filename}"
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    
    with open(local_path, "wb") as f:
        f.write(content)
    
    # Get file extension
    file_ext = os.path.splitext(file.filename)[1].lower().replace(".", "")
    
    # Create document record
    doc = await db.fetch_one("""
        INSERT INTO documents (
            kb_id, source_path, document_type, title,
            file_size_bytes, file_hash, processing_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING *
    """, 
        str(kb_id),
        local_path,
        file_ext,
        file.filename,
        file_size,
        file_hash
    )
    
    # TODO: Trigger processing (for now, just return)
    # In real implementation: send to Celery or call processing function
    
    return DocumentResponse(**dict(doc))

# Get document details
@router.get("/{kb_id}/documents/{doc_id}", response_model=DocumentResponse)
async def get_document(
    kb_id: UUID,
    doc_id: UUID,
    current_user: dict = require_permission("doc.read"),
    db: Database = Depends(get_db)
):
    """Get document details"""
    
    doc = await db.fetch_one(
        "SELECT * FROM documents WHERE document_id = $1 AND kb_id = $2",
        str(doc_id), str(kb_id)
    )
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return DocumentResponse(**dict(doc))

# Delete document
@router.delete("/{kb_id}/documents/{doc_id}", status_code=204)
async def delete_document(
    kb_id: UUID,
    doc_id: UUID,
    current_user: dict = require_permission("doc.delete"),
    db: Database = Depends(get_db)
):
    """Delete a document"""
    
    result = await db.execute(
        "DELETE FROM documents WHERE document_id = $1 AND kb_id = $2",
        str(doc_id), str(kb_id)
    )
    
    # TODO: Also delete from Qdrant
    
    return None

# Reassign documents to a different KB
class ReassignItem(BaseModel):
    document_id: UUID
    to_kb_id: UUID

@router.post("/{from_kb_id}/reassign")
async def reassign_documents(
    from_kb_id: UUID,
    items: List[ReassignItem],
    current_user: dict = require_permission("kb.update"),
    db: Database = Depends(get_db),
):
    """
    Move one or more documents from from_kb_id to their respective target KBs.
    Updates:
      1. documents.kb_id          (PostgreSQL)
      2. chunk_metadata.kb_id     (PostgreSQL)
      3. kb_id payload field      (Qdrant — all vectors for that document)
    Also refreshes total_documents on affected KBs.
    """
    if not items:
        return {"reassigned": 0}

    # Verify source KB exists and caller has access
    source_kb = await db.fetch_one(
        "SELECT owner_id FROM knowledge_bases WHERE kb_id = $1",
        str(from_kb_id),
    )
    if not source_kb:
        raise HTTPException(status_code=404, detail="Source KB not found")
    if "admin" not in current_user["roles"] and str(source_kb["owner_id"]) != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    qdrant = QdrantClient(url=QDRANT_URL)
    reassigned = 0

    for item in items:
        doc_id = str(item.document_id)
        to_kb_id = str(item.to_kb_id)

        # Verify the target KB exists
        target_exists = await db.fetch_one(
            "SELECT kb_id FROM knowledge_bases WHERE kb_id = $1", to_kb_id
        )
        if not target_exists:
            logger.warning("Skipping reassign — target KB %s not found", to_kb_id)
            continue

        # 1. Update documents table
        await db.execute(
            """
            UPDATE documents
            SET kb_id = $1, updated_at = NOW()
            WHERE document_id = $2 AND kb_id = $3
            """,
            to_kb_id, doc_id, str(from_kb_id),
        )

        # 2. Update chunk_metadata table
        await db.execute(
            "UPDATE chunk_metadata SET kb_id = $1 WHERE document_id = $2",
            to_kb_id, doc_id,
        )

        # 3. Update kb_id payload on all Qdrant points for this document
        try:
            qdrant.set_payload(
                collection_name=COLLECTION_NAME,
                payload={"kb_id": to_kb_id},
                points=Filter(
                    must=[FieldCondition(key="document_id", match=MatchValue(value=doc_id))]
                ),
            )
            logger.info("Qdrant payload updated for doc %s -> KB %s", doc_id, to_kb_id)
        except Exception as e:
            # Postgres already updated — log but keep going
            logger.warning("Qdrant payload update failed for doc %s: %s", doc_id, e)

        reassigned += 1

    # Refresh total_documents and total_size_bytes on every affected KB
    affected_kb_ids = {str(from_kb_id)} | {str(item.to_kb_id) for item in items}
    for kb_id in affected_kb_ids:
        await db.execute(
            """
            UPDATE knowledge_bases
            SET total_documents = (
                SELECT COUNT(*) FROM documents
                WHERE kb_id = $1 AND processing_status = 'completed'
            ),
            total_size_bytes = (
                SELECT COALESCE(SUM(file_size_bytes), 0) FROM documents
                WHERE kb_id = $1 AND processing_status = 'completed'
            ),
            updated_at = NOW()
            WHERE kb_id = $1
            """,
            kb_id,
        )

    logger.info("Reassigned %d/%d documents from KB %s", reassigned, len(items), from_kb_id)
    return {"reassigned": reassigned}


# Simple search endpoint (MVP - keyword search)
@router.post("/{kb_id}/search")
async def search_kb(
    kb_id: UUID,
    query: str,
    top_k: int = 5,
    current_user: dict = require_permission("query.execute"),
    db: Database = Depends(get_db)
):
    """Search knowledge base (MVP - simple keyword search)"""
    
    # Simple keyword search on chunk text
    results = await db.fetch_all("""
        SELECT 
            c.chunk_id,
            c.chunk_text,
            c.section_title,
            c.page_number,
            d.title as document_title,
            d.source_path,
            d.document_id
        FROM chunk_metadata c
        JOIN documents d ON c.document_id = d.document_id
        WHERE c.kb_id = $1 
        AND c.chunk_text ILIKE $2
        ORDER BY c.retrieval_count DESC
        LIMIT $3
    """, str(kb_id), f"%{query}%", top_k)
    
    # Update retrieval count
    for r in results:
        await db.execute("""
            UPDATE chunk_metadata 
            SET retrieval_count = retrieval_count + 1,
                last_retrieved_at = NOW()
            WHERE chunk_id = $1
        """, r["chunk_id"])
    
    return {
        "query": query,
        "kb_id": str(kb_id),
        "results": [dict(r) for r in results],
        "total_results": len(results)
    }