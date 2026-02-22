/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_OPENWEBUI_BASE_URL?: string;
  readonly VITE_OPENWEBUI_MCP_SERVER?: string;
  readonly VITE_OPENWEBUI_TOKEN?: string;
  readonly VITE_OPENWEBUI_TIMEOUT_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
