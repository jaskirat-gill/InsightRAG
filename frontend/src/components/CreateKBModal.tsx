import { FC, useEffect, useMemo, useState } from 'react';
import { Loader2, Database, CheckCircle } from 'lucide-react';
import { kbService, CreateKBRequest, DocumentStrategyOption } from '../services/kb';
import { API_URL } from '../config';
import { authService } from '../services/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

const FALLBACK_STRATEGIES: DocumentStrategyOption[] = [
  { key: 'semantic', label: 'Semantic (Essay/Policy)', description: 'Paragraph-oriented semantic chunking for narrative documents.' },
];

interface CreateKBModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ConfigField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'select';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface PluginData {
  id: number;
  name: string;
  module_name: string;
  class_name: string;
  is_active: boolean;
  config: Record<string, any>;
  config_schema: ConfigField[];
}

const CreateKBModal: FC<CreateKBModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CreateKBRequest>({
    name: '',
    description: '',
    storage_provider: 'plugin',
    storage_config: {},
    processing_strategy: 'semantic',
    chunk_size: 512,
    chunk_overlap: 50,
  });

  const [plugins, setPlugins] = useState<PluginData[]>([]);
  const [selectedPluginId, setSelectedPluginId] = useState<number | null>(null);
  const [syncPathsInput, setSyncPathsInput] = useState('');
  const [pluginsLoading, setPluginsLoading] = useState(false);
  const [strategies, setStrategies] = useState<DocumentStrategyOption[]>(FALLBACK_STRATEGIES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlugin = useMemo(
    () => plugins.find((p) => p.id === selectedPluginId) ?? null,
    [plugins, selectedPluginId],
  );

  useEffect(() => {
    if (!isOpen) return;
    const loadPlugins = async () => {
      setPluginsLoading(true);
      try {
        const response = await fetch(`${API_URL}/plugins`, {
          headers: {
            ...authService.getAuthHeader(),
          },
        });
        if (!response.ok) throw new Error('Failed to load plugins');
        const data: PluginData[] = await response.json();
        const usable = data.filter((p) => Array.isArray(p.config_schema));
        setPlugins(usable);

        const active = usable.find((p) => p.is_active) ?? usable[0] ?? null;
        setSelectedPluginId(active?.id ?? null);
      } catch (e: any) {
        setError(e?.message || 'Failed to load plugins');
      } finally {
        setPluginsLoading(false);
      }
    };
    const loadStrategies = async () => {
      try {
        const data = await kbService.listStrategies();
        if (data.length > 0) setStrategies(data);
      } catch {
        // keep fallback
      }
    };
    void loadPlugins();
    void loadStrategies();
  }, [isOpen]);

  useEffect(() => {
    if (!selectedPlugin) return;

    const normalizedProvider = selectedPlugin.class_name
      .replace(/Plugin$/i, '')
      .toLowerCase();

    const nextConfig: Record<string, any> = {};
    selectedPlugin.config_schema.forEach((field) => {
      const existing = (formData.storage_config as Record<string, any> | undefined)?.[field.name];
      const pluginDefault = selectedPlugin.config?.[field.name];
      nextConfig[field.name] =
        existing !== undefined && existing !== null && existing !== '' ? existing : pluginDefault ?? '';
    });

    setFormData((prev) => ({
      ...prev,
      storage_provider: normalizedProvider || 'plugin',
      storage_config: nextConfig,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPluginId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!selectedPlugin) {
        throw new Error('Please select a plugin source');
      }

      const config: Record<string, any> = {};
      for (const field of selectedPlugin.config_schema) {
        const rawValue = (formData.storage_config as Record<string, any> | undefined)?.[field.name];
        const value = rawValue ?? '';

        if (field.required && String(value).trim() === '') {
          throw new Error(`${field.label} is required`);
        }

        config[field.name] = field.type === 'number' && value !== '' ? Number(value) : value;
      }

      const syncPaths = syncPathsInput
        .split(/[,\n]/)
        .map((p) => p.trim().replace(/^\/+|\/+$/g, ''))
        .filter(Boolean);
      config.plugin_id = selectedPlugin.id;
      config.sync_paths = syncPaths;

      await kbService.createKnowledgeBase({
        ...formData,
        storage_provider: selectedPlugin.class_name.replace(/Plugin$/i, '').toLowerCase(),
        storage_config: config,
      });
      onSuccess();
      onClose();
      setFormData({
        name: '',
        description: '',
        storage_provider: 'plugin',
        storage_config: {},
        processing_strategy: 'semantic',
        chunk_size: 512,
        chunk_overlap: 50,
      });
      setSyncPathsInput('');
    } catch (err: any) {
      setError(err.message || 'Failed to create knowledge base');
    } finally {
      setLoading(false);
    }
  };

  const updateStorageConfig = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      storage_config: {
        ...prev.storage_config,
        [key]: value,
      },
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[70vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
              <Database size={20} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">Create Knowledge Base</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">Set up a new document collection</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Basic Information</h3>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Product Documentation"
                  className="text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Brief description..."
                  className="text-foreground resize-none"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Storage Configuration</h3>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Plugin Source <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedPluginId?.toString() ?? ''}
                  onValueChange={(v) => setSelectedPluginId(v ? Number(v) : null)}
                  required
                  disabled={pluginsLoading || plugins.length === 0}
                >
                  <SelectTrigger className="text-foreground">
                    <SelectValue placeholder={pluginsLoading ? 'Loading plugins...' : plugins.length === 0 ? 'No plugin available' : 'Select plugin'} />
                  </SelectTrigger>
                  <SelectContent>
                    {plugins.map((plugin) => (
                      <SelectItem key={plugin.id} value={plugin.id.toString()}>
                        {plugin.class_name.replace(/Plugin$/i, '')} ({plugin.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPlugin?.config_schema?.map((field) => (
                <div key={field.name} className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </Label>

                  {field.type === 'select' && Array.isArray(field.options) ? (
                    <Select
                      value={(formData.storage_config as Record<string, any> | undefined)?.[field.name] ?? ''}
                      onValueChange={(v) => updateStorageConfig(field.name, v)}
                      required={field.required}
                    >
                      <SelectTrigger className="text-foreground">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={field.type === 'number' ? 'number' : field.type === 'password' ? 'password' : 'text'}
                      value={(formData.storage_config as Record<string, any> | undefined)?.[field.name] ?? ''}
                      onChange={(e) => updateStorageConfig(field.name, e.target.value)}
                      required={field.required}
                      placeholder={field.placeholder}
                      className="text-foreground font-mono"
                    />
                  )}
                </div>
              ))}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Sync Folders (optional)
                </Label>
                <Textarea
                  value={syncPathsInput}
                  onChange={(e) => setSyncPathsInput(e.target.value)}
                  rows={2}
                  placeholder="test1, test2/subfolder"
                  className="text-foreground resize-none"
                />
                <p className="text-xs text-muted-foreground/60">
                  Comma or newline separated folder paths. Files from these paths are routed into this KB.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Processing Settings</h3>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Chunking Strategy</Label>
                <Select
                  value={formData.processing_strategy}
                  onValueChange={(v) => setFormData({ ...formData, processing_strategy: v })}
                >
                  <SelectTrigger className="text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {strategies.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground/60">
                  {strategies.find((s) => s.key === formData.processing_strategy)?.description
                    ?? 'Select a chunking strategy for documents in this KB'}
                </p>
              </div>

              <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Advanced Settings
                </summary>
                <div className="mt-3 space-y-3 pl-3 border-l-2 border-border">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Chunk Size (tokens)
                    </Label>
                    <Input
                      type="number"
                      value={formData.chunk_size}
                      onChange={(e) => setFormData({ ...formData, chunk_size: parseInt(e.target.value) })}
                      min={256}
                      max={2048}
                      step={256}
                      className="text-foreground"
                    />
                    <p className="text-xs text-muted-foreground/60">Recommended: 512 tokens</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Chunk Overlap (tokens)
                    </Label>
                    <Input
                      type="number"
                      value={formData.chunk_overlap}
                      onChange={(e) => setFormData({ ...formData, chunk_overlap: parseInt(e.target.value) })}
                      min={0}
                      max={200}
                      step={10}
                      className="text-foreground"
                    />
                    <p className="text-xs text-muted-foreground/60">Recommended: 50 tokens</p>
                  </div>
                </div>
              </details>
            </div>
          </div>

          <DialogFooter className="px-6 py-3 border-t border-border bg-muted/30">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Create Knowledge Base
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateKBModal;
