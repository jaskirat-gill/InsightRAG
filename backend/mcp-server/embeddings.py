import logging
from typing import List
from sentence_transformers import SentenceTransformer

logger = logging.getLogger("mcp_server.embeddings")

# IMPORTANT: Use same model as document-processing-engine
MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384

_model = None

def get_model():
    """Lazy-load the sentence-transformers model (singleton)."""
    global _model
    if _model is None:
        logger.info("Loading embedding model: %s", MODEL_NAME)
        _model = SentenceTransformer(MODEL_NAME)
        logger.info("Model loaded successfully")
    return _model


def generate_embedding(text: str) -> List[float]:
    """
    Generate embedding vector for text using sentence-transformers.
    
    Args:
        text: Text to embed
    
    Returns:
        384-dimensional embedding vector
    """
    model = get_model()
    embedding = model.encode(
        text,
        normalize_embeddings=True,
        show_progress_bar=False
    )
    return embedding.tolist()