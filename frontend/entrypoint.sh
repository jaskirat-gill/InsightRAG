#!/bin/sh
# Inject runtime env into /config.js so the SPA uses container env (e.g. VITE_API_URL) instead of build-time values.
# Escape backslash and double-quote for JSON.
escape_json() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }
VITE_API_URL_ESC=$(escape_json "${VITE_API_URL:-}")
VITE_OPENWEBUI_BASE_URL_ESC=$(escape_json "${VITE_OPENWEBUI_BASE_URL:-}")
VITE_OPENWEBUI_TOKEN_ESC=$(escape_json "${VITE_OPENWEBUI_TOKEN:-}")
VITE_OPENWEBUI_TIMEOUT_MS_ESC=$(escape_json "${VITE_OPENWEBUI_TIMEOUT_MS:-}")
VITE_OPENWEBUI_MCP_SERVER_ESC=$(escape_json "${VITE_OPENWEBUI_MCP_SERVER:-}")

printf '%s\n' "window.__ENV__={\"VITE_API_URL\":\"$VITE_API_URL_ESC\",\"VITE_OPENWEBUI_BASE_URL\":\"$VITE_OPENWEBUI_BASE_URL_ESC\",\"VITE_OPENWEBUI_TOKEN\":\"$VITE_OPENWEBUI_TOKEN_ESC\",\"VITE_OPENWEBUI_TIMEOUT_MS\":\"$VITE_OPENWEBUI_TIMEOUT_MS_ESC\",\"VITE_OPENWEBUI_MCP_SERVER\":\"$VITE_OPENWEBUI_MCP_SERVER_ESC\"};" \
  > /usr/share/nginx/html/config.js

exec nginx -g "daemon off;"
