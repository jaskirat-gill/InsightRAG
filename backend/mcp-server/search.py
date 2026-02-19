import logging
import os
from typing import List, Dict, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue, SearchRequest

logger = logging.getLogger("mcp_server.search")

# Qdrant configuration (matches document-processing-engine)
QDRANT_URL = os.getenv("QDRANT_URL", "http://qdrant:6333")
COLLECTION_NAME = "document_chunks"  # Same as indexer.py

_qdrant_client = None

def get_qdrant_client():
    """Get or create Qdrant client (singleton)."""
    global _qdrant_client
    if _qdrant_client is None:
        logger.info("Connecting to Qdrant at %s", QDRANT_URL)
        _qdrant_client = QdrantClient(url=QDRANT_URL)
        
        # Verify collection exists
        try:
            collections = [c.name for c in _qdrant_client.get_collections().collections]
            if COLLECTION_NAME not in collections:
                logger.warning("Collection '%s' not found in Qdrant", COLLECTION_NAME)
            else:
                logger.info("Connected to collection '%s'", COLLECTION_NAME)
        except Exception as e:
            logger.error("Failed to get collections: %s", e)
    
    return _qdrant_client


def search_qdrant(
    query_vector: List[float],
    top_k: int = 5,
    kb_id: Optional[str] = None,
    score_threshold: float = 0.5
) -> List[Dict]:
    """
    Search Qdrant for similar vectors.
    
    Args:
        query_vector: Embedding of the search query (384-dim)
        top_k: Number of results to return
        kb_id: Optional KB filter (search specific KB only)
        score_threshold: Minimum similarity score (0.0 to 1.0)
    
    Returns:
        List of search results with metadata
    """
    client = get_qdrant_client()
    
    # Build filter if kb_id provided
    query_filter = None
    if kb_id:
        query_filter = Filter(
            must=[
                FieldCondition(
                    key="kb_id",
                    match=MatchValue(value=kb_id)
                )
            ]
        )
    
    try:
        # Use query_points method (works with all Qdrant versions)
        search_results = client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vector,
            limit=top_k,
            query_filter=query_filter,
            score_threshold=score_threshold,
            with_payload=True
        )
        
        # Format results
        results = []
        for hit in search_results.points:
            results.append({
                "chunk_text": hit.payload.get("chunk_text", ""),
                "document_id": hit.payload.get("document_id"),
                "kb_id": hit.payload.get("kb_id"),
                "section_title": hit.payload.get("section_title"),
                "page_number": hit.payload.get("page_number"),
                "chunk_index": hit.payload.get("chunk_index"),
                "score": hit.score,
                "vector_id": hit.id
            })
        
        logger.info("Found %d results for query (top_k=%d, threshold=%.2f)", 
                   len(results), top_k, score_threshold)
        return results
        
    except Exception as e:
        logger.error("Search failed: %s", e)
        raise