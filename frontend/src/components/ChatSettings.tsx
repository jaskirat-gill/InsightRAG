import { FC, useMemo, useState } from 'react';
import { AlertCircle, Loader2, MessageSquare, RotateCcw, Save, ShieldCheck } from 'lucide-react';

import {
  ChatRuntimeSettings,
  getDefaultChatSettings,
  loadChatSettings,
  resetChatSettings,
  saveChatSettings,
} from '../services/chatSettings';

const ChatSettings: FC = () => {
  const [form, setForm] = useState<ChatRuntimeSettings>(() => loadChatSettings());
  const [error, setError] = useState<string | null>(null);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [savedAt, setSavedAt] = useState<number>(0);

  const defaults = useMemo(() => getDefaultChatSettings(), []);

  const validateForm = (): { baseUrl: string; token: string; timeoutMs: number } | null => {
    const baseUrl = form.baseUrl.trim();
    const token = form.token.trim();

    if (!baseUrl) {
      setError('Base URL is required.');
      return null;
    }

    if (!token) {
      setError('API token is required.');
      return null;
    }

    try {
      const parsed = new URL(baseUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setError('Base URL must use http or https.');
        return null;
      }
    } catch {
      setError('Base URL must be a valid URL.');
      return null;
    }

    const timeoutMs = Number(form.timeoutMs);
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      setError('Timeout must be a positive number.');
      return null;
    }

    return {
      baseUrl: baseUrl.replace(/\/$/, ''),
      token,
      timeoutMs: Math.floor(timeoutMs),
    };
  };

  const parseModelsPayload = (data: unknown): unknown[] => {
    if (Array.isArray(data)) return data;
    if (typeof data === 'object' && data !== null && Array.isArray((data as { data?: unknown[] }).data)) {
      return (data as { data: unknown[] }).data;
    }
    return [];
  };

  const handleCheckConnection = async () => {
    const validated = validateForm();
    if (!validated) return;

    setCheckingConnection(true);
    setError(null);
    setConnectionMessage(null);

    try {
      const headers = {
        Authorization: `Bearer ${validated.token}`,
        Accept: 'application/json',
      };

      const health = await fetch(`${validated.baseUrl}/health`);
      if (!health.ok) {
        throw new Error(`Health check failed (${health.status}).`);
      }

      const modelsRes = await fetch(`${validated.baseUrl}/api/models`, { headers });
      if (!modelsRes.ok) {
        throw new Error(`/api/models failed (${modelsRes.status}).`);
      }

      const models = parseModelsPayload(await modelsRes.json());
      if (models.length === 0) {
        throw new Error('Connection responded, but no models were returned by OpenWebUI.');
      }

      const chatsRes = await fetch(`${validated.baseUrl}/api/v1/chats/list`, { headers });
      if (!chatsRes.ok) {
        throw new Error(`/api/v1/chats/list failed (${chatsRes.status}).`);
      }

      await chatsRes.json();
      setConnectionMessage('Connection verified: this endpoint is reachable and responds like OpenWebUI.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Connection check failed.';
      setError(`OpenWebUI validation failed. ${message}`);
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleSave = () => {
    const validated = validateForm();
    if (!validated) return;

    saveChatSettings({
      baseUrl: validated.baseUrl,
      token: validated.token,
      timeoutMs: validated.timeoutMs,
    });

    setError(null);
    setConnectionMessage(null);
    setSavedAt(Date.now());
  };

  const handleReset = () => {
    const next = resetChatSettings();
    setForm(next);
    setError(null);
    setConnectionMessage(null);
    setSavedAt(Date.now());
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-white">Chat Interface</h3>
        <p className="text-xs text-secondary mt-0.5">
          Configure OpenWebUI connection details used by the chat page.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {connectionMessage && !error && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          {connectionMessage}
        </div>
      )}

      {savedAt > 0 && !error && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          Settings saved.
        </div>
      )}

      <div className="space-y-4">
        <label className="block">
          <div className="text-xs text-secondary mb-1.5">OpenWebUI Base URL</div>
          <input
            value={form.baseUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
            placeholder="http://localhost:3000"
            className="w-full rounded-xl border border-white/10 bg-background/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
          />
        </label>

        <label className="block">
          <div className="text-xs text-secondary mb-1.5">OpenWebUI API Token</div>
          <input
            type="password"
            value={form.token}
            onChange={(e) => setForm((prev) => ({ ...prev, token: e.target.value }))}
            placeholder="sk-..."
            className="w-full rounded-xl border border-white/10 bg-background/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
          />
        </label>

        <label className="block">
          <div className="text-xs text-secondary mb-1.5">Request Timeout (ms)</div>
          <input
            type="number"
            min={1}
            value={form.timeoutMs}
            onChange={(e) => setForm((prev) => ({ ...prev, timeoutMs: Number(e.target.value) }))}
            className="w-full rounded-xl border border-white/10 bg-background/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
          />
        </label>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-secondary">
        Default values come from `.env`/runtime config. If you reset, chat returns to defaults.
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={handleCheckConnection}
          disabled={checkingConnection}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-xs font-medium disabled:opacity-60"
          type="button"
        >
          {checkingConnection ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
          {checkingConnection ? 'Checking...' : 'Check Connection'}
        </button>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 text-secondary hover:text-white hover:bg-white/10 transition-colors text-xs font-medium"
          type="button"
        >
          <RotateCcw size={14} />
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors text-xs font-semibold shadow-md shadow-primary/20"
          type="button"
        >
          <Save size={14} />
          Save Chat Settings
        </button>
      </div>

      <div className="text-[11px] text-secondary/70 inline-flex items-center gap-1.5">
        <MessageSquare size={12} />
        Active defaults: {defaults.baseUrl}
      </div>
    </div>
  );
};

export default ChatSettings;
