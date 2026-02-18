import { FC, useState } from 'react';
import { X, Loader2, Database, CheckCircle } from 'lucide-react';
import { kbService, CreateKBRequest } from '../services/kb';

interface CreateKBModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateKBModal: FC<CreateKBModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CreateKBRequest>({
    name: '',
    description: '',
    storage_provider: 's3',
    storage_config: {
      bucket_name: '',
      region: 'us-east-1',
    },
    processing_strategy: 'semantic',
    chunk_size: 512,
    chunk_overlap: 50,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await kbService.createKnowledgeBase(formData);
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        name: '',
        description: '',
        storage_provider: 's3',
        storage_config: {
          bucket_name: '',
          region: 'us-east-1',
        },
        processing_strategy: 'semantic',
        chunk_size: 512,
        chunk_overlap: 50,
      });
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

          {/* Storage Provider */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-secondary">Storage Provider</label>
            <select
              value={formData.storage_provider}
              onChange={(e) => setFormData({ ...formData, storage_provider: e.target.value })}
              className="w-full px-3 py-2 bg-background/50 border border-white/5 rounded-xl focus:outline-none focus:border-primary/50 text-white text-sm transition-all"
            >
              <option value="s3">Amazon S3</option>
              <option value="gcs" disabled>Google Cloud Storage (Coming Soon)</option>
              <option value="azure" disabled>Azure Blob Storage (Coming Soon)</option>
            </select>
          </div>

          {/* S3 Bucket Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-secondary">
              S3 Bucket Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.storage_config?.bucket_name || ''}
              onChange={(e) => updateStorageConfig('bucket_name', e.target.value)}
              required
              placeholder="my-documents-bucket"
              className="w-full px-3 py-2 bg-background/50 border border-white/5 rounded-xl focus:outline-none focus:border-primary/50 text-white font-mono text-sm transition-all"
            />
          </div>

          {/* AWS Region */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-secondary">AWS Region</label>
            <select
              value={formData.storage_config?.region || 'us-east-1'}
              onChange={(e) => updateStorageConfig('region', e.target.value)}
              className="w-full px-3 py-2 bg-background/50 border border-white/5 rounded-xl focus:outline-none focus:border-primary/50 text-white text-sm transition-all"
            >
              <option value="us-east-1">US East (N. Virginia)</option>
              <option value="us-west-2">US West (Oregon)</option>
              <option value="eu-west-1">EU (Ireland)</option>
              <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
            </select>
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
              <option value="semantic">Semantic (Recommended)</option>
              <option value="hierarchical">Hierarchical</option>
              <option value="layout-aware">Layout-Aware</option>
              <option value="table-preserving">Table-Preserving</option>
            </select>
            <p className="text-xs text-secondary/60">
              Semantic splitting works well for most document types
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
      <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-white/5 bg-background/30">
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