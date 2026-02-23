import { FC, useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, RefreshCw, Database, FileText,
  Activity, AlertCircle, Loader2, CheckCircle, Clock,
  TrendingUp, Hash, HardDrive, Zap,
} from 'lucide-react';
import { kbService, KnowledgeBase, Document, KBHealthStats } from '../services/kb';

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

const StatCard: FC<StatCardProps> = ({ icon, label, value, sub, color = 'text-primary' }) => (
  <div className="bg-surface/50 backdrop-blur border border-white/5 rounded-2xl p-5">
    <div className={`h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center mb-3 ${color}`}>
      {icon}
    </div>
    <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
    <div className="text-xs text-secondary uppercase tracking-wider">{label}</div>
    {sub && <div className="text-xs text-secondary/60 mt-1">{sub}</div>}
  </div>
);

// ── Health Bar ────────────────────────────────────────────────────────────────

const HealthBar: FC<{ score: number }> = ({ score }) => {
  const color =
    score >= 90 ? 'bg-green-400' :
    score >= 70 ? 'bg-yellow-400' :
    score >= 50 ? 'bg-orange-400' :
    'bg-red-400';
  const label =
    score >= 90 ? 'Excellent' :
    score >= 70 ? 'Good' :
    score >= 50 ? 'Warning' : 'Critical';
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-medium ${color.replace('bg-', 'text-')}`}>{label}</span>
    </div>
  );
};

// ── Status Badge ──────────────────────────────────────────────────────────────

const StatusBadge: FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    completed:  'bg-green-500/20 text-green-400 border-green-500/30',
    processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    pending:    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    failed:     'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${styles[status] ?? styles.completed}`}>
      {status}
    </span>
  );
};

// ── KB Health Dashboard ───────────────────────────────────────────────────────

interface KBHealthDashboardProps {
  kb: KnowledgeBase;
  onBack: () => void;
  onSelectDocument: (doc: Document) => void; // ✅ NEW
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
    setSyncing(true);
    setSyncMsg(null);
    try {
      const result = await kbService.triggerSync();
      setSyncMsg(result.message);
    } catch (err: any) {
      setSyncMsg(`Failed: ${err.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 4000);
    }
  };

  const getFileName = (doc: Document) => {
    if (doc.title) return doc.title;
    const parts = doc.source_path.split('/');
    return parts[parts.length - 1];
  };

  const kbStatusStyles: Record<string, string> = {
    active:  'bg-green-500/20 text-green-400 border-green-500/30',
    syncing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    error:   'bg-red-500/20 text-red-400 border-red-500/30',
    paused:  'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-secondary hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-white">{kb.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full border text-xs font-medium ${kbStatusStyles[kb.status] ?? kbStatusStyles.active}`}>
                {kb.status}
              </span>
            </div>
            <p className="text-secondary text-sm">
              {kb.description || 'Health & retrieval analytics for this knowledge base'}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          {syncMsg && (
            <span className="text-xs text-secondary bg-white/5 px-3 py-1.5 rounded-lg max-w-xs truncate">
              {syncMsg}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white text-sm rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
          >
            <Zap size={14} className={syncing ? 'animate-pulse' : ''} />
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={16} /> {error}
          <button onClick={load} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      )}

      {!loading && !error && health && (
        <>
          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<FileText size={18} />}
              label="Total Documents"
              value={health.total_docs.toLocaleString()}
              sub={`${health.completed_docs} completed · ${health.failed_docs} failed`}
              color="text-primary"
            />
            <StatCard
              icon={<Hash size={18} />}
              label="Total Chunks"
              value={health.total_chunks.toLocaleString()}
              color="text-blue-400"
            />
            <StatCard
              icon={<Activity size={18} />}
              label="Avg Health Score"
              value={`${Math.round(health.avg_health_score)}%`}
              sub={
                health.avg_health_score >= 90 ? 'Excellent' :
                health.avg_health_score >= 70 ? 'Good' :
                health.avg_health_score >= 50 ? 'Warning' : 'Critical'
              }
              color={
                health.avg_health_score >= 90 ? 'text-green-400' :
                health.avg_health_score >= 70 ? 'text-yellow-400' :
                'text-red-400'
              }
            />
            <StatCard
              icon={<TrendingUp size={18} />}
              label="Total Retrievals"
              value={health.total_retrievals.toLocaleString()}
              sub="via MCP search"
              color="text-purple-400"
            />
          </div>

          {/* ── Document Health Table ── */}
          <div className="bg-surface/50 backdrop-blur border border-white/5 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-primary" />
                <h2 className="text-sm font-semibold text-white">Document Health</h2>
                <span className="text-xs text-secondary">({docs.length})</span>
              </div>
              <div className="text-xs text-secondary">
                Last synced: {kbService.formatRelativeTime(kb.last_synced_at)}
              </div>
            </div>

            {docs.length === 0 ? (
              <div className="text-center py-16">
                <FileText size={32} className="text-secondary mx-auto mb-3 opacity-40" />
                <p className="text-secondary text-sm">No documents in this knowledge base</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-secondary uppercase tracking-wider border-b border-white/5">
                      <th className="text-left px-6 py-3 font-medium">Document</th>
                      <th className="text-left px-4 py-3 font-medium">Health</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-right px-4 py-3 font-medium">Chunks</th>
                      <th className="text-right px-4 py-3 font-medium">Size</th>
                      <th className="text-right px-4 py-3 font-medium">Retrievals</th>
                      <th className="text-right px-6 py-3 font-medium">Last Retrieved</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/5">
                    {docs.map((doc) => (
                      <tr
                        key={doc.document_id}
                        onClick={() => onSelectDocument(doc)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') onSelectDocument(doc);
                        }}
                        className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                        title="Open document details"
                      >
                        <td className="px-6 py-3">
                          <div className="font-medium text-white truncate max-w-[220px]" title={getFileName(doc)}>
                            {getFileName(doc)}
                          </div>
                          <div className="text-xs text-secondary truncate max-w-[220px]" title={doc.source_path}>
                            {doc.source_path}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <HealthBar score={doc.health_score} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={doc.processing_status} />
                        </td>
                        <td className="px-4 py-3 text-right text-secondary">
                          {doc.total_chunks.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-secondary">
                          {doc.file_size_bytes !== null ? kbService.formatFileSize(doc.file_size_bytes) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {doc.retrieval_count > 0 ? (
                            <span className="text-purple-400 font-medium">
                              {doc.retrieval_count.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-secondary">0</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right text-secondary text-xs">
                          {doc.last_retrieved_at ? kbService.formatRelativeTime(doc.last_retrieved_at) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 px-1 text-xs text-secondary">
            <div className="flex items-center gap-1.5">
              <CheckCircle size={12} className="text-green-400" />
              {health.completed_docs} completed
            </div>
            {health.failed_docs > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertCircle size={12} className="text-red-400" />
                {health.failed_docs} failed
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <HardDrive size={12} />
              {kbService.formatFileSize(kb.total_size_bytes)}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={12} />
              Last synced {kbService.formatRelativeTime(kb.last_synced_at)}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default KBHealthDashboard;