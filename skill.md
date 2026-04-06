# InsightRAG MCP Skill Reference

This document is a practical reference for both:

- LLMs deciding how to use the InsightRAG MCP tools effectively
- Human developers integrating with the InsightRAG service over MCP or raw HTTP

## Overview

InsightRAG exposes a knowledge base search server via the **Model Context Protocol (MCP)**. The server runs on port `8002` using HTTP transport (FastMCP framework). It provides hybrid vector + keyword search over document collections stored in Qdrant.

For LLM tool use, prefer the tool-calling guidance in this document. For direct service integrations, the authentication and transport details below also apply.

## Authentication

Direct HTTP requests require a bearer token issued by the sync-service auth system:

```
Authorization: Bearer <jwt_access_token>
```

- Tokens are JWTs signed with HS256, issued via the sync-service `/api/v1/auth/login` endpoint.
- The token's `sub` claim identifies the user; KB access is scoped per-user.
- Admin users can access all knowledge bases. Regular users see only owned or shared KBs.
- STDIO transport (local dev only) skips authentication.

If you are using these capabilities through an MCP host that already manages authentication, you may not need to handle bearer tokens directly.

## Query Strategy

**Default query strategy: start with short keyword queries first.** If results are returned, refine with a longer or more specific query. Avoid beginning with a long natural language question unless you have a specific reason to preserve the original phrasing.

The goal is to improve retrieval recall and make it easier to iterate when results are sparse or overly broad. In practice, convert a user's natural-language request into a compact first-pass query, then refine from there.

Good progression:
1. `"deployment config"` — short keywords first
2. `"kubernetes deployment configuration for staging"` — refine only if step 1 returns results
3. Lower `score_threshold` if no results come back (e.g., from 0.5 to 0.3)

Bad approach:
- `"Can you find me all the documents that talk about how to configure deployments in our Kubernetes staging environment?"` — too long for an initial query

## Tools

### `search_knowledge_base`

Search the knowledge base for relevant document chunks using hybrid retrieval (vector + keyword with RRF fusion).

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | *required* | Search query text. Must be non-empty. **Use short keywords first.** |
| `top_k` | int | `5` | Number of results to return (1–20) |
| `kb_id` | string \| null | `null` | UUID of a specific knowledge base to search within. Omit to search all accessible KBs. |
| `score_threshold` | float \| null | `0.5` | Similarity threshold (0.0–1.0). Lower this if no results are returned. |

**Returns:** `List[Dict]` — each result contains:

| Key | Type | Description |
|-----|------|-------------|
| `text` | string | The matched chunk text |
| `source` | string | Short document identifier (first 8 chars of document UUID). Useful as a compact reference in search results, but not a user-friendly document name. |
| `section` | string | Section title from the document, or `"N/A"` |
| `page` | string | Page number as a string when available, otherwise `"N/A"` |
| `relevance_score` | float | Relevance score (higher is better) |
| `retrieval_source` | string | `"vector"`, `"keyword"`, or `"hybrid"` |

**Tips:**
- If no results, lower `score_threshold` to 0.3 or 0.2.
- Use `kb_id` to scope searches when you know which KB to target.
- Retrievals are automatically tracked for analytics.

---

### `get_available_collections`

List the caller's accessible knowledge bases with aggregate counts. This is the **default first step** because it helps discover KB IDs and confirm what the caller can access before searching.

Direct `search_knowledge_base` calls still work when broad search is acceptable or when KB selection is unnecessary.

| Parameter | Type | Description |
|-----------|------|-------------|
| *(none — auth only)* | | |

**Returns:** `Dict` with:

| Key | Type | Description |
|-----|------|-------------|
| `accessible_kb_count` | int | Number of KBs the user can access |
| `accessible_kbs` | list | Array of KB summaries |
| `accessible_kbs[].kb_id` | string | KB UUID — use this as `kb_id` in `search_knowledge_base` |
| `accessible_kbs[].kb_name` | string | Human-readable KB name |
| `accessible_kbs[].document_count` | int | Number of documents in this KB |
| `accessible_kbs[].chunk_count` | int | Number of indexed chunks |
| `total_documents` | int | Sum of all document counts |
| `total_chunks` | int | Sum of all chunk counts |

---

### `list_kb_resources`

List accessible knowledge bases with full document inventory (heavier than `get_available_collections`).

| Parameter | Type | Description |
|-----------|------|-------------|
| *(none — auth only)* | | |

**Returns:** `List[Dict]` — each KB contains:

| Key | Type | Description |
|-----|------|-------------|
| `kb_id` | string | KB UUID |
| `kb_name` | string | KB name |
| `document_count` | int | Number of documents |
| `documents` | list | Nested document metadata |
| `documents[].document_id` | string | Document UUID |
| `documents[].document_name` | string | Document title or filename |
| `documents[].source_path` | string | Original file path |
| `documents[].processing_status` | string | e.g., `"completed"`, `"processing"`, `"failed"` |

**Tips:**
- Use `get_available_collections` for a quick overview; use this tool when you need document-level detail.

---

## Common Workflows

### 1. Discover then search
```
1. get_available_collections()          → default first step; find KB IDs and names
2. search_knowledge_base("auth config", kb_id="<uuid>")  → search a specific KB
```

### 2. Broad keyword search
```
1. search_knowledge_base("error handling")   → direct broad search across accessible KBs
2. search_knowledge_base("error handling retry policy", kb_id="<uuid>")  → refine if results found
```

### 3. Adjust threshold when results are sparse
```
1. search_knowledge_base("migration", score_threshold=0.5)   → default threshold
2. search_knowledge_base("migration", score_threshold=0.3)   → lower if no results
3. search_knowledge_base("migration", score_threshold=0.2)   → lower further if still empty
```

### 4. Audit document inventory
```
1. list_kb_resources()   → see all KBs with their documents and processing statuses
```

## Error Handling

At the tool payload level, errors are returned inline rather than as normal result objects:

- **List-returning tools** (`search_knowledge_base`, `list_kb_resources`): `[{"error": "message"}]`
- **Dict-returning tools** (`get_available_collections`): `{"error": "message"}`

Common errors:
| Error | Cause |
|-------|-------|
| `"Missing bearer token"` | No `Authorization` header or wrong scheme |
| `"Invalid or expired bearer token"` | JWT validation failed |
| `"Permission denied: query.execute required"` | User lacks search permission |
| `"Access denied for requested knowledge base"` | User cannot access the specified `kb_id` |
| `"Query cannot be empty"` | Empty or whitespace-only query string |

Transport-level failures, MCP host failures, or network issues may still surface outside these inline error payloads.
