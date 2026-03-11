import {
  OPENWEBUI_BASE_URL,
  OPENWEBUI_TIMEOUT_MS,
  OPENWEBUI_TOKEN,
} from '../config';

export interface ChatRuntimeSettings {
  baseUrl: string;
  token: string;
  timeoutMs: number;
}

const STORAGE_KEY = 'openwebui.chat.runtime.settings';

const sanitizeTimeout = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }

  return OPENWEBUI_TIMEOUT_MS;
};

const sanitizeString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value.trim() : fallback;

export const getDefaultChatSettings = (): ChatRuntimeSettings => ({
  baseUrl: OPENWEBUI_BASE_URL,
  token: OPENWEBUI_TOKEN,
  timeoutMs: sanitizeTimeout(OPENWEBUI_TIMEOUT_MS),
});

const sanitizeSettings = (value: unknown): ChatRuntimeSettings => {
  const defaults = getDefaultChatSettings();

  if (!value || typeof value !== 'object') {
    return defaults;
  }

  const input = value as Partial<ChatRuntimeSettings>;
  return {
    baseUrl: sanitizeString(input.baseUrl, defaults.baseUrl),
    token: sanitizeString(input.token, defaults.token),
    timeoutMs: sanitizeTimeout(input.timeoutMs),
  };
};

export const loadChatSettings = (): ChatRuntimeSettings => {
  if (typeof window === 'undefined') return getDefaultChatSettings();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultChatSettings();
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return getDefaultChatSettings();
  }
};

export const saveChatSettings = (settings: ChatRuntimeSettings): ChatRuntimeSettings => {
  const next = sanitizeSettings(settings);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
};

export const resetChatSettings = (): ChatRuntimeSettings => {
  const defaults = getDefaultChatSettings();
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return defaults;
};
