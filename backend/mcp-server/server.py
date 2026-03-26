import logging
import sys
import hashlib
from fastmcp import FastMCP
from fastmcp.dependencies import CurrentHeaders
from typing import List, Dict, Optional
import os
from os.path import basename
from jose import JWTError, jwt

from embeddings import generate_embedding
from search import search_hybrid
from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger("mcp_server")

# Initialize MCP server
mcp = FastMCP("Knowledge Base Search Server")

_daily_table_checked = False


class MCPAuthError(Exception):
    pass


def _token_fingerprint(token: str) -> str:
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
    return digest[:12]


def _safe_unverified_token_details(token: str) -> Dict:
    details: Dict[str, object] = {}
    try:
        details["header"] = jwt.get_unverified_header(token)
    except Exception as exc:
        details["header_error"] = str(exc)
    try:
        claims = jwt.get_unverified_claims(token)
        details["claims"] = {
            "sub": claims.get("sub"),
            "type": claims.get("type"),
            "iss": claims.get("iss"),
            "aud": claims.get("aud"),
            "exp": claims.get("exp"),
        }
    except Exception as exc:
        details["claims_error"] = str(exc)
    return details


def _error_list(message: str) -> List[Dict]:
    return [{"error": message}]


def _normalize_headers(headers: Optional[Dict]) -> Dict[str, str]:
    if not headers:
        return {}
    return {str(key).lower(): str(value) for key, value in dict(headers).items()}


def _allow_stdio_without_auth(headers: Dict[str, str]) -> bool:
    transport = os.getenv("MCP_TRANSPORT", "http").strip().lower()
    return transport == "stdio" and not headers


def _extract_bearer_token(headers: Dict[str, str]) -> str:
    auth_header = headers.get("authorization", "")
    scheme, _, token = auth_header.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        logger.warning(
            "MCP auth rejected: missing/invalid bearer header (scheme=%r, headers=%s)",
            scheme,
            sorted(headers.keys()),
        )
        raise MCPAuthError("Missing bearer token")
    return token.strip()


def _load_user_context(user_id: str) -> Dict:
    if not settings.DATABASE_URL:
        raise MCPAuthError("DATABASE_URL is not configured for MCP server")

    try:
        import psycopg2
        import psycopg2.extras
    except Exception as exc:
        raise MCPAuthError(f"psycopg2 unavailable: {exc}") from exc

    try:
        conn = psycopg2.connect(settings.DATABASE_URL)
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT user_id, email, is_active FROM users WHERE user_id = %s AND is_active = true",
                (user_id,),
            )
            user = cur.fetchone()
            if not user:
                raise MCPAuthError("User not found or inactive")

            cur.execute(
                """
                SELECT r.role_name
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.role_id
                WHERE ur.user_id = %s
                """,
                (user_id,),
            )
            roles = [row["role_name"] for row in cur.fetchall()]

            cur.execute(
                """
                SELECT DISTINCT p.permission_name
                FROM user_roles ur
                JOIN role_permissions rp ON ur.role_id = rp.role_id
                JOIN permissions p ON rp.permission_id = p.permission_id
                WHERE ur.user_id = %s
                """,
                (user_id,),
            )
            permissions = [row["permission_name"] for row in cur.fetchall()]

            if "admin" in roles:
                allowed_kb_ids = None
            else:
                cur.execute(
                    """
                    SELECT kb_id::text AS kb_id
                    FROM knowledge_bases
                    WHERE owner_id = %s

                    UNION

                    SELECT uka.kb_id::text AS kb_id
                    FROM user_kb_access uka
                    WHERE uka.user_id = %s
                    """,
                    (user_id, user_id),
                )
                allowed_kb_ids = [row["kb_id"] for row in cur.fetchall()]

        conn.close()
    except MCPAuthError:
        raise
    except Exception as exc:
        raise MCPAuthError(f"Failed to load user context: {exc}") from exc

    return {
        "user_id": str(user["user_id"]),
        "email": user["email"],
        "roles": roles,
        "permissions": permissions,
        "allowed_kb_ids": allowed_kb_ids,
    }


def _get_auth_context(headers: Optional[Dict] = None) -> Dict:
    normalized_headers = _normalize_headers(headers)

    if _allow_stdio_without_auth(normalized_headers):
        return {
            "user_id": None,
            "email": None,
            "roles": ["admin"],
            "permissions": ["kb.read", "query.execute"],
            "allowed_kb_ids": None,
        }

    if not settings.MCP_REQUIRE_HTTP_AUTH:
        return {
            "user_id": None,
            "email": None,
            "roles": ["admin"],
            "permissions": ["kb.read", "query.execute"],
            "allowed_kb_ids": None,
        }

    token = _extract_bearer_token(normalized_headers)

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError as exc:
        token_details = _safe_unverified_token_details(token)
        logger.warning(
            "MCP auth rejected: invalid bearer token: %s (fingerprint=%s, length=%s, details=%s)",
            exc,
            _token_fingerprint(token),
            len(token),
            token_details,
        )
        raise MCPAuthError("Invalid or expired bearer token") from exc

    if payload.get("type") != "access":
        logger.warning(
            "MCP auth rejected: invalid token type=%r sub=%r",
            payload.get("type"),
            payload.get("sub"),
        )
        raise MCPAuthError("Invalid token type")

    user_id = payload.get("sub")
    if not user_id:
        logger.warning("MCP auth rejected: token payload missing sub claim")
        raise MCPAuthError("Invalid token payload")

    return _load_user_context(str(user_id))


def _require_permission(auth_context: Dict, permission: str) -> None:
    if "admin" in auth_context.get("roles", []):
        return
    if permission not in auth_context.get("permissions", []):
        raise MCPAuthError(f"Permission denied: {permission} required")


def _require_admin(auth_context: Dict) -> None:
    if "admin" not in auth_context.get("roles", []):
        raise MCPAuthError("Permission denied: admin access required")


def _fetch_kb_inventory(effective_kb_ids: Optional[List[str]]) -> List[Dict]:
    if not settings.DATABASE_URL:
        raise MCPAuthError("DATABASE_URL is not configured for MCP server")

    try:
        import psycopg2
        import psycopg2.extras
    except Exception as exc:
        raise MCPAuthError(f"psycopg2 unavailable: {exc}") from exc

    if effective_kb_ids == []:
        return []

    try:
        conn = psycopg2.connect(settings.DATABASE_URL)
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if effective_kb_ids is None:
                cur.execute(
                    """
                    SELECT
                        kb.kb_id,
                        kb.name AS kb_name,
                        kb.owner_id,
                        COUNT(DISTINCT d.document_id) AS document_count,
                        COUNT(cm.chunk_id) AS chunk_count
                    FROM knowledge_bases kb
                    LEFT JOIN documents d ON d.kb_id = kb.kb_id
                    LEFT JOIN chunk_metadata cm ON cm.document_id = d.document_id
                    GROUP BY kb.kb_id, kb.name, kb.owner_id
                    ORDER BY kb.name ASC
                    """
                )
            else:
                cur.execute(
                    """
                    SELECT
                        kb.kb_id,
                        kb.name AS kb_name,
                        kb.owner_id,
                        COUNT(DISTINCT d.document_id) AS document_count,
                        COUNT(cm.chunk_id) AS chunk_count
                    FROM knowledge_bases kb
                    LEFT JOIN documents d ON d.kb_id = kb.kb_id
                    LEFT JOIN chunk_metadata cm ON cm.document_id = d.document_id
                    WHERE kb.kb_id = ANY(%s::uuid[])
                    GROUP BY kb.kb_id, kb.name, kb.owner_id
                    ORDER BY kb.name ASC
                    """,
                    (effective_kb_ids,),
                )
            rows = cur.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except MCPAuthError:
        raise
    except Exception as exc:
        raise MCPAuthError(f"Failed to load KB inventory: {exc}") from exc


def _resolve_effective_kb_ids(auth_context: Dict, requested_kb_id: Optional[str]) -> Optional[List[str]]:
    allowed_kb_ids = auth_context.get("allowed_kb_ids")
    if allowed_kb_ids is None:
        return [requested_kb_id] if requested_kb_id else None

    if requested_kb_id:
        if requested_kb_id not in allowed_kb_ids:
            raise MCPAuthError("Access denied for requested knowledge base")
        return [requested_kb_id]

    return allowed_kb_ids


def _ensure_daily_retrieval_table(conn) -> None:
    """Create per-document daily retrieval table if missing."""
    global _daily_table_checked
    if _daily_table_checked:
        return

    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS document_retrieval_daily (
                document_id UUID REFERENCES documents(document_id) ON DELETE CASCADE,
                retrieval_date DATE NOT NULL,
                retrieval_count INTEGER NOT NULL DEFAULT 0,
                last_retrieved_at TIMESTAMP,
                PRIMARY KEY (document_id, retrieval_date)
            )
            """
        )
        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_doc_retrieval_daily_date
            ON document_retrieval_daily(retrieval_date)
            """
        )
    conn.commit()
    _daily_table_checked = True


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
        _ensure_daily_retrieval_table(conn)
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

            # Track per-document daily retrieval counts.
            cur.execute(
                """
                WITH touched_docs AS (
                    SELECT
                        document_id,
                        COUNT(*)::INT AS delta_count
                    FROM chunk_metadata
                    WHERE vector_id = ANY(%s)
                    GROUP BY document_id
                )
                INSERT INTO document_retrieval_daily (
                    document_id,
                    retrieval_date,
                    retrieval_count,
                    last_retrieved_at
                )
                SELECT
                    t.document_id,
                    CURRENT_DATE,
                    t.delta_count,
                    NOW()
                FROM touched_docs t
                ON CONFLICT (document_id, retrieval_date)
                DO UPDATE SET
                    retrieval_count = document_retrieval_daily.retrieval_count + EXCLUDED.retrieval_count,
                    last_retrieved_at = EXCLUDED.last_retrieved_at
                """,
                (vector_ids,),
            )

            # Keep document-level retrieval stats in sync with chunk-level stats.
            cur.execute(
                """
                WITH touched_docs AS (
                    SELECT DISTINCT document_id
                    FROM chunk_metadata
                    WHERE vector_id = ANY(%s)
                ),
                doc_stats AS (
                    SELECT
                        c.document_id,
                        COALESCE(SUM(c.retrieval_count), 0)::INT AS total_retrievals,
                        MAX(c.last_retrieved_at) AS last_retrieved_at
                    FROM chunk_metadata c
                    JOIN touched_docs t ON t.document_id = c.document_id
                    GROUP BY c.document_id
                )
                UPDATE documents d
                SET retrieval_count = ds.total_retrievals,
                    last_retrieved_at = ds.last_retrieved_at,
                    updated_at = NOW()
                FROM doc_stats ds
                WHERE d.document_id = ds.document_id
                """,
                (vector_ids,),
            )
        conn.commit()
        conn.close()
        logger.debug("Updated retrieval counts for %d chunk(s)", len(vector_ids))
    except Exception as exc:
        logger.warning("Failed to update retrieval counts: %s", exc)


def _run_search(
    query: str,
    top_k: int,
    kb_id: Optional[str],
    score_threshold: float,
    auth_context: Dict,
) -> List[Dict]:
    """Shared search pipeline for MCP tools."""
    logger.info(
        "Received search query: %s (top_k=%d, kb_id=%s, threshold=%.3f)",
        query,
        top_k,
        kb_id or "all",
        score_threshold,
    )

    # Validate inputs
    if not query or not query.strip():
        return _error_list("Query cannot be empty")

    if top_k < 1 or top_k > 20:
        top_k = min(max(top_k, 1), 20)

    if score_threshold < 0.0 or score_threshold > 1.0:
        return _error_list("score_threshold must be between 0.0 and 1.0")

    try:
        _require_permission(auth_context, "query.execute")
        effective_kb_ids = _resolve_effective_kb_ids(auth_context, kb_id)
    except MCPAuthError as exc:
        return _error_list(str(exc))

    if effective_kb_ids == []:
        return []

    try:
        # Step 1: Generate embedding for query
        logger.info("Generating embedding for query...")
        query_embedding = generate_embedding(query)

        # Step 2: Hybrid retrieval (vector + keyword), fused with RRF
        logger.info("Searching hybrid index (vector + keyword)...")
        results = search_hybrid(
            query_text=query,
            query_vector=query_embedding,
            top_k=top_k,
            kb_ids=effective_kb_ids,
            score_threshold=score_threshold,
        )

        # Step 3: Track retrievals in PostgreSQL
        vector_ids = [str(r["vector_id"]) for r in results if r.get("vector_id")]
        _track_retrievals(vector_ids)

        # Step 4: Format for LLM consumption
        formatted_results = []
        for result in results:
            relevance = result.get("score")
            if relevance is None:
                relevance = result.get("hybrid_rrf_score")
            if relevance is None:
                relevance = 0.0
            formatted_results.append({
                "text": result["chunk_text"],
                "source": f"Document {result['document_id'][:8]}",
                "section": result.get("section_title") or "N/A",
                "page": result.get("page_number") or "N/A",
                "relevance_score": round(float(relevance), 3),
                "retrieval_source": result.get("retrieval_source", "vector"),
            })

        logger.info("Returning %d results", len(formatted_results))
        return formatted_results

    except Exception as e:
        logger.exception("Search failed: %s", e)
        return _error_list(f"Search failed: {str(e)}")


@mcp.tool()
def search_knowledge_base(
    query: str = "",
    top_k: int = 5,
    kb_id: Optional[str] = None,
    score_threshold: Optional[float] = None,
    headers: Dict[str, str] = CurrentHeaders(),
) -> List[Dict]:
    """
    Search the knowledge base for relevant information.

    Args:
        query: The search query text. Empty values are rejected at runtime.
        top_k: Number of results to return (default 5, max 20)
        kb_id: Optional knowledge base ID to search within
        score_threshold: Optional similarity threshold (0.0 to 1.0).
            Default is 0.5. If no results are returned, lower this value.

    Returns:
        List of relevant document chunks with metadata
    """
    if score_threshold is None:
        score_threshold = settings.DEFAULT_SCORE_THRESHOLD

    try:
        auth_context = _get_auth_context(headers)
    except MCPAuthError as exc:
        return _error_list(str(exc))

    return _run_search(
        query=query,
        top_k=top_k,
        kb_id=kb_id,
        score_threshold=score_threshold,
        auth_context=auth_context,
    )


@mcp.tool()
def get_available_collections(headers: Dict[str, str] = CurrentHeaders()) -> Dict:
    """
    List the caller's accessible knowledge bases and aggregate counts.
    
    Returns:
        Dictionary with accessible KB summaries.
    """
    try:
        auth_context = _get_auth_context(headers)
        _require_permission(auth_context, "query.execute")
        effective_kb_ids = _resolve_effective_kb_ids(auth_context, None)
    except MCPAuthError as exc:
        return {"error": str(exc)}

    try:
        inventory_rows = _fetch_kb_inventory(effective_kb_ids)
        accessible_kbs = [
            {
                "kb_id": str(row["kb_id"]),
                "kb_name": row["kb_name"],
                "owner_id": str(row["owner_id"]) if row["owner_id"] else None,
                "document_count": int(row.get("document_count") or 0),
                "chunk_count": int(row.get("chunk_count") or 0),
            }
            for row in inventory_rows
        ]

        return {
            "accessible_kb_count": len(accessible_kbs),
            "accessible_kbs": accessible_kbs,
            "total_documents": sum(item["document_count"] for item in accessible_kbs),
            "total_chunks": sum(item["chunk_count"] for item in accessible_kbs),
        }
    except MCPAuthError as exc:
        return {"error": str(exc)}
    except Exception as e:
        return {"error": str(e)}


@mcp.tool()
def list_kb_resources(headers: Dict[str, str] = CurrentHeaders()) -> List[Dict]:
    """
    List accessible knowledge bases and their documents from PostgreSQL.

    Returns:
        List of KB objects with nested document metadata.
    """
    try:
        auth_context = _get_auth_context(headers)
        _require_permission(auth_context, "query.execute")
        effective_kb_ids = _resolve_effective_kb_ids(auth_context, None)
    except MCPAuthError as exc:
        return _error_list(str(exc))

    if not settings.DATABASE_URL:
        return _error_list("DATABASE_URL is not configured for MCP server")

    try:
        import psycopg2
        import psycopg2.extras

        conn = psycopg2.connect(settings.DATABASE_URL)
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if effective_kb_ids is None:
                cur.execute(
                    """
                    SELECT
                        kb.kb_id,
                        kb.name AS kb_name,
                        kb.owner_id,
                        d.document_id,
                        d.title,
                        d.source_path,
                        d.processing_status
                    FROM knowledge_bases kb
                    LEFT JOIN documents d ON d.kb_id = kb.kb_id
                    ORDER BY kb.name ASC, d.created_at DESC NULLS LAST
                    """
                )
            else:
                if not effective_kb_ids:
                    return []
                cur.execute(
                    """
                    SELECT
                        kb.kb_id,
                        kb.name AS kb_name,
                        kb.owner_id,
                        d.document_id,
                        d.title,
                        d.source_path,
                        d.processing_status
                    FROM knowledge_bases kb
                    LEFT JOIN documents d ON d.kb_id = kb.kb_id
                    WHERE kb.kb_id = ANY(%s::uuid[])
                    ORDER BY kb.name ASC, d.created_at DESC NULLS LAST
                    """,
                    (effective_kb_ids,),
                )
            rows = cur.fetchall()
        conn.close()

        grouped: Dict[str, Dict] = {}
        for row in rows:
            kb_id = str(row["kb_id"])
            if kb_id not in grouped:
                grouped[kb_id] = {
                    "kb_id": kb_id,
                    "kb_name": row["kb_name"],
                    "owner_id": str(row["owner_id"]) if row["owner_id"] else None,
                    "document_count": 0,
                    "documents": [],
                }

            if row["document_id"]:
                source_path = row["source_path"] or ""
                doc_name = (row["title"] or "").strip() or basename(source_path) or source_path
                grouped[kb_id]["documents"].append(
                    {
                        "document_id": str(row["document_id"]),
                        "document_name": doc_name,
                        "source_path": source_path,
                        "processing_status": row["processing_status"],
                    }
                )
                grouped[kb_id]["document_count"] += 1

        return list(grouped.values())

    except Exception as e:
        logger.exception("Failed to list KB resources: %s", e)
        return _error_list(f"Failed to list KB resources: {str(e)}")


if __name__ == "__main__":
    transport = os.getenv("MCP_TRANSPORT", "http").strip().lower()
    if transport not in {"http", "stdio"}:
        logger.warning("Unsupported MCP_TRANSPORT=%s, falling back to http", transport)
        transport = "http"

    logger.info("Starting MCP server...")
    logger.info("Qdrant URL: %s", os.getenv("QDRANT_URL", "http://qdrant:6333"))
    if transport == "http":
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
    else:
        logger.info("MCP transport: stdio")
        # Keep stdio transport clean for MCP clients (no banner/update chatter on stdout).
        os.environ.setdefault("FASTMCP_SHOW_SERVER_BANNER", "false")
        os.environ.setdefault("FASTMCP_CHECK_FOR_UPDATES", "off")
        os.environ.setdefault("FASTMCP_ENABLE_RICH_LOGGING", "false")
        os.environ.setdefault("FASTMCP_LOG_ENABLED", "false")
        mcp.run(transport="stdio", show_banner=False)
