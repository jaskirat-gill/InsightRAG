import { FC, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Loader2, MessageSquare, Plus, RefreshCw, Send, AlertCircle, Bot, User, FileText } from 'lucide-react';
import {
  getOrderedMessages,
  openWebUIChatService,
  OpenWebUIChatData,
  OpenWebUIChatRecord,
  OpenWebUIChatTitle,
  McpServerOption,
  ModelOption,
} from '../services/openwebuiChat';

const escapeHtml = (raw: string): string =>
  raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderInlineMarkdown = (input: string): string => {
  let text = escapeHtml(input);
  text = text.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-white/10 text-cyan-300">$1</code>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer" class="text-primary underline">$1</a>',
  );
  return text;
};

const renderMarkdownToHtml = (source: string): string => {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      out.push(
        `<pre class="overflow-x-auto rounded-xl border border-white/10 bg-[#0b1220] p-3"><code class="text-sm text-cyan-200" data-lang="${escapeHtml(
          lang,
        )}">${escapeHtml(codeLines.join('\n'))}</code></pre>`,
      );
      i += 1;
      continue;
    }

    if (/^#{1,6}\s+/.test(line)) {
      const level = Math.min(6, line.match(/^#+/)?.[0].length || 1);
      const content = line.replace(/^#{1,6}\s+/, '');
      out.push(`<h${level} class="font-semibold mt-4 mb-2">${renderInlineMarkdown(content)}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i += 1;
      }
      out.push(
        `<ul class="list-disc pl-5 my-2 space-y-1">${items
          .map((item) => `<li>${renderInlineMarkdown(item)}</li>`)
          .join('')}</ul>`,
      );
      continue;
    }

    if (line.trim() === '') {
      out.push('<br/>');
      i += 1;
      continue;
    }

    out.push(`<p class="my-1 leading-7">${renderInlineMarkdown(line)}</p>`);
    i += 1;
  }

  return out.join('');
};

const formatRelativeTime = (epochSeconds: number | undefined): string => {
  if (!epochSeconds) return 'Now';
  const date = new Date(epochSeconds * 1000);
  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
};

const cloneChatData = (chat: OpenWebUIChatData): OpenWebUIChatData =>
  JSON.parse(JSON.stringify(chat)) as OpenWebUIChatData;

const ChatMessage: FC<{ role: 'user' | 'assistant' | 'system'; content: string; timestamp?: number }> = ({
  role,
  content,
  timestamp,
}) => {
  const isAssistant = role === 'assistant';
  return (
    <div className={`flex gap-3 ${isAssistant ? '' : 'justify-end'}`}>
      {isAssistant && (
        <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/20 text-primary flex items-center justify-center mt-1">
          <Bot size={16} />
        </div>
      )}

      <div className={`max-w-[80%] rounded-2xl px-4 py-3 border ${isAssistant ? 'bg-surface/50 border-white/10' : 'bg-primary/20 border-primary/30'}`}>
        <div
          className="text-sm text-white/95 break-words"
          dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(content || '') }}
        />
        <div className="text-[11px] text-secondary mt-2">{formatRelativeTime(timestamp)}</div>
      </div>

      {!isAssistant && (
        <div className="h-8 w-8 shrink-0 rounded-lg bg-white/10 text-white flex items-center justify-center mt-1">
          <User size={16} />
        </div>
      )}
    </div>
  );
};

const Chat: FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [chats, setChats] = useState<OpenWebUIChatTitle[]>([]);
  const [chatMap, setChatMap] = useState<Record<string, OpenWebUIChatRecord>>({});
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [mcpServers, setMcpServers] = useState<McpServerOption[]>([]);
  const [selectedMcpToolId, setSelectedMcpToolId] = useState<string>('none');
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [viewportHeight, setViewportHeight] = useState<number>(window.innerHeight);
  const [taskbarHeight, setTaskbarHeight] = useState<number>(72);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const selectedChat = selectedChatId ? chatMap[selectedChatId] : null;
  const orderedMessages = useMemo(() => getOrderedMessages(selectedChat?.chat || null), [selectedChat]);

  const loadChats = async (modelIdOverride?: string) => {
    setError(null);
    const list = await openWebUIChatService.listChats();
    setChats(list);

    if (list.length === 0) {
      const created = await openWebUIChatService.createChat(modelIdOverride || selectedModelId || null);
      setChats([
        {
          id: created.id,
          title: created.title,
          created_at: created.created_at,
          updated_at: created.updated_at,
        },
      ]);
      setChatMap((prev) => ({ ...prev, [created.id]: created }));
      setSelectedChatId(created.id);
      return;
    }

    const first = list[0];
    setSelectedChatId((current) => current || first.id);
  };

  const ensureChatLoaded = async (chatId: string): Promise<OpenWebUIChatRecord> => {
    const cached = chatMap[chatId];
    if (cached) return cached;

    const loaded = await openWebUIChatService.getChat(chatId);
    setChatMap((prev) => ({ ...prev, [chatId]: loaded }));
    return loaded;
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        openWebUIChatService.reloadConfig();
        if (!openWebUIChatService.isConfigured()) {
          throw new Error(
            'Chat is not configured. Open Settings -> Chat and provide OpenWebUI Base URL and API token.',
          );
        }

        const reachable = await openWebUIChatService.healthCheck();
        if (!reachable) {
          throw new Error(`OpenWebUI is not reachable at ${openWebUIChatService.getBaseUrl()}`);
        }

        const availableModels = await openWebUIChatService.listModels();
        if (availableModels.length === 0) {
          throw new Error('No models available from OpenWebUI /api/models');
        }
        setModels(availableModels);
        setSelectedModelId(availableModels[0].id);

        const discoveredMcp = await openWebUIChatService.listMcpServers();
        setMcpServers(discoveredMcp);

        const preferred = openWebUIChatService.resolvePreferredMcpToolId(discoveredMcp);
        if (preferred) {
          setSelectedMcpToolId(preferred);
        } else {
          setSelectedMcpToolId('none');
        }

        await loadChats(availableModels[0].id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to initialize chat');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  useEffect(() => {
    if (!selectedChatId) return;
    if (chatMap[selectedChatId]) return;

    ensureChatLoaded(selectedChatId).catch((e) => {
      setError(e instanceof Error ? e.message : 'Failed to load chat');
    });
  }, [selectedChatId, chatMap]);


  useEffect(() => {
    const measure = () => {
      const bar = document.getElementById('app-taskbar');
      const measured = bar ? Math.ceil(bar.getBoundingClientRect().height) : 72;
      setTaskbarHeight(measured);
      setViewportHeight(window.innerHeight);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const handleCreateChat = async () => {
    setError(null);
    try {
      const created = await openWebUIChatService.createChat(selectedModelId || null);
      setChatMap((prev) => ({ ...prev, [created.id]: created }));
      setChats((prev) => [
        { id: created.id, title: created.title, created_at: created.created_at, updated_at: created.updated_at },
        ...prev,
      ]);
      setSelectedChatId(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create chat');
    }
  };

  const handleSend = async () => {
    const prompt = draft.trim();
    if (!prompt || isSending) return;

    setError(null);
    setIsSending(true);

    try {
      let chatRecord: OpenWebUIChatRecord;
      if (selectedChatId) {
        chatRecord = await ensureChatLoaded(selectedChatId);
      } else {
        chatRecord = await openWebUIChatService.createChat(selectedModelId || null);
        setChatMap((prev) => ({ ...prev, [chatRecord.id]: chatRecord }));
        setChats((prev) => [
          { id: chatRecord.id, title: chatRecord.title, created_at: chatRecord.created_at, updated_at: chatRecord.updated_at },
          ...prev,
        ]);
        setSelectedChatId(chatRecord.id);
      }

      const chatId = chatRecord.id;
      const workingChat = cloneChatData(chatRecord.chat);
      setDraft('');

      const streamed = await openWebUIChatService.streamCompletion(
        chatId,
        workingChat,
        prompt,
        selectedModelId || null,
        selectedMcpToolId === 'none' ? null : selectedMcpToolId,
        (nextChat) => {
          setChatMap((prev) => ({
            ...prev,
            [chatId]: {
              ...prev[chatId],
              chat: cloneChatData(nextChat),
            },
          }));
        },
      );

      setChatMap((prev) => ({
        ...prev,
        [chatId]: {
          ...prev[chatId],
          chat: cloneChatData(streamed.chat),
        },
      }));

      setChats((prev) =>
        prev.map((entry) =>
          entry.id === chatId
            ? {
                ...entry,
                updated_at: Math.floor(Date.now() / 1000),
              }
            : entry,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: isSending ? 'auto' : 'smooth', block: 'end' });
  }, [orderedMessages.length, isSending]);

  const handleMarkdownFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      setDraft((prev) => (prev ? `${prev}\n\n${content}` : content));
    } finally {
      event.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      style={{ height: `calc(${viewportHeight}px - ${taskbarHeight}px)` }}
      className="min-h-[420px] grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4"
    >
      <aside className="min-h-0 bg-surface/40 border border-white/10 rounded-2xl p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white">Chats</h2>
            <div className="mt-1 flex items-center gap-2">
              <label className="text-xs text-secondary" htmlFor="mcp-server-select">MCP</label>
              <select
                id="mcp-server-select"
                value={selectedMcpToolId}
                onChange={(e) => setSelectedMcpToolId(e.target.value)}
                className="max-w-[170px] rounded-md border border-white/15 bg-background/60 px-2 py-1 text-xs text-white focus:outline-none focus:border-primary/50"
              >
                <option value="none">No MCP server</option>
                {mcpServers.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <label className="text-xs text-secondary" htmlFor="chat-model-select">Model</label>
              <select
                id="chat-model-select"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="max-w-[170px] rounded-md border border-white/15 bg-background/60 px-2 py-1 text-xs text-white focus:outline-none focus:border-primary/50"
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleCreateChat}
            className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
            title="New chat"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChatId(chat.id)}
              className={`w-full text-left p-3 rounded-xl border transition-colors ${
                selectedChatId === chat.id
                  ? 'bg-primary/15 border-primary/40'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="text-sm font-medium text-white truncate">{chat.title || 'Untitled chat'}</div>
              <div className="text-xs text-secondary mt-1">{formatRelativeTime(chat.updated_at)}</div>
            </button>
          ))}
        </div>

        <button
          onClick={() => loadChats()}
          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-secondary hover:text-white hover:bg-white/10 transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </aside>

      <section className="min-h-0 bg-surface/40 border border-white/10 rounded-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
          <MessageSquare size={18} className="text-primary" />
          <div>
            <div className="text-sm font-semibold text-white">{selectedChat?.title || 'Chat'}</div>
            <div className="text-xs text-secondary">OpenWebUI streaming + MCP tool routing</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              <AlertCircle size={16} className="mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {orderedMessages.length === 0 && !error && (
            <div className="h-full min-h-[240px] flex items-center justify-center">
              <div className="text-center text-secondary">
                <MessageSquare size={28} className="mx-auto mb-2 opacity-60" />
                <div>Start a conversation</div>
                <div className="text-xs mt-1">Markdown is supported in messages and .md files</div>
              </div>
            </div>
          )}

          {orderedMessages.map((msg) => (
            <ChatMessage key={msg.id} role={msg.role} content={msg.content || ''} timestamp={msg.timestamp} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-white/10 p-4 space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask something..."
            rows={4}
            className="w-full resize-none rounded-xl border border-white/10 bg-background/50 px-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-xs text-secondary cursor-pointer hover:text-white transition-colors">
              <FileText size={14} />
              <span>Load .md</span>
              <input type="file" accept=".md,text/markdown" className="hidden" onChange={handleMarkdownFile} />
            </label>

            <button
              onClick={handleSend}
              disabled={!draft.trim() || isSending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Chat;
