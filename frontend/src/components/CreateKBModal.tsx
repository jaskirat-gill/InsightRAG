import { FC, useEffect, useMemo, useState } from 'react';
import { X, Loader2, Database, CheckCircle } from 'lucide-react';
import { kbService, CreateKBRequest, DocumentStrategyOption } from '../services/kb';
import { API_URL } from '../config';
import { authService } from '../services/auth';

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

  if (!isOpen) return null;

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
      // Reset form
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
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
    {/* Backdrop */}
    <div
      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    />

    {/* Modal - Made smaller with max-h-[70vh] instead of max-h-[90vh] */}
    <div className="relative w-full max-w-xl bg-surface/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-h-[70vh] overflow-hidden flex flex-col mb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
            <Database size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Create Knowledge Base</h2>
            <p className="text-xs text-secondary">Set up a new document collection</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-secondary hover:text-white hover:bg-white/5 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Form - Made more compact */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Basic Information</h3>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-secondary">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Product Documentation"
              className="w-full px-3 py-2 bg-background/50 border border-white/5 rounded-xl focus:outline-none focus:border-primary/50 text-white text-sm transition-all"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-secondary">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="Brief description..."
              className="w-full px-3 py-2 bg-background/50 border border-white/5 rounded-xl focus:outline-none focus:border-primary/50 text-white text-sm transition-all resize-none"
            />
          </div>
        </div>

        {/* Storage Config */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Storage Configuration</h3>

          {/* Plugin Source */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-secondary">
              Plugin Source <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedPluginId ?? ''}
              onChange={(e) => setSelectedPluginId(Number(e.target.value))}
              required
              disabled={pluginsLoading || plugins.length === 0}
              className="w-full px-3 py-2 bg-background/50 border border-white/5 rounded-xl focus:outline-none focus:border-primary/50 text-white text-sm transition-all"
            >
              {plugins.length === 0 ? (
                <option value="">
                  {pluginsLoading ? 'Loading plugins...' : 'No plugin available'}
                </option>
              ) : (
                plugins.map((plugin) => (
                  <option key={plugin.id} value={plugin.id}>
                    {plugin.class_name.replace(/Plugin$/i, '')} ({plugin.name})
                  </option>
                ))
              )}
            </select>
          </div>

          {selectedPlugin?.config_schema?.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <label className="text-xs font-medium text-secondary">
                {field.label} {field.required && <span className="text-red-400">*</span>}
              </label>

              {field.type === 'select' && Array.isArray(field.options) ? (
                <select
                  value={(formData.storage_config as Record<string, any> | undefined)?.[field.name] ?? ''}
                  onChange={(e) => updateStorageConfig(field.name, e.target.value)}
                  required={field.required}
                  className="w-full px-3 py-2 bg-background/50 border border-white/5 rounded-xl focus:outline-none focus:border-primary/50 text-white text-sm transition-all"
                >
                  <option value="">Select...</option>
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : field.type === 'password' ? 'password' : 'text'}
                  value={(formData.storage_config as Record<string, any> | undefined)?.[field.name] ?? ''}
                  onChange={(e) => updateStorageConfig(field.name, e.target.value)}
                  required={field.required}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 bg-background/50 border border-white/5 rounded-xl focus:outline-none focus:border-primary/50 text-white font-mono text-sm transition-all"
                />
              )}
            </div>
          ))}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-secondary">
              Sync Folders (optional)
            </label>
            <textarea
              value={syncPathsInput}
              onChange={(e) => setSyncPathsInput(e.target.value)}
              rows={2}
              placeholder="test1, test2/subfolder"
              className="w-full px-3 py-2 bg-background/50 border border-white/5 rounded-xl focus:outline-none focus:border-primary/50 text-white text-sm transition-all resize-none"
            />
            <p className="text-xs text-secondary/60">
              Comma or newline separated folder paths. Files from these paths are routed into this KB.
            </p>
          </div>
        </div>

        {/* Processing Settings */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Processing Settings</h3>

          {/* Processing Strategy */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-secondary">Chunking Strategy</label>
            <select
              value={formData.processing_strategy}
              onChange={(e) => setFormData({ ...formData, processing_strategy: e.target.value })}
              className="w-full px-3 py-2 bg-background/50 border border-white/5 rounded-xl focus:outline-none focus:border-primary/50 text-white text-sm transition-all"
            >
              {strategies.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-secondary/60">
              {strategies.find((s) => s.key === formData.processing_strategy)?.description
                ?? 'Select a chunking strategy for documents in this KB'}
            </p>
          </div>

          {/* Advanced Settings (Collapsible) */}
          <details className="group">
            <summary className="cursor-pointer text-xs font-medium text-secondary hover:text-white transition-colors">
              Advanced Settings
            </summary>
            <div className="mt-3 space-y-3 pl-3 border-l-2 border-white/5">
              {/* Chunk Size */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-secondary">
                  Chunk Size (tokens)
                </label>
                <input
                  type="number"
                  value={formData.chunk_size}
                  onChange={(e) => setFormData({ ...formData, chunk_size: parseInt(e.target.value) })}
                  min={256}
                  max={2048}
                  step={256}
                  className="w-full px-3 py-2 bg-background/50 border border-white/5 rounded-xl focus:outline-none focus:border-primary/50 text-white text-sm transition-all"
                />
                <p className="text-xs text-secondary/60">Recommended: 512 tokens</p>
              </div>

              {/* Chunk Overlap */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-secondary">
                  Chunk Overlap (tokens)
                </label>
                <input
                  type="number"
                  value={formData.chunk_overlap}
                  onChange={(e) => setFormData({ ...formData, chunk_overlap: parseInt(e.target.value) })}
                  min={0}
                  max={200}
                  step={10}
                  className="w-full px-3 py-2 bg-background/50 border border-white/5 rounded-xl focus:outline-none focus:border-primary/50 text-white text-sm transition-all"
                />
                <p className="text-xs text-secondary/60">Recommended: 50 tokens</p>
              </div>
            </div>
          </details>
        </div>
      </form>

      {/* Footer */}
      <div className="create-kb-footer flex items-center justify-end gap-3 px-6 py-3 border-t border-white/5 bg-background/30">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-secondary hover:text-white transition-colors rounded-xl hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
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
        </button>
      </div>
    </div>
  </div>
  );
};

export default CreateKBModal;
