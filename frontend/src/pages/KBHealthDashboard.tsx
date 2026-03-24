import { FC, useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, RefreshCw, FileText,
  AlertCircle, Loader2,
} from 'lucide-react';
import { kbService, KnowledgeBase, Document, KBHealthStats } from '../services/kb';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

const StatusBadge: FC<{ status: string }> = ({ status }) => {
  const variant = (() => {
    switch (status) {
      case 'completed':  return 'default' as const;
      case 'processing': return 'secondary' as const;
      case 'failed':     return 'destructive' as const;
      default:           return 'outline' as const;
    }
  })();
  return <Badge variant={variant}>{status}</Badge>;
};

function healthLabel(score: number) {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Warning';
  return 'Critical';
}

interface KBHealthDashboardProps {
  kb: KnowledgeBase;
  onBack: () => void;
  onSelectDocument: (doc: Document) => void;
}

const KBHealthDashboard: FC<KBHealthDashboardProps> = ({ kb, onBack, onSelectDocument }) => {
  const [health, setHealth] = useState<KBHealthStats | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthData, docsData] = await Promise.all([
        kbService.getKBHealth(kb.kb_id),
        kbService.listDocuments(kb.kb_id),
      ]);
      setHealth(healthData);
      setDocs(docsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load health data');
    } finally {
      setLoading(false);
    }
  }, [kb.kb_id]);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    const minSpinMs = 2500;
    const startedAt = Date.now();
    setSyncing(true);
    setSyncMsg(null);
    try {
      const result = await kbService.triggerSync();
      setSyncMsg(result.message);
    } catch (err: any) {
      setSyncMsg(`Failed: ${err.message}`);
    } finally {
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, minSpinMs - elapsed);
      if (wait > 0) {
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 4000);
    }
  };

  const getFileName = (doc: Document) => {
    if (doc.title) return doc.title;
    const parts = doc.source_path.split('/');
    return parts[parts.length - 1];
  };

  const getKbStatusVariant = (status: string) => {
    switch (status) {
      case 'active':  return 'default' as const;
      case 'syncing': return 'secondary' as const;
      case 'error':   return 'destructive' as const;
      default:        return 'outline' as const;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft size={18} />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">{kb.name}</h1>
              <Badge variant={getKbStatusVariant(kb.status)}>{kb.status}</Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              {kb.description || 'Knowledge base overview'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {syncMsg && (
            <Badge variant="outline" className="max-w-xs truncate text-xs">
              {syncMsg}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {syncing ? 'Syncing…' : 'Sync'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            {error}
            <Button variant="link" size="sm" onClick={load} className="ml-auto text-xs">Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && !error && health && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="text-sm text-muted-foreground mb-1">Documents</div>
                <div className="text-2xl font-semibold text-foreground">
                  {health.total_docs.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {health.completed_docs} completed{health.failed_docs > 0 ? ` · ${health.failed_docs} failed` : ''} · {kbService.formatFileSize(kb.total_size_bytes)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="text-sm text-muted-foreground mb-1">Health</div>
                <div className="text-2xl font-semibold text-foreground">
                  {Math.round(health.avg_health_score)}%
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-foreground/60"
                      style={{ width: `${health.avg_health_score}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {healthLabel(health.avg_health_score)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              {docs.length === 0 ? (
                <div className="text-center py-16">
                  <FileText size={28} className="text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-muted-foreground text-sm">No documents in this knowledge base</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4">Document</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Size</TableHead>
                      <TableHead className="text-right px-4">Health</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docs.map((doc) => (
                      <TableRow
                        key={doc.document_id}
                        onClick={() => onSelectDocument(doc)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') onSelectDocument(doc);
                        }}
                        className="cursor-pointer"
                        title="Open document details"
                      >
                        <TableCell className="px-4">
                          <div className="font-medium text-foreground text-sm truncate max-w-[300px]" title={getFileName(doc)}>
                            {getFileName(doc)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={doc.processing_status} />
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {doc.file_size_bytes !== null ? kbService.formatFileSize(doc.file_size_bytes) : '—'}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground px-4">
                          {Math.round(doc.health_score)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default KBHealthDashboard;
