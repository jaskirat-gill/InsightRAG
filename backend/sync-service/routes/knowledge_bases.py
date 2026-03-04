from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, validator
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
import json
import logging

import httpx

from database import get_db, Database
from middleware.auth import get_current_active_user
from middleware.permissions import require_permission
from config import settings

logger = logging.getLogger("knowledge_bases")

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

    @validator("storage_config", pre=True)
    def parse_storage_config(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v

def _normalize_prefix(path: str) -> str:
    """Strip leading/trailing whitespace and slashes for consistent prefix matching."""
    return path.strip().strip("/")


async def _reassign_documents_to_kb(
    db: Database,
    target_kb_id: str,
    sync_paths: List[str],
    plugin_id: int,
) -> int:
    """
    Find documents whose source_path matches the given sync_paths (longest-prefix-wins)
    and reassign them to target_kb_id.

    Updates documents.kb_id, chunk_metadata.kb_id, and the kb_id payload in Qdrant.
    Refreshes total_documents / total_size_bytes on all affected KBs.
    Returns the count of reassigned documents.
    """
    if not sync_paths:
        return 0

    normalized_targets = [_normalize_prefix(p) for p in sync_paths if str(p).strip()]
    if not normalized_targets:
        return 0

    # Build a mapping of ALL KBs for this plugin so we can apply longest-prefix-wins
    # across the entire set (not just the target KB).
    all_kb_rows = await db.fetch_all(
        """
        SELECT kb_id, storage_config
        FROM knowledge_bases
        WHERE storage_config::jsonb ? 'plugin_id'
          AND storage_config::jsonb->>'plugin_id' = $1
        """,
        str(plugin_id),
    )

    # Parse all KBs' sync_paths into a list of (kb_id, prefix) tuples
    kb_prefixes: List[tuple] = []  # (kb_id_str, prefix_str)
    for row in all_kb_rows:
        row_dict = dict(row)
        kb_id_str = str(row_dict["kb_id"])
        sc = row_dict.get("storage_config") or {}
        if isinstance(sc, str):
            try:
                sc = json.loads(sc)
            except Exception:
                sc = {}
        paths = sc.get("sync_paths") or []
        if not isinstance(paths, list):
            paths = []
        for p in paths:
            normalized = _normalize_prefix(str(p))
            if normalized:
                kb_prefixes.append((kb_id_str, normalized))

    # Fetch all documents across all KBs that are NOT already in the target KB
    candidate_docs = await db.fetch_all(
        """
        SELECT d.document_id, d.kb_id, d.source_path
        FROM documents d
        WHERE d.kb_id != $1
        """,
        target_kb_id,
    )

    # For each candidate, check if its source_path matches one of the target KB's
    # sync_paths AND that the target KB is the best (longest prefix) match.
    to_reassign: List[tuple] = []  # (document_id, old_kb_id)

    for doc in candidate_docs:
        doc_dict = dict(doc)
        doc_path = _normalize_prefix(doc_dict["source_path"])
        doc_id = str(doc_dict["document_id"])
        old_kb_id = str(doc_dict["kb_id"])

        # Check if this doc matches any of the target KB's sync_paths
        target_match_len = -1
        for tp in normalized_targets:
            if doc_path == tp or doc_path.startswith(tp + "/"):
                if len(tp) > target_match_len:
                    target_match_len = len(tp)

        if target_match_len < 0:
            continue  # doc doesn't match target KB's paths

        # Check if another KB has a longer matching prefix (longest-prefix-wins)
        best_kb = target_kb_id
        best_len = target_match_len
        for kb_id_str, prefix in kb_prefixes:
            if kb_id_str == target_kb_id:
                continue
            if doc_path == prefix or doc_path.startswith(prefix + "/"):
                if len(prefix) > best_len:
                    best_len = len(prefix)
                    best_kb = kb_id_str

        if best_kb == target_kb_id:
            to_reassign.append((doc_id, old_kb_id))

    if not to_reassign:
        return 0

    # Perform the reassignment
    reassigned = 0
    affected_kb_ids = {target_kb_id}

    for doc_id, old_kb_id in to_reassign:
        affected_kb_ids.add(old_kb_id)

        # 1. Update documents table
        await db.execute(
            "UPDATE documents SET kb_id = $1, updated_at = NOW() WHERE document_id = $2",
            target_kb_id, doc_id,
        )
        # 2. Update chunk_metadata table
        await db.execute(
            "UPDATE chunk_metadata SET kb_id = $1 WHERE document_id = $2",
            target_kb_id, doc_id,
        )
        # 3. Update Qdrant kb_id payload
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(
                    f"{settings.QDRANT_URL}/collections/document_chunks/points/payload",
                    json={
                        "payload": {"kb_id": target_kb_id},
                        "filter": {
                            "must": [
                                {"key": "document_id", "match": {"value": doc_id}}
                            ]
                        },
                    },
                )
        except Exception as e:
            logger.warning("Qdrant payload update failed for doc %s: %s", doc_id, e)

        reassigned += 1

    # Refresh totals on all affected KBs
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

    logger.info("Reassigned %d documents into KB %s", reassigned, target_kb_id)
    return reassigned


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

    # Post-creation: reassign existing documents that match the new KB's sync_paths
    storage_config = kb.storage_config or {}
    sync_paths = storage_config.get("sync_paths", [])
    plugin_id = storage_config.get("plugin_id")

    if sync_paths and plugin_id is not None:
        reassigned = await _reassign_documents_to_kb(
            db=db,
            target_kb_id=str(result["kb_id"]),
            sync_paths=sync_paths,
            plugin_id=int(plugin_id),
        )
        if reassigned > 0:
            logger.info(
                "Post-creation: reassigned %d documents into KB %s",
                reassigned, result["kb_id"],
            )
            # Re-fetch to get updated counts
            result = await db.fetch_one(
                "SELECT * FROM knowledge_bases WHERE kb_id = $1",
                str(result["kb_id"]),
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
    new_sync_paths = None
    resolved_plugin_id = None

    if "storage_config" in update_payload and update_payload["storage_config"] is not None:
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

        new_sync_paths = merged["sync_paths"]
        resolved_plugin_id = existing_plugin_id

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

    # If sync_paths were updated, reassign matching documents into this KB
    if new_sync_paths and resolved_plugin_id is not None:
        reassigned = await _reassign_documents_to_kb(
            db=db,
            target_kb_id=str(kb_id),
            sync_paths=new_sync_paths,
            plugin_id=int(resolved_plugin_id),
        )
        if reassigned > 0:
            logger.info(
                "Post-update: reassigned %d documents into KB %s",
                reassigned, kb_id,
            )
            # Re-fetch to get updated counts
            result = await db.fetch_one(
                "SELECT * FROM knowledge_bases WHERE kb_id = $1",
                str(kb_id),
            )

    return KBResponse(**dict(result))

@router.delete("/{kb_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_base(
    kb_id: UUID,
    current_user: Dict = require_permission("kb.delete"),
    db: Database = Depends(get_db)
):
    """Delete knowledge base and all associated data (SQL + Qdrant vectors)"""
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
        logger.warning("Qdrant deletion failed for kb %s: %s", kb_id_str, exc)

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


@router.get("/strategies")
async def list_strategies():
    """Return available processing strategies (single source of truth)."""
    from routes.documents import PDF_STRATEGY_OPTIONS
    return [{"key": o.key, "label": o.label, "description": o.description} for o in PDF_STRATEGY_OPTIONS]
