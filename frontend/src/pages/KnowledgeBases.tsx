import { FC, useState, useEffect } from 'react';
import {
  Database, Search, Loader2, Plus, AlertCircle,
  File, FileText, ChevronDown, Settings, CheckCircle,
  Trash2, AlertTriangle, RefreshCw, RotateCcw,
} from 'lucide-react';
import { kbService, KnowledgeBase, Document } from '../services/kb';
import CreateKBModal from '../components/CreateKBModal';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Effect, Effects } from '@/components/ui/animate';

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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':  return 'default' as const;
      case 'processing': return 'secondary' as const;
      case 'failed':     return 'destructive' as const;
      default:           return 'outline' as const;
    }
  };

  const getFileIcon = (docType: string | null) => {
    const textTypes = ['txt', 'md', 'csv', 'html', 'json', 'xml'];
    if (docType && textTypes.includes(docType))
      return <FileText size={16} className="text-muted-foreground shrink-0" />;
    return <File size={16} className="text-muted-foreground shrink-0" />;
  };

  const getFileName = (doc: Document) => {
    if (doc.title) return doc.title;
    const parts = doc.source_path.split('/');
    return parts[parts.length - 1];
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database size={18} className="text-primary" />
            </div>
            <div>
              <DialogTitle>{kb.name}</DialogTitle>
              <DialogDescription>
                {kb.total_documents} file{kb.total_documents !== 1 ? 's' : ''}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && !error && docs.length === 0 && (
            <div className="text-center py-12">
              <File size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">No files in this knowledge base</p>
            </div>
          )}

          {!loading && !error && docs.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="text-right">Chunks</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((doc) => (
                  <TableRow key={doc.document_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.document_type)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{getFileName(doc)}</p>
                          <p className="text-xs text-muted-foreground truncate">{doc.source_path}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">
                      {doc.file_size_bytes !== null
                        ? kbService.formatFileSize(doc.file_size_bytes)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">
                      {doc.total_chunks}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={getStatusVariant(doc.processing_status)}>
                        {doc.processing_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

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
  const [syncPathsInput, setSyncPathsInput] = useState('');
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    const paths = Array.isArray(kb.storage_config?.sync_paths)
      ? (kb.storage_config?.sync_paths as string[])
      : [];
    setSyncPathsInput(paths.join('\n'));
  }, [kb.kb_id, kb.storage_config]);

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
  const parsedSyncPaths = syncPathsInput
    .split(/[,\n]/)
    .map((p) => p.trim().replace(/^\/+|\/+$/g, ''))
    .filter(Boolean);
  const existingSyncPaths = Array.isArray(kb.storage_config?.sync_paths)
    ? (kb.storage_config?.sync_paths as string[]).map((p) => String(p).trim().replace(/^\/+|\/+$/g, '')).filter(Boolean)
    : [];
  const syncPathsChanged =
    parsedSyncPaths.length !== existingSyncPaths.length ||
    parsedSyncPaths.some((p, idx) => p !== existingSyncPaths[idx]);
  const hasChanges = changedDocs.length > 0 || syncPathsChanged;
  const pluginSourceLabel = (() => {
    const pluginId = kb.storage_config?.plugin_id;
    if (pluginId !== undefined && pluginId !== null) {
      return `${kb.storage_provider.toUpperCase()} (Plugin #${pluginId})`;
    }
    return kb.storage_provider.toUpperCase();
  })();

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (syncPathsChanged) {
        await kbService.updateKnowledgeBase(kb.kb_id, {
          storage_config: {
            ...(kb.storage_config ?? {}),
            sync_paths: parsedSyncPaths,
          },
        });
      }

      if (changedDocs.length > 0) {
        const items = changedDocs.map((d) => ({
          document_id: d.document_id,
          to_kb_id: assignments[d.document_id],
        }));
        await kbService.reassignDocuments(kb.kb_id, items);
      }

      setSaved(true);
      onSuccess();
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
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings size={18} className="text-primary" />
            </div>
            <div>
              <DialogTitle>Configure — {kb.name}</DialogTitle>
              <DialogDescription>Update sync folders and reassign documents</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Plugin Source</label>
                <Input
                  value={pluginSourceLabel}
                  readOnly
                  className="text-xs text-muted-foreground"
                />
                <p className="text-[11px] text-muted-foreground/70">
                  Plugin source is fixed after KB creation.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Sync Folders</label>
                <textarea
                  value={syncPathsInput}
                  onChange={(e) => setSyncPathsInput(e.target.value)}
                  rows={2}
                  disabled={saving || saved}
                  placeholder="test1, test2/subfolder"
                  className="w-full px-3 py-2 bg-transparent border border-input rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <p className="text-[11px] text-muted-foreground/70">
                  Comma or newline separated folder paths synced into this KB.
                </p>
              </div>
            </CardContent>
          </Card>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && !error && docs.length === 0 && (
            <div className="text-center py-12">
              <File size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">No files to reassign</p>
            </div>
          )}

          {!loading && !error && docs.length > 0 && (
            <ul className="space-y-2">
              {docs.map((doc) => {
                const isChanged = assignments[doc.document_id] !== kb.kb_id;
                return (
                  <li
                    key={doc.document_id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                      isChanged
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-muted/30 border-border'
                    }`}
                  >
                    <File size={16} className="text-muted-foreground shrink-0" />

                    <p className="text-sm text-foreground font-medium flex-1 min-w-0 truncate">
                      {getFileName(doc)}
                    </p>

                    <div className="relative shrink-0">
                      <select
                        value={assignments[doc.document_id] ?? kb.kb_id}
                        disabled={saving || saved}
                        onChange={(e) =>
                          setAssignments((prev) => ({ ...prev, [doc.document_id]: e.target.value }))
                        }
                        className="appearance-none pl-3 pr-8 py-1.5 bg-transparent border border-input rounded-md text-xs text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {allKbs.map((k) => (
                          <option key={k.kb_id} value={k.kb_id}>
                            {k.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={12}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            {saved ? (
              <span className="flex items-center gap-1.5 text-xs text-status-success">
                <CheckCircle size={14} /> Changes saved!
              </span>
            ) : saveError ? (
              <span className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle size={14} /> {saveError}
              </span>
            ) : (
              <p className="text-xs text-muted-foreground">
                {hasChanges
                  ? [
                      changedDocs.length > 0
                        ? `${changedDocs.length} document${changedDocs.length > 1 ? 's' : ''} will be moved`
                        : null,
                      syncPathsChanged ? 'sync folders will be updated' : null,
                    ].filter(Boolean).join(' · ')
                  : 'No changes made'}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              disabled={!hasChanges || saving || saved}
              onClick={handleSave}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

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
    <Dialog open onOpenChange={() => !deleting && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="items-center">
          <div className="h-14 w-14 rounded-full bg-destructive/15 flex items-center justify-center mb-2">
            <AlertTriangle size={28} className="text-destructive" />
          </div>
          <DialogTitle className="text-xl text-center">Delete Knowledge Base?</DialogTitle>
          <DialogDescription className="text-center">
            You are about to delete{' '}
            <span className="text-foreground font-semibold">"{kb.name}"</span>
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive" className="space-y-2">
          <AlertDescription>
            <div className="flex items-start gap-2 text-sm">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              <span>
                All <strong>{kb.total_documents.toLocaleString()} document{kb.total_documents !== 1 ? 's' : ''}</strong> will be permanently removed from both the SQL database and Qdrant vector store.
              </span>
            </div>
            <div className="flex items-start gap-2 text-sm mt-2 text-status-warning">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              <span>
                The next sync may re-add files from the source if the KB's sync configuration still exists.
              </span>
            </div>
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex-row gap-3 sm:gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleConfirm}
            disabled={deleting}
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
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface KBCardProps {
  kb: KnowledgeBase;
  allKbs: KnowledgeBase[];
  onView: () => void;
  onConfigure: () => void;
  onDeleteClick: () => void;
  onHealthClick: () => void;
}

const KBCard: FC<KBCardProps> = ({ kb, onConfigure, onDeleteClick, onHealthClick }) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':  return 'default' as const;
      case 'syncing': return 'secondary' as const;
      case 'error':   return 'destructive' as const;
      default:        return 'outline' as const;
    }
  };

  return (
    <Effect
      slide="up"
      whileHover={{ y: -6, scale: 1.015 }}
      whileTap={{ scale: 0.995 }}
    >
    <Card
      onClick={onHealthClick}
      className="group cursor-pointer border-border/70 bg-card/90 transition-all duration-300 hover:border-primary/25 hover:bg-muted/40 hover:shadow-xl hover:shadow-primary/5"
    >
      <CardContent className="pt-5 pb-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground truncate">
              {kb.name}
            </h3>
            {kb.description && (
              <CardDescription className="line-clamp-1 mt-0.5 text-sm">{kb.description}</CardDescription>
            )}
          </div>
          <Badge variant={getStatusVariant(kb.status)} className="shrink-0 mt-0.5">
            {kb.status}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{kb.total_documents.toLocaleString()} documents</span>
          <span className="text-border">·</span>
          <span>{kbService.formatFileSize(kb.total_size_bytes)}</span>
          <span className="text-border">·</span>
          <span>Synced {kbService.formatRelativeTime(kb.last_synced_at)}</span>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onConfigure(); }}
          >
            <Settings size={13} />
            Configure
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDeleteClick(); }}
          >
            <Trash2 size={13} />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
    </Effect>
  );
};

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
  const [resettingSync, setResettingSync] = useState(false);
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
    const minSpinMs = 2500;
    const startedAt = Date.now();
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
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, minSpinMs - elapsed);
      if (wait > 0) {
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
      setSyncing(false);
    }
  };

  const handleResetSync = async () => {
    const confirmed = window.confirm(
      'Reset sync state for all plugins? This clears sync cache so next sync re-processes all files.',
    );
    if (!confirmed) return;

    setResettingSync(true);
    setSyncMessage(null);
    try {
      const result = await kbService.resetSyncState();
      setSyncMessage(`${result.message} (${result.deleted_rows} entries removed)`);
      setTimeout(() => setSyncMessage(null), 5000);
    } catch (err: any) {
      setSyncMessage(`Reset failed: ${err.message}`);
      setTimeout(() => setSyncMessage(null), 5000);
    } finally {
      setResettingSync(false);
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
        <Alert variant="destructive" className="inline-flex mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div>
          <Button variant="ghost" size="sm" onClick={loadKBs}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Effects className="space-y-6">
      <Effect slide="up" blur className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Knowledge Bases</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your document collections and sync settings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {syncMessage && (
            <Badge variant="outline" className="text-xs shadow-sm">
              {syncMessage}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            title="Trigger sync for all active plugins"
          >
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {syncing ? 'Syncing…' : 'Sync'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetSync}
            disabled={resettingSync || syncing}
            title="Clear sync cache so next sync re-ingests files"
          >
            {resettingSync ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            Reset
          </Button>
          <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={16} />
            New
          </Button>
        </div>
      </Effect>

      <Effect slide="up" delay={0.06} className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search knowledge bases..."
          className="pl-10"
        />
      </Effect>

      {filteredKBs.length === 0 ? (
        <Effect slide="up" delay={0.1} className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-muted shadow-inner">
            <Database size={28} className="text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">
            {searchQuery ? 'No knowledge bases found' : 'No knowledge bases yet'}
          </p>
          {!searchQuery && (
            <p className="text-muted-foreground/60 text-xs mt-1">Click "Create New" to get started</p>
          )}
        </Effect>
      ) : (
        <Effects className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
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
        </Effects>
      )}

      <CreateKBModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadKBs}
      />

      {viewingKB && (
        <ViewDocumentsModal
          kb={viewingKB}
          onClose={() => setViewingKB(null)}
        />
      )}

      {configuringKB && (
        <ConfigureKBModal
          kb={configuringKB}
          allKbs={kbs}
          onClose={() => setConfiguringKB(null)}
          onSuccess={loadKBs}
        />
      )}

      <DeleteConfirmModal
        kb={kbToDelete}
        onClose={() => setKbToDelete(null)}
        onConfirm={handleDeleteConfirm}
      />
    </Effects>
  );
};

export default KnowledgeBases;
