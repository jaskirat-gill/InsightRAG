/**
 * Runtime config: prefers window.__ENV__ (injected by /config.js in production)
 * so the same image can use different API URLs via container env.
 */
declare global {
  interface Window {
    __ENV__?: {
      VITE_API_URL?: string;
      VITE_OPENWEBUI_BASE_URL?: string;
      VITE_OPENWEBUI_TOKEN?: string;
      VITE_OPENWEBUI_TIMEOUT_MS?: string;
      VITE_OPENWEBUI_MCP_SERVER?: string;
    };
  }
}

function fromRuntimeOrBuild(key: keyof NonNullable<Window['__ENV__']>, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const runtime = window.__ENV__?.[key];
  if (runtime !== undefined && runtime !== '') return runtime;
  const build = (import.meta.env as Record<string, unknown>)[key];
  if (typeof build === 'string' && build !== '') return build;
  return fallback;
}

export const API_URL = fromRuntimeOrBuild('VITE_API_URL', 'http://localhost:8000');
export const OPENWEBUI_BASE_URL = fromRuntimeOrBuild('VITE_OPENWEBUI_BASE_URL', 'http://localhost:3000');
export const OPENWEBUI_TOKEN = fromRuntimeOrBuild('VITE_OPENWEBUI_TOKEN', '');
export const OPENWEBUI_TIMEOUT_MS = Number(fromRuntimeOrBuild('VITE_OPENWEBUI_TIMEOUT_MS', '120000'));
export const OPENWEBUI_MCP_SERVER = fromRuntimeOrBuild('VITE_OPENWEBUI_MCP_SERVER', '');
