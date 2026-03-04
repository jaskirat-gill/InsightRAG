import { ChatRuntimeSettings, getDefaultChatSettings, loadChatSettings } from './chatSettings';
import { OPENWEBUI_MCP_SERVER } from '../config';

export interface OpenWebUIChatTitle {
  id: string;
  title: string;
  updated_at: number;
  created_at: number;
}

export interface OpenWebUIMessage {
  id: string;
  parentId: string | null;
  childrenIds: string[];
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  done?: boolean;
  model?: string;
}

export interface OpenWebUIChatData {
  title: string;
  models: string[];
  messages: OpenWebUIMessage[];
  history: {
    currentId: string | null;
    messages: Record<string, OpenWebUIMessage>;
  };
  params: Record<string, unknown>;
  timestamp: number;
}

export interface OpenWebUIChatRecord {
  id: string;
  user_id: string;
  title: string;
  chat: OpenWebUIChatData;
  updated_at: number;
  created_at: number;
  share_id?: string | null;
  archived?: boolean;
  pinned?: boolean;
  meta?: Record<string, unknown>;
  folder_id?: string | null;
}

export interface McpServerOption {
  id: string;
  name: string;
}

export interface ModelOption {
  id: string;
  name: string;
}

interface CompletionEvent {
  choices?: Array<{
    delta?: { content?: string };
    message?: { content?: string };
  }>;
}

export class OpenWebUIChatService {
  private baseUrl = '';
  private token = '';
  private timeoutMs = 120000;
  private preferredMcpServer = '';
  private modelId: string | null = null;

  constructor(settings?: Partial<ChatRuntimeSettings>) {
    const defaults = getDefaultChatSettings();
    this.applySettings({
      ...defaults,
      ...loadChatSettings(),
      ...(settings || {}),
    });
    this.preferredMcpServer = OPENWEBUI_MCP_SERVER;
  }

  private applySettings(settings: ChatRuntimeSettings): void {
    this.baseUrl = settings.baseUrl.replace(/\/$/, '');
    this.token = settings.token;
    this.timeoutMs = settings.timeoutMs;
  }

  private refreshSettings(): void {
    this.applySettings(loadChatSettings());
    this.preferredMcpServer = OPENWEBUI_MCP_SERVER;
  }

  reloadConfig(): void {
    this.refreshSettings();
  }

  isConfigured(): boolean {
    this.refreshSettings();
    return Boolean(this.baseUrl.trim()) && Boolean(this.token.trim());
  }

  getBaseUrl(): string {
    this.refreshSettings();
    return this.baseUrl;
  }

  getPreferredMcpServer(): string {
    this.refreshSettings();
    return this.preferredMcpServer;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    this.refreshSettings();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
      });

      if (!response.ok) {
        let detail = 'Unknown error';
        try {
          const errorJson = await response.json();
          detail = JSON.stringify(errorJson);
        } catch {
          detail = await response.text();
        }
        throw new Error(`${init?.method || 'GET'} ${path} failed (${response.status}): ${detail}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async healthCheck(): Promise<boolean> {
    this.refreshSettings();
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private parseModelsPayload(data: unknown): unknown[] {
    return Array.isArray(data)
      ? data
      : typeof data === 'object' && data !== null && Array.isArray((data as { data?: unknown[] }).data)
      ? (data as { data: unknown[] }).data
      : [];
  }

  async listModels(): Promise<ModelOption[]> {
    const models = this.parseModelsPayload(await this.request<unknown>('/api/models'));
    return models
      .filter((model): model is { id: unknown; name?: unknown } => typeof model === 'object' && model !== null && 'id' in model)
      .map((model) => {
        const id = typeof model.id === 'string' ? model.id : '';
        const name = typeof model.name === 'string' && model.name.trim().length > 0 ? model.name : id;
        return { id, name };
      })
      .filter((model) => model.id.length > 0);
  }

  async resolveModel(preferredModel?: string | null): Promise<string> {
    const preferred = preferredModel?.trim();
    if (preferred) return preferred;
    if (this.modelId) return this.modelId;

    const models = this.parseModelsPayload(await this.request<unknown>('/api/models'));

    const first = models[0];
    if (!first || typeof first !== 'object' || !('id' in first)) {
      throw new Error('No model available from /api/models');
    }

    const modelId = (first as { id?: unknown }).id;
    if (typeof modelId !== 'string' || modelId.length === 0) {
      throw new Error('Invalid model id from /api/models');
    }

    this.modelId = modelId;
    return modelId;
  }

  async listMcpServers(): Promise<McpServerOption[]> {
    const tools = await this.request<Array<{ id?: unknown; name?: unknown }>>('/api/v1/tools/');

    return tools
      .filter((tool) => typeof tool.id === 'string' && tool.id.startsWith('server:mcp:'))
      .map((tool) => {
        const id = tool.id as string;
        const suffix = id.slice('server:mcp:'.length);
        return {
          id,
          name: typeof tool.name === 'string' && tool.name.trim().length > 0 ? tool.name : suffix,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  resolvePreferredMcpToolId(servers: McpServerOption[]): string | null {
    const target = this.preferredMcpServer?.trim().toLowerCase();
    if (!target) return null;

    const byId = servers.find((s) => s.id.toLowerCase() === target);
    if (byId) return byId.id;

    const byFull = servers.find((s) => s.id.toLowerCase() === `server:mcp:${target}`);
    if (byFull) return byFull.id;

    const byName = servers.find((s) => s.name.trim().toLowerCase() === target);
    if (byName) return byName.id;

    const bySuffix = servers.find((s) => s.id.slice('server:mcp:'.length).toLowerCase() === target);
    if (bySuffix) return bySuffix.id;

    return null;
  }

  async listChats(): Promise<OpenWebUIChatTitle[]> {
    return this.request<OpenWebUIChatTitle[]>('/api/v1/chats/list');
  }

  async getChat(chatId: string): Promise<OpenWebUIChatRecord> {
    return this.request<OpenWebUIChatRecord>(`/api/v1/chats/${chatId}`);
  }

  async createChat(modelOverride?: string | null): Promise<OpenWebUIChatRecord> {
    const now = Math.floor(Date.now() / 1000);
    const model = await this.resolveModel(modelOverride);
    const chat: OpenWebUIChatData = {
      title: 'CLI Chat',
      models: [model],
      messages: [],
      history: { currentId: null, messages: {} },
      params: {},
      timestamp: now,
    };

    return this.request<OpenWebUIChatRecord>('/api/v1/chats/new', {
      method: 'POST',
      body: JSON.stringify({ chat, folder_id: null }),
    });
  }

  async persistChat(chatId: string, chat: OpenWebUIChatData): Promise<OpenWebUIChatRecord> {
    return this.request<OpenWebUIChatRecord>(`/api/v1/chats/${chatId}`, {
      method: 'POST',
      body: JSON.stringify({ chat, folder_id: null }),
    });
  }

  appendMessage(
    chat: OpenWebUIChatData,
    role: OpenWebUIMessage['role'],
    content: string,
    model?: string,
  ): OpenWebUIMessage {
    const history = chat.history || { currentId: null, messages: {} };
    const messagesMap = history.messages || {};
    const parentId = history.currentId;

    const msg: OpenWebUIMessage = {
      id: crypto.randomUUID(),
      parentId,
      childrenIds: [],
      role,
      content,
      timestamp: Math.floor(Date.now() / 1000),
      done: true,
      ...(model ? { model } : {}),
    };

    messagesMap[msg.id] = msg;
    history.currentId = msg.id;

    if (parentId && messagesMap[parentId]) {
      const parent = messagesMap[parentId];
      if (!Array.isArray(parent.childrenIds)) parent.childrenIds = [];
      if (!parent.childrenIds.includes(msg.id)) parent.childrenIds.push(msg.id);
    }

    chat.history = history;
    if (!Array.isArray(chat.messages)) chat.messages = [];
    chat.messages.push(msg);

    return msg;
  }

  private parseCompletionChunk(line: string): string {
    if (!line.startsWith('data:')) return '';
    const payload = line.slice('data:'.length).trim();
    if (!payload || payload === '[DONE]') return '';

    try {
      const event = JSON.parse(payload) as CompletionEvent;
      const choice = event.choices?.[0];
      if (!choice) return '';
      if (typeof choice.delta?.content === 'string') return choice.delta.content;
      if (typeof choice.message?.content === 'string') return choice.message.content;
      return '';
    } catch {
      return '';
    }
  }

  async streamCompletion(
    chatId: string,
    chat: OpenWebUIChatData,
    userText: string,
    modelOverride: string | null,
    mcpToolId: string | null,
    onUpdate?: (chat: OpenWebUIChatData) => void,
  ): Promise<{ chat: OpenWebUIChatData; reply: string }> {
    this.refreshSettings();
    const model = await this.resolveModel(modelOverride);

    const userMsg = this.appendMessage(chat, 'user', userText);
    const assistantMsg = this.appendMessage(chat, 'assistant', '', model);
    assistantMsg.done = false;

    await this.persistChat(chatId, chat);
    onUpdate?.(chat);

    const response = await fetch(`${this.baseUrl}/api/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stream: true,
        chat_id: chatId,
        id: assistantMsg.id,
        parent_id: userMsg.id,
        tool_ids: mcpToolId ? [mcpToolId] : undefined,
      }),
    });

    if (!response.ok || !response.body) {
      let detail = 'Unknown streaming error';
      try {
        detail = await response.text();
      } catch {
        // no-op
      }
      throw new Error(`POST /api/chat/completions failed (${response.status}): ${detail}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalReply = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        const token = this.parseCompletionChunk(line.trim());
        if (!token) continue;
        finalReply += token;
        assistantMsg.content = finalReply;
        onUpdate?.(chat);
      }
    }

    assistantMsg.done = true;
    await this.persistChat(chatId, chat);
    onUpdate?.(chat);
    return { chat, reply: finalReply };
  }
}

export const openWebUIChatService = new OpenWebUIChatService();

export const getOrderedMessages = (chat: OpenWebUIChatData | null): OpenWebUIMessage[] => {
  if (!chat || !chat.history || !chat.history.messages) return [];

  const messages = chat.history.messages;
  const ordered: OpenWebUIMessage[] = [];
  const seen = new Set<string>();

  let currentId = chat.history.currentId;
  while (currentId && messages[currentId]) {
    if (seen.has(currentId)) break;
    const msg = messages[currentId];
    ordered.push(msg);
    seen.add(currentId);
    currentId = msg.parentId;
  }

  return ordered.reverse();
};
