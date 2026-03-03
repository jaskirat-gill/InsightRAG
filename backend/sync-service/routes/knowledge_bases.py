from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

from database import get_db, Database
from middleware.auth import get_current_active_user
from middleware.permissions import require_permission

router = APIRouter(prefix="/knowledge-bases", tags=["Knowledge Bases"])

# Pydantic Models
class KBCreate(BaseModel):
    name: str
    description: Optional[str] = None
    storage_provider: str = "s3"
    storage_config: Dict[str, Any]
    processing_strategy: str = "semantic"
    chunk_size: int = 512
    chunk_overlap: int = 50

class KBUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    processing_strategy: Optional[str] = None
    chunk_size: Optional[int] = None
    chunk_overlap: Optional[int] = None
    storage_config: Optional[Dict[str, Any]] = None

class KBResponse(BaseModel):
    kb_id: UUID
    owner_id: UUID
    name: str
    description: Optional[str]
    storage_provider: str
    storage_config: Dict[str, Any]
    processing_strategy: str
    status: str
    health_score: int
    total_documents: int
    total_size_bytes: int
    last_synced_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

# Endpoints
@router.post("", response_model=KBResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledge_base(
    kb: KBCreate,
    current_user: Dict = require_permission("kb.create"),
    db: Database = Depends(get_db)
):
    """Create a new knowledge base"""
    
    # Check if KB with same name already exists for this user
    existing = await db.fetch_one(
        "SELECT kb_id FROM knowledge_bases WHERE owner_id = $1 AND name = $2",
        current_user["user_id"], kb.name
    )
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Knowledge base '{kb.name}' already exists"
        )
    
    # Create KB
    import json
    result = await db.fetch_one("""
        INSERT INTO knowledge_bases (
            owner_id, name, description, storage_provider, storage_config,
            processing_strategy, chunk_size, chunk_overlap
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
        RETURNING *
    """,
        current_user["user_id"],
        kb.name,
        kb.description,
        kb.storage_provider,
        json.dumps(kb.storage_config),
        kb.processing_strategy,
        kb.chunk_size,
        kb.chunk_overlap
    )
    
    return KBResponse(**dict(result))

@router.get("", response_model=List[KBResponse])
async def list_knowledge_bases(
    current_user: Dict = require_permission("kb.read"),
    db: Database = Depends(get_db)
):
    """List all knowledge bases owned by current user"""
    
    # Admins see all, others see only their own
    if "admin" in current_user["roles"]:
        query = "SELECT * FROM knowledge_bases ORDER BY created_at DESC"
        results = await db.fetch_all(query)
    else:
        query = "SELECT * FROM knowledge_bases WHERE owner_id = $1 ORDER BY created_at DESC"
        results = await db.fetch_all(query, current_user["user_id"])
    
    return [KBResponse(**dict(r)) for r in results]

@router.get("/{kb_id}", response_model=KBResponse)
async def get_knowledge_base(
    kb_id: UUID,
    current_user: Dict = require_permission("kb.read"),
    db: Database = Depends(get_db)
):
    """Get knowledge base details"""
    
    kb = await db.fetch_one(
        "SELECT * FROM knowledge_bases WHERE kb_id = $1",
        str(kb_id)
    )
    
    if not kb:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge base not found"
        )
    
    # Check ownership (unless admin)
    if "admin" not in current_user["roles"] and str(kb["owner_id"]) != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return KBResponse(**dict(kb))

@router.put("/{kb_id}", response_model=KBResponse)
async def update_knowledge_base(
    kb_id: UUID,
    updates: KBUpdate,
    current_user: Dict = require_permission("kb.update"),
    db: Database = Depends(get_db)
):
    """Update knowledge base configuration"""
    
    # Check existence and ownership
    kb = await db.fetch_one(
        "SELECT * FROM knowledge_bases WHERE kb_id = $1",
        str(kb_id)
    )
    
    if not kb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="KB not found")
    
    if "admin" not in current_user["roles"] and str(kb["owner_id"]) != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Build update query
    update_fields = []
    values = []
    param_count = 1
    update_payload = updates.dict(exclude_unset=True)

    # Storage config update is restricted: sync_paths can be updated, plugin source is immutable.
    if "storage_config" in update_payload and update_payload["storage_config"] is not None:
        import json

        existing_config = kb["storage_config"] or {}
        if isinstance(existing_config, str):
            try:
                existing_config = json.loads(existing_config)
            except Exception:
                existing_config = {}
        incoming = update_payload["storage_config"] or {}

        merged = dict(existing_config)
        merged["sync_paths"] = incoming.get("sync_paths", [])

        existing_plugin_id = existing_config.get("plugin_id")
        incoming_plugin_id = incoming.get("plugin_id", existing_plugin_id)
        if existing_plugin_id is not None and incoming_plugin_id != existing_plugin_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="plugin_id cannot be changed after KB creation",
            )
        if existing_plugin_id is not None:
            merged["plugin_id"] = existing_plugin_id

        update_fields.append(f"storage_config = ${param_count}::jsonb")
        values.append(json.dumps(merged))
        param_count += 1
        del update_payload["storage_config"]

    for field, value in update_payload.items():
        if value is not None:
            update_fields.append(f"{field} = ${param_count}")
            values.append(value)
            param_count += 1
    
    if not update_fields:
        return KBResponse(**dict(kb))
    
    values.append(str(kb_id))
    query = f"UPDATE knowledge_bases SET {', '.join(update_fields)} WHERE kb_id = ${param_count} RETURNING *"
    
    result = await db.fetch_one(query, *values)
    return KBResponse(**dict(result))

@router.delete("/{kb_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_base(
    kb_id: UUID,
    current_user: Dict = require_permission("kb.delete"),
    db: Database = Depends(get_db)
):
    """Delete knowledge base and all associated data (SQL + Qdrant vectors)"""
    import httpx
    from config import settings

    kb = await db.fetch_one(
        "SELECT owner_id FROM knowledge_bases WHERE kb_id = $1",
        str(kb_id)
    )

    if not kb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="KB not found")

    if "admin" not in current_user["roles"] and str(kb["owner_id"]) != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    kb_id_str = str(kb_id)

    # 1. Remove all Qdrant vectors for this KB (filter by kb_id payload field)
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{settings.QDRANT_URL}/collections/document_chunks/points/delete",
                json={
                    "filter": {
                        "must": [
                            {"key": "kb_id", "match": {"value": kb_id_str}}
                        ]
                    }
                },
            )
            resp.raise_for_status()
    except httpx.HTTPStatusError as exc:
        # 404 means the collection doesn't exist yet — treat as no-op
        if exc.response.status_code != 404:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Qdrant deletion failed: {exc.response.text}"
            )
    except Exception as exc:
        # Network errors etc. — log and continue so SQL is still cleaned up
        import logging
        logging.getLogger("knowledge_bases").warning(
            "Qdrant deletion failed for kb %s: %s", kb_id_str, exc
        )

    # 2. Delete from SQL (cascade removes documents + chunks via FK)
    await db.execute("DELETE FROM knowledge_bases WHERE kb_id = $1", kb_id_str)
    return None

@router.get("/{kb_id}/health")
async def get_kb_health(
    kb_id: UUID,
    current_user: Dict = require_permission("kb.read"),
    db: Database = Depends(get_db)
):
    """Get knowledge base health metrics including retrieval stats"""

    kb_id_str = str(kb_id)

    # Aggregate health data from documents
    stats = await db.fetch_one("""
        SELECT
            COUNT(*) as total_docs,
            COUNT(CASE WHEN processing_status = 'completed' THEN 1 END) as completed_docs,
            COUNT(CASE WHEN processing_status = 'failed' THEN 1 END) as failed_docs,
            COALESCE(AVG(health_score), 0) as avg_health_score,
            COALESCE(SUM(total_chunks), 0) as total_chunks
        FROM documents
        WHERE kb_id = $1
    """, kb_id_str)

    # Total retrievals across all chunks in this KB
    retrieval_stats = await db.fetch_one("""
        SELECT COALESCE(SUM(retrieval_count), 0) as total_retrievals
        FROM chunk_metadata
        WHERE kb_id = $1
    """, kb_id_str)

    result = dict(stats)
    result["total_retrievals"] = int(retrieval_stats["total_retrievals"])
    return result
