import { FC, useState, useEffect } from 'react';
import {
  Database, Search, Loader2, Plus, AlertCircle,
  X, File, FileText, ChevronDown, Settings, CheckCircle,
  Trash2, AlertTriangle, RefreshCw, BarChart3,
} from 'lucide-react';
import { kbService, KnowledgeBase, Document } from '../services/kb';
import CreateKBModal from '../components/CreateKBModal';

// ── View Documents Modal ──────────────────────────────────────────────────────

interface ViewModalProps {
  kb: KnowledgeBase;
  onClose: () => void;
}

const ViewDocumentsModal: FC<ViewModalProps> = ({ kb, onClose }) => {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    kbService
      .listDocuments(kb.kb_id)
      .then(setDocs)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [kb.kb_id]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':  return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'processing': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'failed':     return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:           return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getFileIcon = (docType: string | null) => {
    const textTypes = ['txt', 'md', 'csv', 'html', 'json', 'xml'];
    if (docType && textTypes.includes(docType))
      return <FileText size={16} className="text-secondary shrink-0" />;
    return <File size={16} className="text-secondary shrink-0" />;
  };

  const getFileName = (doc: Document) => {
    if (doc.title) return doc.title;
    const parts = doc.source_path.split('/');
    return parts[parts.length - 1];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-[#111] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{kb.name}</h2>
              <p className="text-xs text-secondary">{kb.total_documents} file{kb.total_documents !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-secondary hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {!loading && !error && docs.length === 0 && (
            <div className="text-center py-12">
              <File size={32} className="text-secondary mx-auto mb-3 opacity-40" />
              <p className="text-secondary text-sm">No files in this knowledge base</p>
            </div>
          )}

          {!loading && !error && docs.length > 0 && (
            <ul className="space-y-2">
              {docs.map((doc) => (
                <li
                  key={doc.document_id}
                  className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl border border-white/5 transition-colors"
                >
                  {getFileIcon(doc.document_type)}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{getFileName(doc)}</p>
                    <p className="text-xs text-secondary truncate">{doc.source_path}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {doc.file_size_bytes !== null && (
                      <span className="text-xs text-secondary">
                        {kbService.formatFileSize(doc.file_size_bytes)}
                      </span>
                    )}
                    <span className="text-xs text-secondary">{doc.total_chunks} chunks</span>
                    <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${getStatusStyle(doc.processing_status)}`}>
                      {doc.processing_status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Configure KB Modal ────────────────────────────────────────────────────────

interface ConfigureModalProps {
  kb: KnowledgeBase;
  allKbs: KnowledgeBase[];
  onClose: () => void;
  onSuccess: () => void;
}

const ConfigureKBModal: FC<ConfigureModalProps> = ({ kb, allKbs, onClose, onSuccess }) => {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // document_id → target kb_id (starts as current KB)
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    kbService
      .listDocuments(kb.kb_id)
      .then((fetched) => {
        setDocs(fetched);
        const initial: Record<string, string> = {};
        fetched.forEach((d) => { initial[d.document_id] = kb.kb_id; });
        setAssignments(initial);
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [kb.kb_id]);

  const getFileName = (doc: Document) => {
    if (doc.title) return doc.title;
    const parts = doc.source_path.split('/');
    return parts[parts.length - 1];
  };

  const changedDocs = docs.filter((d) => assignments[d.document_id] !== kb.kb_id);
  const hasChanges = changedDocs.length > 0;

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    setSaveError(null);
    try {
      const items = changedDocs.map((d) => ({
        document_id: d.document_id,
        to_kb_id: assignments[d.document_id],
      }));
      await kbService.reassignDocuments(kb.kb_id, items);
      setSaved(true);
      onSuccess(); // refresh KB list in parent
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (e: any) {
      setSaveError(e.message || 'Failed to reassign documents');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-[#111] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Configure — {kb.name}</h2>
              <p className="text-xs text-secondary">Reassign documents to a different knowledge base</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-secondary hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {!loading && !error && docs.length === 0 && (
            <div className="text-center py-12">
              <File size={32} className="text-secondary mx-auto mb-3 opacity-40" />
              <p className="text-secondary text-sm">No files to reassign</p>
            </div>
          )}

          {!loading && !error && docs.length > 0 && (
            <ul className="space-y-2">
              {docs.map((doc) => {
                const isChanged = assignments[doc.document_id] !== kb.kb_id;
                return (
                  <li
                    key={doc.document_id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                      isChanged
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-white/[0.03] border-white/5'
                    }`}
                  >
                    <File size={16} className="text-secondary shrink-0" />

                    <p className="text-sm text-white font-medium flex-1 min-w-0 truncate">
                      {getFileName(doc)}
                    </p>

                    {/* KB selector */}
                    <div className="relative shrink-0">
                      <select
                        value={assignments[doc.document_id] ?? kb.kb_id}
                        disabled={saving || saved}
                        onChange={(e) =>
                          setAssignments((prev) => ({ ...prev, [doc.document_id]: e.target.value }))
                        }
                        className="appearance-none pl-3 pr-8 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white cursor-pointer focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {allKbs.map((k) => (
                          <option key={k.kb_id} value={k.kb_id} className="bg-[#1a1a1a]">
                            {k.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={12}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary pointer-events-none"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/5">
          <div className="flex items-center gap-2">
            {saved ? (
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <CheckCircle size={14} /> Changes saved!
              </span>
            ) : saveError ? (
              <span className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle size={14} /> {saveError}
              </span>
            ) : (
              <p className="text-xs text-secondary">
                {hasChanges
                  ? `${changedDocs.length} document${changedDocs.length > 1 ? 's' : ''} will be moved`
                  : 'No changes made'}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              disabled={!hasChanges || saving || saved}
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Delete Confirmation Modal ─────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  kb: KnowledgeBase | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const DeleteConfirmModal: FC<DeleteConfirmModalProps> = ({ kb, onClose, onConfirm }) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!kb) return null;

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err: any) {
      setError(err.message || 'Failed to delete knowledge base');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!deleting ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        {/* Warning Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="h-14 w-14 rounded-full bg-red-500/15 flex items-center justify-center">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white text-center mb-2">
          Delete Knowledge Base?
        </h2>
        <p className="text-secondary text-sm text-center mb-5">
          You are about to delete{' '}
          <span className="text-white font-semibold">"{kb.name}"</span>
        </p>

        {/* Warning box */}
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-4 mb-5 space-y-2">
          <div className="flex items-start gap-2 text-sm text-red-300">
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
            <span>
              All <strong>{kb.total_documents.toLocaleString()} document{kb.total_documents !== 1 ? 's' : ''}</strong> will be permanently removed from both the SQL database and Qdrant vector store.
            </span>
          </div>
          <div className="flex items-start gap-2 text-sm text-yellow-300/80">
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
            <span>
              The next sync may re-add files from the source if the KB's sync configuration still exists.
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {deleting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Delete Permanently
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── KB Card ───────────────────────────────────────────────────────────────────

interface KBCardProps {
  kb: KnowledgeBase;
  allKbs: KnowledgeBase[];
  onView: () => void;
  onConfigure: () => void;
  onDeleteClick: () => void;
  onHealthClick: () => void;
}

const KBCard: FC<KBCardProps> = ({ kb, onView, onConfigure, onDeleteClick, onHealthClick }) => {
  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Warning';
    return 'Critical';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active:  'bg-green-500/20 text-green-400 border-green-500/30',
      syncing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      error:   'bg-red-500/20 text-red-400 border-red-500/30',
      paused:  'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return styles[status] ?? styles.active;
  };

  return (
    <div
      onClick={onHealthClick}
      className="bg-surface/50 backdrop-blur border border-white/5 p-6 rounded-2xl hover:border-primary/30 transition-all group cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white mb-1 group-hover:text-primary transition-colors">
            {kb.name}
          </h3>
          {kb.description && (
            <p className="text-sm text-secondary line-clamp-2">{kb.description}</p>
          )}
        </div>
        <BarChart3 size={16} className="text-secondary group-hover:text-primary transition-colors mt-1 ml-2 shrink-0" />
      </div>

      {/* Health Badge */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`flex items-center gap-1.5 ${getHealthColor(kb.health_score)}`}>
          <div className="h-2 w-2 rounded-full bg-current animate-pulse" />
          <span className="text-xs font-medium">
            Health: {getHealthLabel(kb.health_score)}
          </span>
        </div>
        <div className={`px-2 py-0.5 rounded-full border text-xs font-medium ${getStatusBadge(kb.status)}`}>
          {kb.status}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-secondary uppercase tracking-wider mb-1">Documents</div>
          <div className="text-2xl font-bold text-white">
            {kb.total_documents.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-secondary uppercase tracking-wider mb-1">Size</div>
          <div className="text-2xl font-bold text-white">
            {kbService.formatFileSize(kb.total_size_bytes)}
          </div>
        </div>
      </div>

      {/* Last Synced */}
      <div className="text-xs text-secondary mb-4">
        Last synced: {kbService.formatRelativeTime(kb.last_synced_at)}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-white/5">
        <button
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg transition-colors"
        >
          View
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onConfigure(); }}
          className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Configure
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteClick(); }}
          className="flex-1 px-3 py-2 bg-white/5 hover:bg-red-500/10 text-white hover:text-red-400 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          <Trash2 size={13} />
          Delete
        </button>
      </div>
    </div>
  );
};

// ── Knowledge Bases Page ──────────────────────────────────────────────────────

interface KnowledgeBasesProps {
  onSelectKB?: (kb: KnowledgeBase) => void;
}

const KnowledgeBases: FC<KnowledgeBasesProps> = ({ onSelectKB }) => {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [viewingKB, setViewingKB] = useState<KnowledgeBase | null>(null);
  const [configuringKB, setConfiguringKB] = useState<KnowledgeBase | null>(null);
  const [kbToDelete, setKbToDelete] = useState<KnowledgeBase | null>(null);

  useEffect(() => {
    loadKBs();
  }, []);

  const loadKBs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await kbService.listKnowledgeBases();
      setKbs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load knowledge bases');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!kbToDelete) return;
    await kbService.deleteKnowledgeBase(kbToDelete.kb_id);
    setKbToDelete(null);
    await loadKBs();
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await kbService.triggerSync();
      setSyncMessage(result.message);
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err: any) {
      setSyncMessage(`Sync failed: ${err.message}`);
      setTimeout(() => setSyncMessage(null), 4000);
    } finally {
      setSyncing(false);
    }
  };

  const filteredKBs = kbs.filter(
    (kb) =>
      kb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kb.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
          <AlertCircle size={18} />
          {error}
        </div>
        <div>
          <button onClick={loadKBs} className="text-sm text-secondary hover:text-white transition-colors">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Knowledge Bases</h1>
          <p className="text-secondary text-lg">
            Manage your document collections and sync settings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Sync status message */}
          {syncMessage && (
            <span className="text-xs text-secondary bg-white/5 px-3 py-1.5 rounded-lg">
              {syncMessage}
            </span>
          )}
          {/* Manual Sync button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all disabled:opacity-50"
            title="Trigger sync for all active plugins"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
          >
            <Plus size={18} />
            Create New
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search knowledge bases..."
          className="w-full pl-12 pr-4 py-3 bg-surface/50 border border-white/5 rounded-xl focus:outline-none focus:border-primary/50 text-white transition-all"
        />
      </div>

      {/* KB Cards Grid */}
      {filteredKBs.length === 0 ? (
        <div className="text-center py-16">
          <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Database size={28} className="text-secondary" />
          </div>
          <p className="text-secondary text-sm">
            {searchQuery ? 'No knowledge bases found' : 'No knowledge bases yet'}
          </p>
          {!searchQuery && (
            <p className="text-secondary/60 text-xs mt-1">Click "Create New" to get started</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredKBs.map((kb) => (
            <KBCard
              key={kb.kb_id}
              kb={kb}
              allKbs={kbs}
              onView={() => setViewingKB(kb)}
              onConfigure={() => setConfiguringKB(kb)}
              onDeleteClick={() => setKbToDelete(kb)}
              onHealthClick={() => onSelectKB?.(kb)}
            />
          ))}
        </div>
      )}

      {/* Create KB Modal */}
      <CreateKBModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadKBs}
      />

      {/* View Documents Modal */}
      {viewingKB && (
        <ViewDocumentsModal
          kb={viewingKB}
          onClose={() => setViewingKB(null)}
        />
      )}

      {/* Configure KB Modal */}
      {configuringKB && (
        <ConfigureKBModal
          kb={configuringKB}
          allKbs={kbs}
          onClose={() => setConfiguringKB(null)}
          onSuccess={loadKBs}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        kb={kbToDelete}
        onClose={() => setKbToDelete(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default KnowledgeBases;
