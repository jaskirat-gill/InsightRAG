import logging
from fastmcp import FastMCP
from typing import List, Dict, Optional
import os

from embeddings import generate_embedding
from search import search_qdrant
from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s"
)
logger = logging.getLogger("mcp_server")

# Initialize MCP server
mcp = FastMCP("Knowledge Base Search Server")

def _track_retrievals(vector_ids: List[str]) -> None:
    """
    Increment retrieval_count and set last_retrieved_at for retrieved chunks.
    Uses vector_id (Qdrant point ID) which is stored in chunk_metadata.vector_id.
    Silently skips if DATABASE_URL is not configured.
    """
    if not settings.DATABASE_URL or not vector_ids:
        return
    try:
        import psycopg2
        conn = psycopg2.connect(settings.DATABASE_URL)
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE chunk_metadata
                SET retrieval_count = retrieval_count + 1,
                    last_retrieved_at = NOW()
                WHERE vector_id = ANY(%s)
                """,
                (vector_ids,),
            )
        conn.commit()
        conn.close()
        logger.debug("Updated retrieval counts for %d chunk(s)", len(vector_ids))
    except Exception as exc:
        logger.warning("Failed to update retrieval counts: %s", exc)


@mcp.tool()
def search_knowledge_base(
    query: str,
    top_k: int = 5,
    kb_id: Optional[str] = None
) -> List[Dict]:
    """
    Search the knowledge base for relevant information.
    
    Args:
        query: The search query text
        top_k: Number of results to return (default 5, max 20)
        kb_id: Optional knowledge base ID to search within
    
    Returns:
        List of relevant document chunks with metadata
    """
    logger.info("Received search query: %s (top_k=%d, kb_id=%s)", 
               query, top_k, kb_id or "all")
    
    # Validate inputs
    if not query or not query.strip():
        return {"error": "Query cannot be empty"}
    
    if top_k < 1 or top_k > 20:
        top_k = min(max(top_k, 1), 20)
    
    try:
        # Step 1: Generate embedding for query
        logger.info("Generating embedding for query...")
        query_embedding = generate_embedding(query)
        
        # Step 2: Search Qdrant
        logger.info("Searching Qdrant...")
        results = search_qdrant(
            query_vector=query_embedding,
            top_k=top_k,
            kb_id=kb_id,
            score_threshold=0.5  # Minimum relevance threshold
        )
        
        # Step 3: Track retrievals in PostgreSQL
        vector_ids = [str(r["vector_id"]) for r in results if r.get("vector_id")]
        _track_retrievals(vector_ids)

        # Step 4: Format for LLM consumption
        formatted_results = []
        for result in results:
            formatted_results.append({
                "text": result["chunk_text"],
                "source": f"Document {result['document_id'][:8]}",
                "section": result.get("section_title") or "N/A",
                "page": result.get("page_number") or "N/A",
                "relevance_score": round(result["score"], 3)
            })

        logger.info("Returning %d results", len(formatted_results))
        return formatted_results
        
    except Exception as e:
        logger.exception("Search failed: %s", e)
        return {"error": f"Search failed: {str(e)}"}


@mcp.tool()
def get_available_collections() -> Dict:
    """
    Get information about available Qdrant collections.
    Useful for debugging.
    
    Returns:
        Dictionary with collection info
    """
    try:
        from search import get_qdrant_client, COLLECTION_NAME
        
        client = get_qdrant_client()
        collections = client.get_collections().collections
        
        # Get point count for main collection
        try:
            collection_info = client.get_collection(COLLECTION_NAME)
            point_count = collection_info.points_count
        except:
            point_count = 0
        
        return {
            "main_collection": COLLECTION_NAME,
            "total_chunks": point_count,
            "all_collections": [c.name for c in collections]
        }
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    logger.info("Starting MCP server...")
    logger.info("Qdrant URL: %s", os.getenv("QDRANT_URL", "http://qdrant:6333"))
    logger.info(
        "MCP transport: http (host=%s, port=%d)",
        settings.MCP_HOST,
        settings.MCP_PORT,
    )

    mcp.run(
        transport="http",
        host=settings.MCP_HOST,
        port=settings.MCP_PORT,
    )
