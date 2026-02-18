from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import hashlib

from database import get_db, Database
from middleware.auth import get_current_active_user
from middleware.permissions import require_permission

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