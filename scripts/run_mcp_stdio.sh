#!/usr/bin/env bash
set -euo pipefail

# MCP stdio must keep stdout protocol-clean. Avoid `docker compose run`
# because it prints container lifecycle messages to stdout.

IMAGE="${MCP_IMAGE:-ghcr.io/jaskirat-gill/openwebui-mcp-server:latest}"
QDRANT_URL="${QDRANT_URL:-http://host.docker.internal:6333}"
DATABASE_URL="${DATABASE_URL:-postgresql://user:password@host.docker.internal:5433/openwebui}"

exec docker run --rm -i \
  --pull=never \
  -e MCP_TRANSPORT=stdio \
  -e FASTMCP_SHOW_SERVER_BANNER=false \
  -e FASTMCP_CHECK_FOR_UPDATES=off \
  -e FASTMCP_ENABLE_RICH_LOGGING=false \
  -e FASTMCP_LOG_ENABLED=false \
  -e QDRANT_URL="${QDRANT_URL}" \
  -e DATABASE_URL="${DATABASE_URL}" \
  "${IMAGE}" \
  python server.py
