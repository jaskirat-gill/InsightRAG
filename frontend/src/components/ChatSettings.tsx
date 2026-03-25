import { FC, useMemo, useState } from 'react';
import { Loader2, MessageSquare, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
        <h3 className="text-lg font-semibold">Chat Interface</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure OpenWebUI connection details used by the chat page.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {connectionMessage && !error && (
        <Alert>
          <AlertDescription className="text-status-success">
            {connectionMessage}
          </AlertDescription>
        </Alert>
      )}

      {savedAt > 0 && !error && (
        <Alert>
          <AlertDescription className="text-status-success">
            Settings saved.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="chat-base-url">OpenWebUI Base URL</Label>
          <Input
            id="chat-base-url"
            value={form.baseUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
            placeholder="http://localhost:3000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="chat-token">OpenWebUI API Token</Label>
          <Input
            id="chat-token"
            type="password"
            value={form.token}
            onChange={(e) => setForm((prev) => ({ ...prev, token: e.target.value }))}
            placeholder="sk-..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="chat-timeout">Request Timeout (ms)</Label>
          <Input
            id="chat-timeout"
            type="number"
            min={1}
            value={form.timeoutMs}
            onChange={(e) => setForm((prev) => ({ ...prev, timeoutMs: Number(e.target.value) }))}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground">
        Default values come from <code>.env</code>/runtime config. If you reset, chat returns to defaults.
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCheckConnection}
          disabled={checkingConnection}
        >
          {checkingConnection ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />}
          {checkingConnection ? 'Checking...' : 'Check Connection'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Reset to Defaults
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          Save Chat Settings
        </Button>
      </div>

      <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
        <MessageSquare className="h-3 w-3" />
        Active defaults: {defaults.baseUrl}
      </div>
    </div>
  );
};

export default ChatSettings;
