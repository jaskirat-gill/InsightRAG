import logging
import os
import uuid
from typing import List, Dict, Any, Optional

import psycopg2
import psycopg2.extras
from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams,
    Distance,
    PointStruct,
    FilterSelector,
    Filter,
    FieldCondition,
    MatchValue,
)

from processing.embedder import EMBEDDING_DIM

logger = logging.getLogger("doc_worker.indexer")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@postgres:5432/openwebui")
QDRANT_URL = os.getenv("QDRANT_URL", "http://qdrant:6333")

COLLECTION_NAME = "document_chunks"
DEFAULT_KB_NAME = "Unassigned"


def get_pg_connection():
    return psycopg2.connect(DATABASE_URL)


def get_qdrant_client():
    return QdrantClient(url=QDRANT_URL)


def ensure_qdrant_collection(client: QdrantClient):
    """Create the Qdrant collection if it doesn't exist."""
    collections = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in collections:
        logger.info("Creating Qdrant collection: %s (dim=%d)", COLLECTION_NAME, EMBEDDING_DIM)
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=EMBEDDING_DIM,
                distance=Distance.COSINE,
            ),
        )


def _find_covering_kb(cur, file_path: str, plugin_id: int) -> Optional[str]:
    """
    Check if any KB's sync_paths cover this file_path (longest-prefix-wins).
    Mirrors SyncService._resolve_target_kb_for_file logic so the indexer
    never auto-creates a KB for a path already claimed by a user-created KB.
    Returns the covering kb_id or None.
    """
    import json as _json

    cur.execute(
        """
        SELECT kb_id, storage_config
        FROM knowledge_bases
        WHERE storage_config ? 'plugin_id'
          AND storage_config->>'plugin_id' = %s
        """,
        (str(plugin_id),),
    )
    rows = cur.fetchall()
    if not rows:
        return None

    normalized_path = file_path.strip().strip("/")
    best_kb_id: Optional[str] = None
    best_prefix_len = -1

    for row in rows:
        kb_id = str(row["kb_id"])
        storage_config = row.get("storage_config") or {}
        if isinstance(storage_config, str):
            try:
                storage_config = _json.loads(storage_config)
            except Exception:
                storage_config = {}

        raw_paths = storage_config.get("sync_paths") or []
        if not isinstance(raw_paths, list):
            raw_paths = []

        prefixes = [str(p).strip().strip("/") for p in raw_paths if str(p).strip()]

        for prefix in prefixes:
            if normalized_path == prefix or normalized_path.startswith(prefix + "/"):
                if len(prefix) > best_prefix_len:
                    best_prefix_len = len(prefix)
                    best_kb_id = kb_id

    return best_kb_id


def _resolve_kb_name(file_path: str) -> str:
    """
    Determine KB name from the S3 key structure.

    Rules:
    - If the key has a parent directory (e.g. 'prefix/my-kb/file.pdf' or
      'my-kb/file.pdf'), use the immediate parent directory as the KB name.
    - If the file is at the root level (e.g. 'file.pdf'), use DEFAULT_KB_NAME.

    Examples:
      'reports/finance/q1.pdf'  -> 'finance'
      'engineering/spec.docx'   -> 'engineering'
      'readme.txt'              -> 'Unassigned'
    """
    parent = os.path.dirname(file_path)
    if parent:
        kb_name = os.path.basename(parent)
        return kb_name if kb_name else DEFAULT_KB_NAME
    return DEFAULT_KB_NAME


def create_kb_and_document(
    payload: dict,
) -> tuple:
    """
    Resolve or create the target knowledge_base and insert a document row.
    KB is determined by the S3 path structure (immediate parent dir = KB name).
    Files at the bucket root are routed to the 'Unassigned' KB.
    Returns (kb_id, document_id).
    """
    conn = get_pg_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            file_path = payload["file_path"]
            file_name = os.path.basename(file_path)
            kb_name = _resolve_kb_name(file_path)
            file_size = payload.get("file_size")
            etag = payload.get("etag")
            local_path = payload.get("local_path")

            existing_kb_id = payload.get("kb_id")
            existing_document_id = payload.get("document_id")

            if existing_kb_id and existing_document_id:
                cur.execute(
                    """
                    SELECT document_id
                    FROM documents
                    WHERE document_id = %s AND kb_id = %s
                    """,
                    (existing_document_id, existing_kb_id),
                )
                existing_doc = cur.fetchone()
                if existing_doc:
                    cur.execute(
                        """
                        UPDATE documents
                        SET processing_status = 'processing',
                            processing_error = NULL,
                            updated_at = NOW()
                        WHERE document_id = %s
                        """,
                        (existing_document_id,),
                    )
                    conn.commit()
                    logger.info(
                        "Reprocessing existing document: KB=%s, Document=%s, Path=%s",
                        existing_kb_id,
                        existing_document_id,
                        file_path,
                    )
                    if local_path:
                        _upsert_document_local_copy(
                            cur=cur,
                            document_id=str(existing_document_id),
                            kb_id=str(existing_kb_id),
                            source_path=file_path,
                            local_path=local_path,
                        )
                        conn.commit()
                    return str(existing_kb_id), str(existing_document_id)

            if existing_kb_id:
                cur.execute(
                    "SELECT kb_id FROM knowledge_bases WHERE kb_id = %s",
                    (existing_kb_id,),
                )
                kb_exists = cur.fetchone()
                if kb_exists:
                    kb_id = str(existing_kb_id)
                    cur.execute("""
                        INSERT INTO documents (
                            kb_id, source_path, document_type, title,
                            file_size_bytes, file_hash, processing_status
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, 'processing')
                        ON CONFLICT (kb_id, source_path) DO UPDATE
                            SET processing_status = 'processing',
                                processing_error = NULL,
                                file_hash = EXCLUDED.file_hash,
                                file_size_bytes = EXCLUDED.file_size_bytes,
                                updated_at = NOW()
                        RETURNING document_id
                    """, (
                        kb_id,
                        file_path,
                        _get_doc_type(file_path),
                        file_name,
                        file_size,
                        etag,
                    ))
                    doc_row = cur.fetchone()
                    document_id = str(doc_row["document_id"])
                    conn.commit()
                    logger.info(
                        "Created/updated document in routed KB=%s, Document=%s for %s",
                        kb_id, document_id, file_path,
                    )
                    return kb_id, document_id

            # Safety check: if a user-created KB's sync_paths already covers
            # this file, route into that KB instead of auto-creating a new one.
            plugin_id_from_payload = payload.get("plugin_id")
            if plugin_id_from_payload is not None:
                covering_kb_id = _find_covering_kb(cur, file_path, int(plugin_id_from_payload))
                if covering_kb_id:
                    kb_id = covering_kb_id
                    cur.execute("""
                        INSERT INTO documents (
                            kb_id, source_path, document_type, title,
                            file_size_bytes, file_hash, processing_status
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, 'processing')
                        ON CONFLICT (kb_id, source_path) DO UPDATE
                            SET processing_status = 'processing',
                                processing_error = NULL,
                                file_hash = EXCLUDED.file_hash,
                                file_size_bytes = EXCLUDED.file_size_bytes,
                                updated_at = NOW()
                        RETURNING document_id
                    """, (
                        kb_id,
                        file_path,
                        _get_doc_type(file_path),
                        file_name,
                        file_size,
                        etag,
                    ))
                    doc_row = cur.fetchone()
                    document_id = str(doc_row["document_id"])
                    if local_path:
                        _upsert_document_local_copy(
                            cur=cur,
                            document_id=document_id,
                            kb_id=kb_id,
                            source_path=file_path,
                            local_path=local_path,
                        )
                    conn.commit()
                    logger.info(
                        "Routed to covering KB=%s (sync_paths match), Document=%s for %s",
                        kb_id, document_id, file_path,
                    )
                    return kb_id, document_id

            # Upsert knowledge base (shared KB — many docs can map to the same KB)
            cur.execute("""
                INSERT INTO knowledge_bases (
                    owner_id, name, description, storage_provider, storage_config, status
                )
                VALUES (
                    (SELECT user_id FROM users WHERE email = 'admin@example.com' LIMIT 1),
                    %s, %s, 'plugin', '{}'::jsonb, 'active'
                )
                ON CONFLICT (owner_id, name) DO UPDATE
                    SET updated_at = NOW()
                RETURNING kb_id
            """, (kb_name, f"Auto-created KB: {kb_name}"))
            kb_row = cur.fetchone()
            kb_id = str(kb_row["kb_id"])

            cur.execute("""
                INSERT INTO documents (
                    kb_id, source_path, document_type, title,
                    file_size_bytes, file_hash, processing_status
                )
                VALUES (%s, %s, %s, %s, %s, %s, 'processing')
                ON CONFLICT (kb_id, source_path) DO UPDATE
                    SET processing_status = 'processing',
                        processing_error = NULL,
                        file_hash = EXCLUDED.file_hash,
                        file_size_bytes = EXCLUDED.file_size_bytes,
                        updated_at = NOW()
                RETURNING document_id
            """, (
                kb_id,
                file_path,
                _get_doc_type(file_path),
                file_name,
                file_size,
                etag,
            ))
            doc_row = cur.fetchone()
            document_id = str(doc_row["document_id"])

            if local_path:
                _upsert_document_local_copy(
                    cur=cur,
                    document_id=document_id,
                    kb_id=kb_id,
                    source_path=file_path,
                    local_path=local_path,
                )

            conn.commit()
            logger.info("Created KB=%s, Document=%s for %s", kb_id, document_id, file_path)
            return kb_id, document_id

    finally:
        conn.close()


def index_chunks(
    kb_id: str,
    document_id: str,
    chunks: List[Dict[str, Any]],
    embeddings: List[List[float]],
):
    """
    Write chunks to Qdrant and chunk_metadata in PostgreSQL.
    """
    qdrant = get_qdrant_client()
    ensure_qdrant_collection(qdrant)

    conn = get_pg_connection()
    try:
        with conn.cursor() as cur:
            # Clear existing chunks for this document (reprocessing support)
            cur.execute("DELETE FROM chunk_metadata WHERE document_id = %s", (document_id,))

            points = []
            for chunk, embedding in zip(chunks, embeddings):
                vector_id = str(uuid.uuid4())
                chunk_text = _sanitize_for_pg(chunk["chunk_text"])
                section_title = _sanitize_for_pg(chunk.get("section_title") or "")

                cur.execute("""
                    INSERT INTO chunk_metadata (
                        document_id, kb_id, chunk_index, chunk_text,
                        chunk_tokens, vector_id, section_title, page_number
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    document_id,
                    kb_id,
                    chunk["chunk_index"],
                    chunk_text,
                    chunk.get("token_count"),
                    vector_id,
                    section_title or None,
                    chunk.get("page_number"),
                ))

                points.append(PointStruct(
                    id=vector_id,
                    vector=embedding,
                    payload={
                        "document_id": document_id,
                        "kb_id": kb_id,
                        "chunk_index": chunk["chunk_index"],
                        "section_title": section_title or None,
                        "page_number": chunk.get("page_number"),
                        "chunk_text": chunk_text[:500],
                    },
                ))

            conn.commit()

        # Batch upsert to Qdrant
        if points:
            # Delete old vectors for this document first
            qdrant.delete(
                collection_name=COLLECTION_NAME,
                points_selector=FilterSelector(
                    filter=Filter(
                        must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]
                    )
                ),
            )
            BATCH_SIZE = 100
            for i in range(0, len(points), BATCH_SIZE):
                batch = points[i:i + BATCH_SIZE]
                qdrant.upsert(collection_name=COLLECTION_NAME, points=batch)

            logger.info("Indexed %d chunks to Qdrant for document %s", len(points), document_id)

    finally:
        conn.close()


def update_document_status(
    document_id: str,
    status: str,
    total_chunks: int = 0,
    strategy: str = "semantic",
    error: Optional[str] = None,
):
    """Update the document processing status in PostgreSQL."""
    conn = get_pg_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE documents
                SET processing_status = %s,
                    total_chunks = %s,
                    processing_strategy = %s,
                    processing_error = %s,
                    updated_at = NOW()
                WHERE document_id = %s
            """, (status, total_chunks, strategy, error, document_id))

            if status == "completed":
                cur.execute("""
                    UPDATE knowledge_bases
                    SET total_documents = (
                        SELECT COUNT(*) FROM documents
                        WHERE kb_id = (SELECT kb_id FROM documents WHERE document_id = %s)
                          AND processing_status = 'completed'
                    ),
                    total_size_bytes = (
                        SELECT COALESCE(SUM(file_size_bytes), 0) FROM documents
                        WHERE kb_id = (SELECT kb_id FROM documents WHERE document_id = %s)
                          AND processing_status = 'completed'
                    ),
                    updated_at = NOW()
                    WHERE kb_id = (SELECT kb_id FROM documents WHERE document_id = %s)
                """, (document_id, document_id, document_id))

            conn.commit()
    finally:
        conn.close()


def delete_document_data(file_path: str):
    """Remove document, chunks from PostgreSQL and vectors from Qdrant."""
    conn = get_pg_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT document_id, kb_id FROM documents WHERE source_path = %s",
                (file_path,),
            )
            row = cur.fetchone()
            if not row:
                logger.warning("No document found for path: %s", file_path)
                return

            document_id = str(row["document_id"])
            kb_id = str(row["kb_id"])

            # Delete from Qdrant
            try:
                qdrant = get_qdrant_client()
                qdrant.delete(
                    collection_name=COLLECTION_NAME,
                    points_selector=FilterSelector(
                        filter=Filter(
                            must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]
                        )
                    ),
                )
            except Exception as e:
                logger.warning("Failed to delete from Qdrant: %s", e)

            # CASCADE deletes chunk_metadata
            cur.execute("DELETE FROM documents WHERE document_id = %s", (document_id,))

            # Clean up empty auto-created KBs, but never delete the default KB
            cur.execute(
                "SELECT COUNT(*) as cnt FROM documents WHERE kb_id = %s",
                (kb_id,),
            )
            count_row = cur.fetchone()
            if count_row and count_row["cnt"] == 0:
                cur.execute(
                    "SELECT name FROM knowledge_bases WHERE kb_id = %s",
                    (kb_id,),
                )
                kb_name_row = cur.fetchone()
                if kb_name_row and kb_name_row["name"] != DEFAULT_KB_NAME:
                    cur.execute("DELETE FROM knowledge_bases WHERE kb_id = %s", (kb_id,))
                    logger.info("Deleted empty KB: %s", kb_id)
                else:
                    logger.debug("Skipped deletion of KB '%s' (default or Unassigned)", kb_id)

            conn.commit()
            logger.info("Deleted document %s and its chunks", document_id)

    finally:
        conn.close()


def _sanitize_for_pg(text: str) -> str:
    """Strip NUL bytes that PostgreSQL TEXT columns reject."""
    if not text:
        return text
    return text.replace("\x00", "")


def _ensure_document_local_copy_table(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS document_local_copies (
            copy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            document_id UUID REFERENCES documents(document_id) ON DELETE CASCADE,
            kb_id UUID REFERENCES knowledge_bases(kb_id) ON DELETE CASCADE,
            source_path TEXT NOT NULL,
            local_path TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    cur.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS idx_document_local_copies_doc
        ON document_local_copies(document_id)
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_document_local_copies_kb_source
        ON document_local_copies(kb_id, source_path)
        """
    )


def _upsert_document_local_copy(cur, document_id: str, kb_id: str, source_path: str, local_path: str):
    _ensure_document_local_copy_table(cur)
    cur.execute(
        """
        INSERT INTO document_local_copies (
            document_id, kb_id, source_path, local_path, created_at, updated_at
        )
        VALUES (%s, %s, %s, %s, NOW(), NOW())
        ON CONFLICT (document_id) DO UPDATE
        SET local_path = EXCLUDED.local_path,
            source_path = EXCLUDED.source_path,
            updated_at = NOW()
        """,
        (document_id, kb_id, source_path, local_path),
    )


def _get_doc_type(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower().replace(".", "")
    return ext if ext else "unknown"
