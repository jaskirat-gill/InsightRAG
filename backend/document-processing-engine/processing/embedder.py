import logging
from typing import List
import numpy as np

logger = logging.getLogger("doc_worker.embedder")

_model = None
MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384


def get_model():
    """Lazy-load the sentence-transformers model (singleton)."""
    global _model
    if _model is None:
        logger.info("Loading embedding model: %s", MODEL_NAME)
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(MODEL_NAME)
        logger.info("Model loaded successfully")
    return _model


def embed_texts(texts: List[str], batch_size: int = 64) -> List[List[float]]:
    """
    Encode a list of texts into embedding vectors.

    Returns list of float lists (each 384-dim for all-MiniLM-L6-v2).
    """
    if not texts:
        return []

    model = get_model()
    logger.info("Embedding %d texts (batch_size=%d)", len(texts), batch_size)

    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=False,
        normalize_embeddings=True,
    )

    return [emb.tolist() for emb in embeddings]
