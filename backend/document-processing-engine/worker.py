import logging
from celery_app import celery_app
from processing.pipeline import process_document, delete_document

logger = logging.getLogger("doc_worker")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)


@celery_app.task(name="process_document", bind=True, max_retries=3)
def process_document_task(self, payload: dict):
    """
    Main processing task. Receives file metadata from sync-service.

    Steps:
      1. Create KB + document row in PostgreSQL
      2. Parse file from shared volume
      3. Chunk (semantic)
      4. Embed (local model)
      5. Index to Qdrant + chunk_metadata
      6. Update document status to completed
    """
    logger.info("Processing document: %s", payload.get("file_path"))
    try:
        process_document(payload)
        logger.info("Successfully processed: %s", payload.get("file_path"))
    except Exception as exc:
        logger.exception("Failed to process %s: %s", payload.get("file_path"), exc)
        raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))


@celery_app.task(name="delete_document", bind=True, max_retries=2)
def delete_document_task(self, payload: dict):
    """
    Cleanup task for deleted files.
    Removes document, chunks from PostgreSQL, and vectors from Qdrant.
    """
    logger.info("Deleting document: %s", payload.get("file_path"))
    try:
        delete_document(payload)
        logger.info("Successfully deleted: %s", payload.get("file_path"))
    except Exception as exc:
        logger.exception("Failed to delete %s: %s", payload.get("file_path"), exc)
        raise self.retry(exc=exc, countdown=30)
