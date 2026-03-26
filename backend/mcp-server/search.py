import logging
import os
import re
from typing import List, Dict, Optional, Tuple
from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse
from qdrant_client.models import Filter, FieldCondition, MatchValue
from config import settings

logger = logging.getLogger("mcp_server.search")

# Qdrant configuration (matches document-processing-engine)
QDRANT_URL = os.getenv("QDRANT_URL", "http://qdrant:6333")
COLLECTION_NAME = "document_chunks"  # Same as indexer.py

_qdrant_client = None
RRF_K = 60  # Common RRF constant

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
    kb_ids: Optional[List[str]] = None,
    score_threshold: float = settings.DEFAULT_SCORE_THRESHOLD
) -> List[Dict]:
    """
    Search Qdrant for similar vectors.
    
    Args:
        query_vector: Embedding of the search query (384-dim)
        top_k: Number of results to return
        kb_ids: Optional KB filters (search within allowed KBs only)
        score_threshold: Minimum similarity score (0.0 to 1.0)
    
    Returns:
        List of search results with metadata
    """
    client = get_qdrant_client()
    
    if kb_ids is not None and len(kb_ids) == 0:
        return []

    # Build filter if kb_ids provided
    query_filter = None
    if kb_ids:
        if len(kb_ids) == 1:
            query_filter = Filter(
                must=[
                    FieldCondition(
                        key="kb_id",
                        match=MatchValue(value=kb_ids[0])
                    )
                ]
            )
        else:
            query_filter = Filter(
                should=[
                    FieldCondition(
                        key="kb_id",
                        match=MatchValue(value=kb_id)
                    )
                    for kb_id in kb_ids
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
        
    except UnexpectedResponse as e:
        if "doesn't exist" in str(e):
            logger.warning(
                "Collection '%s' does not exist yet. "
                "No documents have been uploaded and processed. "
                "Please upload a document first to initialize the collection.",
                COLLECTION_NAME,
            )
            return []
        logger.error("Search failed: %s", e)
        raise
    except Exception as e:
        logger.error("Search failed: %s", e)
        raise


def _keyword_search_postgres(
    query_text: str,
    top_k: int,
    kb_ids: Optional[List[str]] = None,
) -> List[Dict]:
    """
    Keyword retrieval from PostgreSQL chunk_metadata.
    Designed to recover exact-term matches (e.g., IDs, acronyms like M2).
    """
    if not settings.DATABASE_URL:
        logger.debug("DATABASE_URL not set; skipping keyword leg")
        return []

    if kb_ids is not None and len(kb_ids) == 0:
        return []

    try:
        import psycopg2
        import psycopg2.extras
    except Exception as e:
        logger.warning("psycopg2 unavailable, skipping keyword leg: %s", e)
        return []

    query_lc = query_text.strip().lower()
    if not query_lc:
        return []

    # Keep short tokens too (e.g., M2), but drop single-char noise.
    terms = [t for t in re.split(r"\W+", query_lc) if len(t) >= 2]
    if not terms:
        terms = [query_lc]

    patterns = [f"%{t}%" for t in terms]
    phrase_pattern = f"%{query_lc}%"

    # Pull a broad candidate set, then rank in Python lexically.
    # Keep this high so exact-term hits (e.g., "M2") are not dropped
    # before ranking due to arbitrary SQL row ordering.
    candidate_limit = 5000

    sql = """
        SELECT
            vector_id,
            document_id,
            kb_id,
            chunk_text,
            section_title,
            page_number,
            chunk_index
        FROM chunk_metadata
        WHERE
            (%s::uuid[] IS NULL OR kb_id = ANY(%s::uuid[]))
            AND (
                lower(chunk_text) LIKE %s
                OR lower(chunk_text) LIKE ANY(%s)
                OR lower(COALESCE(section_title, '')) LIKE %s
                OR lower(COALESCE(section_title, '')) LIKE ANY(%s)
            )
        LIMIT %s
    """

    try:
        conn = psycopg2.connect(settings.DATABASE_URL)
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                sql,
                (
                    kb_ids,
                    kb_ids,
                    phrase_pattern,
                    patterns,
                    phrase_pattern,
                    patterns,
                    candidate_limit,
                ),
            )
            rows = cur.fetchall()
        conn.close()
    except Exception as e:
        logger.warning("Keyword query failed, skipping keyword leg: %s", e)
        return []

    def lexical_score(row: Dict) -> float:
        text = (row.get("chunk_text") or "").lower()
        section = (row.get("section_title") or "").lower()

        score = 0.0
        if query_lc in text:
            score += 3.0
        if query_lc in section:
            score += 1.5

        for t in terms:
            # Promote acronym/id-like terms (e.g., M1, M2, FR-007).
            term_weight = 1.0
            if any(ch.isdigit() for ch in t):
                term_weight += 2.0
            if len(t) <= 3:
                term_weight += 0.5
            if t in text:
                score += term_weight
            if t in section:
                score += term_weight * 0.6
        return score

    ranked = sorted(rows, key=lexical_score, reverse=True)
    results = []
    for row in ranked[:top_k]:
        results.append(
            {
                "chunk_text": row.get("chunk_text", ""),
                "document_id": row.get("document_id"),
                "kb_id": row.get("kb_id"),
                "section_title": row.get("section_title"),
                "page_number": row.get("page_number"),
                "chunk_index": row.get("chunk_index"),
                "score": None,  # lexical leg has no cosine score
                "vector_id": row.get("vector_id"),
            }
        )
    return results


def _row_key(row: Dict) -> str:
    """Stable key used by fusion to deduplicate hits across retrieval legs."""
    vector_id = row.get("vector_id")
    if vector_id:
        return f"v:{vector_id}"
    return f"d:{row.get('document_id')}#c:{row.get('chunk_index')}"


def _rrf_fuse(
    vector_results: List[Dict],
    keyword_results: List[Dict],
    top_k: int,
) -> List[Dict]:
    """Reciprocal Rank Fusion (RRF) over vector and keyword ranked lists."""
    fused: Dict[str, Dict] = {}

    def add_leg(results: List[Dict], leg_name: str) -> None:
        for rank, row in enumerate(results, start=1):
            key = _row_key(row)
            if key not in fused:
                fused[key] = {
                    "row": row,
                    "rrf_score": 0.0,
                    "from_legs": set(),
                }
            fused[key]["rrf_score"] += 1.0 / (RRF_K + rank)
            fused[key]["from_legs"].add(leg_name)

    add_leg(vector_results, "vector")
    add_leg(keyword_results, "keyword")

    ranked = sorted(fused.values(), key=lambda x: x["rrf_score"], reverse=True)
    out = []
    for item in ranked[:top_k]:
        row = dict(item["row"])
        legs = item["from_legs"]
        if len(legs) > 1:
            retrieval_source = "hybrid"
        else:
            retrieval_source = next(iter(legs))
        # Keep an explainable score for logs/debug while preserving legacy shape.
        row["hybrid_rrf_score"] = round(item["rrf_score"], 6)
        row["retrieval_source"] = retrieval_source
        out.append(row)
    return out


def search_hybrid(
    query_text: str,
    query_vector: List[float],
    top_k: int = 5,
    kb_ids: Optional[List[str]] = None,
    score_threshold: float = settings.DEFAULT_SCORE_THRESHOLD,
) -> List[Dict]:
    """
    Hybrid retrieval: semantic vector search + keyword search, fused with RRF.
    """
    vector_top_k = min(max(top_k * 4, top_k), 50)
    keyword_top_k = min(max(top_k * 4, top_k), 50)

    vector_results = search_qdrant(
        query_vector=query_vector,
        top_k=vector_top_k,
        kb_ids=kb_ids,
        score_threshold=score_threshold,
    )
    keyword_results = _keyword_search_postgres(
        query_text=query_text,
        top_k=keyword_top_k,
        kb_ids=kb_ids,
    )

    fused = _rrf_fuse(vector_results, keyword_results, top_k=top_k)
    logger.info(
        "Hybrid retrieval: vector=%d keyword=%d fused=%d",
        len(vector_results),
        len(keyword_results),
        len(fused),
    )
    return fused
