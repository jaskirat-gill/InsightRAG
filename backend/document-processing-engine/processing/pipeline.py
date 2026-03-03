import logging
import os

from processing.parser import parse_document
from processing.chunker import chunk_semantic
from processing.embedder import embed_texts
from processing.indexer import (
    create_kb_and_document,
    index_chunks,
    update_document_status,
    delete_document_data,
)

logger = logging.getLogger("doc_worker.pipeline")


def process_document(payload: dict):
    """
    Full document processing pipeline.

    1. Create KB + document in PostgreSQL
    2. Parse the file
    3. Chunk (semantic)
    4. Embed (local model)
    5. Index to Qdrant + chunk_metadata
    6. Update status to completed
    """
    local_path = payload["local_path"]
    file_path = payload["file_path"]
    parse_profile = payload.get("parse_profile")

    kb_id, document_id = create_kb_and_document(payload)

    try:
        logger.info("Step 1/5: Parsing %s", local_path)
        elements = parse_document(local_path, parse_profile=parse_profile)
        if not elements:
            update_document_status(document_id, "failed", error="No content extracted")
            return

        logger.info("Step 2/5: Chunking (%d elements)", len(elements))
        chunks = chunk_semantic(elements, chunk_size=512, chunk_overlap=50)
        if not chunks:
            update_document_status(document_id, "failed", error="No chunks produced")
            return

        logger.info("Step 3/5: Embedding %d chunks", len(chunks))
        texts = [c["chunk_text"] for c in chunks]
        embeddings = embed_texts(texts)

        logger.info("Step 4/5: Indexing to Qdrant + PostgreSQL")
        index_chunks(kb_id, document_id, chunks, embeddings)

        logger.info("Step 5/5: Updating status to completed")
        update_document_status(
            document_id,
            status="completed",
            total_chunks=len(chunks),
            strategy=parse_profile or "semantic",
        )

        logger.info(
            "Pipeline complete for %s: KB=%s, Doc=%s, Chunks=%d",
            file_path, kb_id, document_id, len(chunks),
        )

    except Exception as e:
        logger.exception("Pipeline failed for %s: %s", file_path, e)
        update_document_status(document_id, "failed", error=str(e)[:500])
        raise


def delete_document(payload: dict):
    """Handle document deletion: remove from PostgreSQL and Qdrant."""
    file_path = payload["file_path"]
    local_path = payload.get("local_path")

    delete_document_data(file_path)

    if local_path and os.path.exists(local_path):
        try:
            os.remove(local_path)
            logger.info("Removed local file: %s", local_path)
        except OSError as e:
            logger.warning("Failed to remove local file %s: %s", local_path, e)
