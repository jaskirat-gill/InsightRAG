import { FC, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  RefreshCw,
  Trash2,
  Settings2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Code2,
  Table2,
  Link2,
  X,
} from 'lucide-react';
import {
  KnowledgeBase,
  Document,
  DocumentRetrievalHistory,
  DocumentStrategyOption,
  kbService,
} from '../services/kb';

type TabKey = 'overview' | 'strategy' | 'chunks' | 'health' | 'document-view';

interface DocumentDetailsProps {
  kb: KnowledgeBase;
  doc: Document;
  onBack: () => void;
}

type DocDetails = Document & {
  created_at?: string | null;
  updated_at?: string | null;

  processing_strategy?: string | null;
  avg_chunk_size_tokens?: number | null;
  avg_chunk_size_chars?: number | null;
  embedding_model?: string | null;

  total_retrievals?: number | null;
  avg_similarity?: number | null;
  preview_text?: string | null;

  // strategy
  strategy_overridden?: boolean | null;
  strategy_display_name?: string | null;
  strategy_summary?: string | null;
  rationale_bullets?: string[] | null;
  detected_features?: Array<{ key: string; title: string; subtitle?: string | null }> | null;

  // view
  view_url?: string | null;
  view_page_count?: number | null;

  // chunks passthrough if backend provides
  chunks?: any[] | null;
};

const tabs: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'strategy', label: 'Strategy' },
  { key: 'chunks', label: 'Chunks' },
  { key: 'health', label: 'Health' },
  { key: 'document-view', label: 'Document View' },
];

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function parseDateMs(s?: string | null): number | null {
  if (!s) return null;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
}
function daysBetween(nowMs: number, pastMs: number) {
  const diff = nowMs - pastMs;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}
function formatShortMonthDay(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function heatClass(v: number) {
  if (v <= 0) return 'bg-white/5';
  if (v < 0.25) return 'bg-blue-500/35';
  if (v < 0.5) return 'bg-blue-500/55';
  if (v < 0.75) return 'bg-blue-500/75';
  return 'bg-blue-500';
}

/** -----------------------------
 * Chunks types + helpers
 * ------------------------------*/
type ChunkRow = {
  chunk_id: string;
  chunk_index: number;
  text: string;
  token_count: number;
  section?: string | null;
  avg_similarity?: number | null;
  retrieval_count?: number | null;
};

type StrategyFeature = { key: string; title: string; subtitle?: string | null; icon: any };

type StrategyProfile = {
  summary: string;
  rationale: string[];
  features: StrategyFeature[];
};

const STRATEGY_CONTENT: Record<string, StrategyProfile> = {
  semantic: {
    summary:
      'This document was processed using a semantic chunking strategy focused on preserving paragraph-level meaning and context continuity.',
    rationale: [
      'Narrative structure benefits from contiguous semantic units',
      'Paragraph and sentence cohesion prioritized over strict layout boundaries',
      'Policy/essay style content detected with fewer hard section breaks',
      'Chunking tuned for conceptual retrieval quality',
    ],
    features: [
      { key: 'cohesion', title: 'Semantic Cohesion', subtitle: 'Paragraph context preserved within chunk boundaries', icon: ClipboardList },
      { key: 'flow', title: 'Narrative Flow', subtitle: 'Sentence ordering retained for better contextual retrieval', icon: Link2 },
      { key: 'section', title: 'Soft Sectioning', subtitle: 'Loose section boundaries used instead of rigid layout splits', icon: Code2 },
      { key: 'retrieval', title: 'Concept Retrieval', subtitle: 'Designed for meaning-level matches across long prose', icon: Table2 },
    ],
  },
  pdf_auto: {
    summary:
      'This document was processed with automatic PDF parsing and default chunking, balancing layout handling and extraction quality.',
    rationale: [
      'No dominant structure type required hard override',
      'Automatic parser strategy selected for mixed content',
      'General-purpose extraction settings used',
      'Balanced for speed and robustness',
    ],
    features: [
      { key: 'auto', title: 'Adaptive Parse', subtitle: 'Automatic parsing selected based on PDF characteristics', icon: ClipboardList },
      { key: 'layout', title: 'Layout Aware', subtitle: 'Preserves major visual/text boundaries where possible', icon: Table2 },
      { key: 'fallback', title: 'Fallback Safe', subtitle: 'Compatible with multiple PDF styles', icon: Link2 },
      { key: 'balanced', title: 'Balanced Pipeline', subtitle: 'Trade-off between fidelity and throughput', icon: Code2 },
    ],
  },
  pdf_table_heavy: {
    summary:
      'This document was processed using a table-heavy strategy to improve extraction and retrieval of structured tabular content.',
    rationale: [
      'Tabular density indicates table-preserving extraction is preferred',
      'Table inference enabled to avoid row/column loss',
      'Chunking avoids splitting tables mid-structure',
      'Optimized for financial/reporting style PDFs',
    ],
    features: [
      { key: 'table-infer', title: 'Table Inference', subtitle: 'Parser tuned for table region detection', icon: Table2 },
      { key: 'row-col', title: 'Row/Column Fidelity', subtitle: 'Retains table relationships for downstream retrieval', icon: ClipboardList },
      { key: 'preserve', title: 'Structure Preservation', subtitle: 'Minimizes destructive splits inside tabular blocks', icon: Link2 },
      { key: 'analytics', title: 'Data Retrieval', subtitle: 'Improves QA on values, totals, and comparisons', icon: Code2 },
    ],
  },
  pdf_multicolumn: {
    summary:
      'This document was processed with a multi-column strategy to preserve reading order and reduce cross-column text mixing.',
    rationale: [
      '2/3-column layout cues detected in page structure',
      'Extraction tuned to reduce column merge artifacts',
      'Reading sequence prioritized for coherence',
      'Improves retrieval relevance for magazine/journal layouts',
    ],
    features: [
      { key: 'order', title: 'Reading Order', subtitle: 'Column flow preserved for coherent text reconstruction', icon: Link2 },
      { key: 'layout', title: 'Column Boundaries', subtitle: 'Reduces accidental cross-column merges', icon: Table2 },
      { key: 'coherence', title: 'Context Coherence', subtitle: 'Chunks reflect natural reading progression', icon: ClipboardList },
      { key: 'precision', title: 'Precision Retrieval', subtitle: 'Improves matching for dense multi-column pages', icon: Code2 },
    ],
  },
  pdf_dataviz_heavy: {
    summary:
      'This document was processed with a data-visualization-heavy strategy for chart/image-rich PDFs while retaining table signals.',
    rationale: [
      'High visual density detected across pages',
      'Image-aware extraction enabled to preserve figure context',
      'Table signals retained for mixed chart/table reports',
      'Supports chart-adjacent explanatory text retrieval',
    ],
    features: [
      { key: 'image', title: 'Image-Aware Parse', subtitle: 'Chart/figure regions considered during extraction', icon: Table2 },
      { key: 'mixed', title: 'Mixed Content', subtitle: 'Handles chart, caption, and table combinations', icon: ClipboardList },
      { key: 'context', title: 'Figure Context', subtitle: 'Keeps nearby explanatory text linked to visuals', icon: Link2 },
      { key: 'reporting', title: 'Report QA', subtitle: 'Improves retrieval on dashboard-like documents', icon: Code2 },
    ],
  },
};

function pad3(n: number) {
  return String(n).padStart(3, '0');
}
function safeNumber(n: any, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function normalizeChunkRow(raw: any, idx: number): ChunkRow {
  const chunkId =
    String(
      raw?.chunk_id ??
        raw?.id ??
        raw?.chunkId ??
        raw?.chunk_key ??
        raw?.key ??
        `chunk_${pad3(idx + 1)}`,
    ) || `chunk_${pad3(idx + 1)}`;

  const chunkIndex = safeNumber(raw?.chunk_index ?? raw?.chunkIndex ?? raw?.index ?? idx, idx);
  const text =
    String(raw?.text ?? raw?.content ?? raw?.chunk_text ?? raw?.preview ?? raw?.snippet ?? '') || '';
  const tokenCount = safeNumber(
    raw?.token_count ??
      raw?.chunk_tokens ??
      raw?.tokenCount ??
      raw?.tokens ??
      raw?.size_tokens ??
      raw?.length_tokens,
    0,
  );
  const section = raw?.section ?? raw?.heading ?? raw?.title ?? null;

  const avgSimilarity =
    raw?.avg_similarity ?? raw?.avgSimilarity ?? raw?.similarity ?? raw?.mean_similarity ?? null;
  const retrievalCount =
    raw?.retrieval_count ?? raw?.retrievalCount ?? raw?.retrieved ?? raw?.usage_count ?? null;

  return {
    chunk_id: chunkId,
    chunk_index: chunkIndex,
    text,
    token_count: tokenCount,
    section,
    avg_similarity: avgSimilarity == null ? null : safeNumber(avgSimilarity, null as any),
    retrieval_count: retrievalCount == null ? null : safeNumber(retrievalCount, null as any),
  };
}

const DocumentDetails: FC<DocumentDetailsProps> = ({ kb, doc, onBack }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const [details, setDetails] = useState<DocDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  // Chunks state
  const [chunksLoading, setChunksLoading] = useState(false);
  const [chunksErr, setChunksErr] = useState<string | null>(null);
  const [chunkRows, setChunkRows] = useState<ChunkRow[]>([]);
  const [chunksLoadedOnce, setChunksLoadedOnce] = useState(false);

  // Strategy state
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyErr, setStrategyErr] = useState<string | null>(null);
  const [strategyLoadedOnce, setStrategyLoadedOnce] = useState(false);
  const [strategyOptions, setStrategyOptions] = useState<DocumentStrategyOption[]>([]);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('pdf_auto');
  const [overrideBusy, setOverrideBusy] = useState(false);

  // Document view state
  const [viewLoading, setViewLoading] = useState(false);
  const [viewErr, setViewErr] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number>(3);
  const [page, setPage] = useState<number>(1);
  const [viewLoadedOnce, setViewLoadedOnce] = useState(false);

  // Retrieval history state
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyErr, setHistoryErr] = useState<string | null>(null);
  const [historyLoadedOnce, setHistoryLoadedOnce] = useState(false);
  const [history, setHistory] = useState<DocumentRetrievalHistory | null>(null);

  const title = useMemo(() => {
    const fallback = doc.source_path?.split('/').pop() ?? 'Document';
    return doc.title ?? fallback;
  }, [doc.title, doc.source_path]);

  const loadDetails = async () => {
    setLoading(true);
    setErr(null);

    try {
      const liveDoc = await kbService.getDocumentDetails(kb.kb_id, doc.document_id);

      const full: DocDetails = {
        ...doc,
        ...liveDoc,
        created_at: (liveDoc as any).created_at ?? (doc as any).created_at ?? null,
        updated_at: (liveDoc as any).updated_at ?? (doc as any).updated_at ?? null,

        processing_strategy:
          (liveDoc as any).processing_strategy ?? (doc as any).processing_strategy ?? null,
        avg_chunk_size_tokens:
          (liveDoc as any).avg_chunk_size_tokens ?? (doc as any).avg_chunk_size_tokens ?? null,
        avg_chunk_size_chars:
          (liveDoc as any).avg_chunk_size_chars ?? (doc as any).avg_chunk_size_chars ?? null,
        embedding_model: (liveDoc as any).embedding_model ?? (doc as any).embedding_model ?? null,

        total_retrievals:
          (liveDoc as any).total_retrievals ??
          (liveDoc as any).retrieval_count ??
          doc.retrieval_count ??
          0,
        avg_similarity: (liveDoc as any).avg_similarity ?? (doc as any).avg_similarity ?? null,
        preview_text: (liveDoc as any).preview_text ?? (doc as any).preview_text ?? null,

        strategy_overridden:
          (liveDoc as any).strategy_overridden ?? (doc as any).strategy_overridden ?? null,
        strategy_display_name:
          (liveDoc as any).strategy_display_name ?? (doc as any).strategy_display_name ?? null,
        strategy_summary:
          (liveDoc as any).strategy_summary ?? (doc as any).strategy_summary ?? null,
        rationale_bullets:
          (liveDoc as any).rationale_bullets ?? (doc as any).rationale_bullets ?? null,
        detected_features:
          (liveDoc as any).detected_features ?? (doc as any).detected_features ?? null,

        view_url: (liveDoc as any).view_url ?? (doc as any).view_url ?? null,
        view_page_count: (liveDoc as any).view_page_count ?? (doc as any).view_page_count ?? null,

        chunks: (liveDoc as any).chunks ?? (doc as any).chunks ?? null,
      };

      setDetails(full);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load document details');
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Load doc details
  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    void loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kb.kb_id, doc.document_id]);

  const showToast = (kind: 'ok' | 'err', msg: string) => {
    setToast({ kind, msg });
    window.setTimeout(() => setToast(null), 3000);
  };

  // single refresh button at the top
  const handleRefresh = async () => {
    setActionBusy(true);
    try {
      await loadDetails();

      // Re-load tab data (only if it was loaded once before)
      if (chunksLoadedOnce) await loadChunks();
      if (strategyLoadedOnce) await loadStrategy();
      if (viewLoadedOnce) await loadDocumentView();
      if (historyLoadedOnce) await loadRetrievalHistory();

      showToast('ok', 'Refreshed');
    } catch (e: any) {
      showToast('err', e?.message || 'Refresh failed');
    } finally {
      setActionBusy(false);
    }
  };

  const handleViewInS3 = async () => {
    showToast('err', 'View in S3 is not wired yet (needs an API endpoint).');
  };

  const handleOverrideStrategy = async () => {
    setOverrideOpen(true);
    if (!strategyLoadedOnce) await loadStrategy();
    setSelectedStrategy(d.processing_strategy ?? 'pdf_auto');
  };

  const handleReprocess = async () => {
    setActionBusy(true);
    try {
      const strategy = d.processing_strategy ?? 'pdf_auto';
      const res = await kbService.overrideDocumentStrategy(kb.kb_id, doc.document_id, strategy);
      await loadDetails();
      if (chunksLoadedOnce) await loadChunks();
      showToast('ok', res.message || 'Reprocess queued');
    } catch (e: any) {
      showToast('err', e?.message || 'Reprocess failed');
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    const ok = window.confirm(
      `Delete "${title}"?\n\nThis should remove it from SQL + Qdrant (depending on backend).`,
    );
    if (!ok) return;

    setActionBusy(true);
    try {
      showToast('ok', 'Delete triggered (wire API to make it real).');
    } catch (e: any) {
      showToast('err', e?.message || 'Delete failed');
    } finally {
      setActionBusy(false);
    }
  };

  const InfoItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="space-y-1">
      <div className="text-xs text-secondary uppercase tracking-wider">{label}</div>
      <div className="text-sm text-white/90">{value}</div>
    </div>
  );

  const Chip = ({ text }: { text: string }) => (
    <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/90">
      {text}
    </span>
  );

  const MetricCard = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
      <div className="text-xs text-secondary uppercase tracking-wider mb-2">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );

  const d = details ?? (doc as DocDetails);
  const isProcessing = (d.processing_status ?? doc.processing_status) === 'processing';

  // ── Health Bar ────────────────────────────────────────────────────────────────
  const nowMs = Date.now();
  const updatedMs = parseDateMs(d.updated_at) ?? parseDateMs((doc as any).updated_at) ?? null;
  const daysOld = updatedMs ? daysBetween(nowMs, updatedMs) : null;

  const statusText =
    daysOld == null ? 'Unknown' : daysOld <= 7 ? 'Fresh' : daysOld <= 30 ? 'Stale' : 'Old';

  const statusColor =
    daysOld == null
      ? 'text-secondary'
      : daysOld <= 7
        ? 'text-green-400'
        : daysOld <= 30
          ? 'text-yellow-400'
          : 'text-red-400';

  const dailyCounts = useMemo(() => {
    const counts = history?.series?.map((s) => Number(s.retrieval_count) || 0) ?? [];
    if (counts.length >= 30) return counts.slice(counts.length - 30);
    if (counts.length === 0) return Array.from({ length: 30 }, () => 0);
    return [...Array.from({ length: 30 - counts.length }, () => 0), ...counts];
  }, [history]);
  const dailyDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 30 }, (_, i) => {
      const dt = new Date(today);
      dt.setDate(today.getDate() - (29 - i));
      return dt;
    });
  }, []);
  const maxDaily = Math.max(1, ...dailyCounts);
  const daily = useMemo(() => dailyCounts.map((v) => v / maxDaily), [dailyCounts, maxDaily]);
  const peakDate = useMemo(() => {
    if (!history?.peak_day) return null;
    const raw = String(history.peak_day);
    let parsed: Date;
    // Parse date-only values as local calendar dates to avoid timezone day-shift.
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y, m, d] = raw.split('-').map((v) => Number(v));
      parsed = new Date(y, m - 1, d);
    } else {
      parsed = new Date(raw);
    }
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }, [history]);
  const avgDaily = Number(history?.avg_daily_retrievals ?? 0);
  const trendPct = Math.round(Number(history?.trend_pct ?? 0));

  const Ring = ({ days }: { days: number | null }) => {
    const pct = days == null ? 0.25 : clamp(1 - days / 30, 0.05, 1);
    const radius = 44;
    const stroke = 8;
    const circ = 2 * Math.PI * radius;
    const dash = circ * pct;

    return (
      <div className="flex items-center justify-center">
        <svg width={120} height={120} viewBox="0 0 120 120" className="block">
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke="rgba(34,197,94,0.95)"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
            transform="rotate(-90 60 60)"
          />
          <text
            x="60"
            y="56"
            textAnchor="middle"
            className="fill-white"
            style={{ fontSize: 20, fontWeight: 700 }}
          >
            {days == null ? '—' : String(days)}
          </text>
          <text
            x="60"
            y="74"
            textAnchor="middle"
            className="fill-[rgba(255,255,255,0.55)]"
            style={{ fontSize: 11 }}
          >
            DAYS OLD
          </text>
        </svg>
      </div>
    );
  };

  // ── Strategy Bar ────────────────────────────────────────────────────────────────
  
  const strategyName = d.strategy_display_name ?? d.processing_strategy ?? 'Auto (Default)';
  const strategyKey = d.processing_strategy ?? 'pdf_auto';
  const defaultStrategy = STRATEGY_CONTENT[strategyKey] ?? STRATEGY_CONTENT.pdf_auto;

  const loadStrategy = async () => {
    setStrategyLoading(true);
    setStrategyErr(null);
    try {
      const res = await kbService.getDocumentStrategy(kb.kb_id, doc.document_id);
      setStrategyOptions(res.options ?? []);
      setDetails((prev) => ({
        ...(prev ?? (doc as any)),
        processing_strategy: res?.current_strategy ?? (prev as any)?.processing_strategy ?? 'pdf_auto',
        strategy_display_name: res?.current_strategy_label ?? null,
      }));
      setSelectedStrategy(res?.current_strategy ?? 'pdf_auto');
      setStrategyLoadedOnce(true);
    } catch (e: any) {
      setStrategyErr(e?.message || 'Failed to load strategy');
    } finally {
      setStrategyLoading(false);
    }
  };

  const handleApplyOverrideStrategy = async () => {
    setOverrideBusy(true);
    try {
      const res = await kbService.overrideDocumentStrategy(kb.kb_id, doc.document_id, selectedStrategy);
      setOverrideOpen(false);
      await loadDetails();
      await loadStrategy();
      if (chunksLoadedOnce) await loadChunks();
      showToast('ok', res.message || 'Strategy override queued');
    } catch (e: any) {
      showToast('err', e?.message || 'Strategy override failed');
    } finally {
      setOverrideBusy(false);
    }
  };

  // ── Chunk Tab ────────────────────────────────────────────────────────────────
  const totalChunksNumber = useMemo(() => {
    const n = safeNumber(doc.total_chunks ?? d.total_chunks ?? 0, 0);
    return Math.max(0, n);
  }, [doc.total_chunks, (d as any).total_chunks]);

  const renderLimit = 60; // keep UI fast if total_chunks is huge

  const loadChunks = async () => {
    setChunksLoading(true);
    setChunksErr(null);

    try {
      const rawList = await kbService.listDocumentChunks(kb.kb_id, doc.document_id);
      const rows = rawList.map((x, i) => normalizeChunkRow(x, i));
      setChunkRows(rows);

      setChunksLoadedOnce(true);
    } catch (e: any) {
      setChunksErr(e?.message || 'Failed to load chunks');
      setChunkRows([]);
    } finally {
      setChunksLoading(false);
    }
  };

  // Auto-load when tab opens (so it’s not blank)
  useEffect(() => {
    if (activeTab === 'chunks' && !chunksLoadedOnce && !chunksLoading) loadChunks();
    if (activeTab === 'strategy' && !strategyLoadedOnce && !strategyLoading) loadStrategy();
    if (activeTab === 'document-view' && !viewLoadedOnce && !viewLoading) loadDocumentView();
    if (activeTab === 'health' && !historyLoadedOnce && !historyLoading) loadRetrievalHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (!isProcessing) return;
    const interval = window.setInterval(() => {
      void loadDetails();
      if (chunksLoadedOnce) void loadChunks();
      if (strategyLoadedOnce) void loadStrategy();
    }, 4000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing, chunksLoadedOnce, strategyLoadedOnce]);

  const loadRetrievalHistory = async () => {
    setHistoryLoading(true);
    setHistoryErr(null);
    try {
      const res = await kbService.getDocumentRetrievalHistory(kb.kb_id, doc.document_id, 30);
      setHistory(res);
      setHistoryLoadedOnce(true);
    } catch (e: any) {
      setHistoryErr(e?.message || 'Failed to load retrieval history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── Document View Bar ────────────────────────────────────────────────────────────────
  const loadDocumentView = async () => {
    setViewLoading(true);
    setViewErr(null);

    try {
      const svcAny = kbService as any;

      if (typeof svcAny.getDocumentViewUrl === 'function') {
        const res = await svcAny.getDocumentViewUrl(kb.kb_id, doc.document_id);
        const url = res?.url ?? res?.view_url ?? res?.signed_url ?? null;
        const pc = safeNumber(res?.page_count ?? res?.pages ?? res?.pageCount ?? 0, 0);
        setViewUrl(url);
        if (pc > 0) setPageCount(pc);
      } else if (d.view_url) {
        setViewUrl(d.view_url);
        const pc = safeNumber(d.view_page_count ?? 0, 0);
        if (pc > 0) setPageCount(pc);
      } else {
        setViewUrl(null);
      }

      setViewLoadedOnce(true);
    } catch (e: any) {
      setViewErr(e?.message || 'Failed to load document view');
    } finally {
      setViewLoading(false);
    }
  };

  // Chunks derived UI metrics
  const maxRetrieved = useMemo(() => {
    if (!chunkRows.length) return 1;
    return Math.max(1, ...chunkRows.map((c) => safeNumber(c.retrieval_count ?? 0, 0)));
  }, [chunkRows]);

  const ChunkCard = ({ row }: { row: ChunkRow }) => {
    const retrieved = safeNumber(row.retrieval_count ?? 0, 0);
    const pct = clamp(retrieved / maxRetrieved, 0.02, 1);

    return (
      <div className="bg-surface/50 backdrop-blur border border-white/5 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-primary">
              {row.chunk_id || `chunk_${pad3(row.chunk_index + 1)}`}
            </div>

            <div className="text-secondary text-sm mt-2 leading-6 line-clamp-2">
              {row.text || '—'}
            </div>

            <div className="mt-3 flex items-center gap-6 text-xs text-secondary">
              <div>
                Avg Similarity:{' '}
                <span className="text-white/80">
                  {row.avg_similarity != null ? String(row.avg_similarity) : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 text-xs text-secondary text-right">
            <div className="text-white/70">{row.token_count ? `${row.token_count} tokens` : '—'}</div>
            <div className="mt-1">{row.section ? `Section: ${row.section}` : ' '}</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-secondary mb-2">
            <span />
            <span>Retrieved: {retrieved.toLocaleString()} times</span>
          </div>

          <div className="h-2 rounded-full bg-black/30 border border-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-500/80 via-blue-500/80 to-blue-500"
              style={{ width: `${Math.round(pct * 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  if (err) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white text-sm"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={16} /> {err}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface/50 backdrop-blur border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-secondary hover:text-white shrink-0"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="flex items-start gap-3 min-w-0">
                <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-primary shrink-0">
                  <FileText size={20} />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-3xl font-bold text-white truncate">{title}</h1>

                    {doc.document_type && <Chip text={doc.document_type.toUpperCase()} />}
                    {typeof doc.health_score === 'number' && doc.health_score >= 90 && (
                      <span className="px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/20 text-xs text-green-300">
                        Excellent ({Math.round(doc.health_score)}%)
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-secondary mt-1 truncate">
                    Knowledge Bases / {kb.name} / {title}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleViewInS3}
                disabled={actionBusy}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm rounded-xl transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                <ExternalLink size={14} />
                View in S3
              </button>

              <button
                onClick={handleOverrideStrategy}
                disabled={actionBusy}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm rounded-xl transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Settings2 size={14} />
                Override Strategy
              </button>

              <button
                onClick={handleReprocess}
                disabled={actionBusy || isProcessing}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {actionBusy || isProcessing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {isProcessing ? 'Processing...' : 'Reprocess'}
              </button>

              <button
                onClick={handleDelete}
                disabled={actionBusy}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <InfoItem label="Source" value={<span className="text-white/80">{doc.source_path}</span>} />
            <InfoItem
              label="Size"
              value={doc.file_size_bytes != null ? kbService.formatFileSize(doc.file_size_bytes) : '—'}
            />
            <InfoItem label="Created" value={d.created_at ? kbService.formatRelativeTime(d.created_at) : '—'} />

            <InfoItem label="Processing Strategy" value={d.processing_strategy ?? '—'} />
            <InfoItem label="Total Chunks" value={doc.total_chunks?.toLocaleString?.() ?? '—'} />
            <InfoItem
              label="Avg Chunk Size"
              value={
                d.avg_chunk_size_chars != null
                  ? `${d.avg_chunk_size_chars} chars`
                  : d.avg_chunk_size_tokens != null
                    ? `${d.avg_chunk_size_tokens} tokens`
                    : '—'
              }
            />

            <InfoItem label="Embedding Model" value={d.embedding_model ?? '—'} />
            <InfoItem label="Last Updated" value={d.updated_at ? kbService.formatRelativeTime(d.updated_at) : '—'} />
            <InfoItem
              label="Last Retrieved"
              value={d.last_retrieved_at ? kbService.formatRelativeTime(d.last_retrieved_at) : '—'}
            />
          </div>
        </div>

        {/* Tabs + ONE refresh */}
        <div className="px-6 border-t border-white/5">
          <div className="flex items-center gap-6">
            {tabs.map((t) => {
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`py-4 text-sm transition-colors border-b-2 ${
                    active ? 'text-primary border-primary' : 'text-secondary border-transparent hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}

            <div className="ml-auto py-2">
              <button
                onClick={handleRefresh}
                disabled={actionBusy}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white text-xs rounded-xl transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                title="Refresh document data"
              >
                <RefreshCw size={14} className={actionBusy ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="Total Retrievals" value={(d.total_retrievals ?? doc.retrieval_count ?? 0).toLocaleString()} />
            <MetricCard label="Avg Similarity" value={d.avg_similarity != null ? String(d.avg_similarity) : '—'} />
            <MetricCard
              label="Last Retrieved"
              value={d.last_retrieved_at ? kbService.formatRelativeTime(d.last_retrieved_at) : '—'}
            />
          </div>

          <div className="bg-surface/50 backdrop-blur border border-white/5 rounded-2xl p-6">
            <div className="text-white font-semibold mb-4">Document Preview</div>
            <div className="bg-black/30 border border-white/5 rounded-2xl p-5 text-sm text-secondary leading-6 whitespace-pre-wrap">
              Preview not available yet. (Wire an API endpoint that returns a text preview for this document.)
            </div>
          </div>
        </div>
      )}

      {/* Strategy */}
      {activeTab === 'strategy' && (
        <div className="space-y-6">
          {strategyErr && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={16} /> {strategyErr}
            </div>
          )}

          {strategyLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          )}

          {!strategyLoading && (
            <>
              <div className="bg-surface/50 backdrop-blur border border-white/5 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-white font-semibold">Processing Strategy</div>
                    <div className="text-secondary text-sm mt-3 leading-6 max-w-4xl">
                      {d.strategy_summary ?? defaultStrategy.summary}
                    </div>

                    <div className="mt-5">
                      <div className="text-white font-semibold text-sm mb-2">Rationale</div>
                      <ul className="list-disc pl-5 text-sm text-secondary space-y-1">
                        {(d.rationale_bullets ?? defaultStrategy.rationale).map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                      {strategyName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-surface/50 backdrop-blur border border-white/5 rounded-2xl p-6">
                <div className="text-white font-semibold mb-4">Detected Features</div>

                <div className="space-y-3">
                  {(() => {
                    const fromBackend = d.detected_features;
                    if (Array.isArray(fromBackend) && fromBackend.length > 0) {
                      return fromBackend.map((f, i) => (
                        <div
                          key={f.key ?? i}
                          className="bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center gap-3"
                        >
                          <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70">
                            <ClipboardList size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm text-white/90">{f.title}</div>
                            {f.subtitle ? <div className="text-xs text-secondary mt-1">{f.subtitle}</div> : null}
                          </div>
                        </div>
                      ));
                    }

                    return defaultStrategy.features.map((f) => {
                      const Icon = f.icon;
                      return (
                        <div
                          key={f.key}
                          className="bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center gap-3"
                        >
                          <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70">
                            <Icon size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm text-white/90">{f.title}</div>
                            {f.subtitle ? <div className="text-xs text-secondary mt-1">{f.subtitle}</div> : null}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Chunk */}
      {activeTab === 'chunks' && (
        <div className="space-y-5">
          <div>
            <div className="text-white font-semibold">Chunks</div>
            <div className="text-xs text-secondary mt-1">
              {totalChunksNumber > 0
                ? `Total: ${totalChunksNumber.toLocaleString()} chunks${totalChunksNumber > renderLimit ? ` (showing first ${renderLimit})` : ''}`
                : ' '}
            </div>
          </div>

          {chunksErr && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={16} /> {chunksErr}
            </div>
          )}

          {chunksLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          )}

          {!chunksLoading && !chunksErr && chunkRows.length === 0 && (
            <div className="bg-surface/50 backdrop-blur border border-white/5 rounded-2xl p-6">
              <div className="text-secondary text-sm">No chunks available yet.</div>
            </div>
          )}

          {!chunksLoading && !chunksErr && chunkRows.length > 0 && (
            <div className="space-y-4">
              {chunkRows.map((row) => (
                <ChunkCard key={row.chunk_id} row={row} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Health */}
      {activeTab === 'health' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface/50 backdrop-blur border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-white font-semibold">Retrieval History (Last 30 Days)</div>
            </div>

            {historyErr && (
              <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={16} /> {historyErr}
              </div>
            )}

            {historyLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            )}

            <div className="bg-black/25 border border-white/5 rounded-2xl p-6">
              <div className="grid grid-cols-7 gap-3 max-w-[520px]">
                {Array.from({ length: 35 }).map((_, i) => {
                  const idx = i - (35 - 30);
                  const v = idx >= 0 && idx < 30 ? daily[idx] : 0;
                  return (
                    <div
                      key={i}
                      className={`h-8 rounded ${heatClass(v)} border border-white/5`}
                      title={
                        idx >= 0 && idx < 30
                          ? `${dailyDates[idx].toLocaleDateString()}: ${dailyCounts[idx]} retrievals`
                          : '—'
                      }
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-surface/50 backdrop-blur border border-white/5 rounded-2xl p-6">
            <div className="text-white font-semibold mb-4">Staleness Indicator</div>

            <div className="flex flex-col items-center">
              <Ring days={daysOld} />
              <div className="mt-2 text-xs text-secondary">
                Last updated: {d.updated_at ? kbService.formatRelativeTime(d.updated_at) : '—'}
              </div>
              <div className="mt-1 text-xs">
                <span className="text-secondary">Status: </span>
                <span className={`font-medium ${statusColor}`}>{statusText}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface/50 backdrop-blur border border-white/5 rounded-2xl p-6">
              <div className="text-xs text-secondary uppercase tracking-wider mb-2">Peak Retrieval Day (Past 30 Days)</div>
              <div className="text-3xl font-bold text-white">
                {peakDate ? formatShortMonthDay(peakDate) : '—'}
              </div>
            </div>

            <div className="bg-surface/50 backdrop-blur border border-white/5 rounded-2xl p-6">
              <div className="text-xs text-secondary uppercase tracking-wider mb-2">Avg Daily Retrievals (Past 30 Days)</div>
              <div className="text-3xl font-bold text-white">{avgDaily.toFixed(2)}</div>
            </div>

            <div className="bg-surface/50 backdrop-blur border border-white/5 rounded-2xl p-6">
              <div className="text-xs text-secondary uppercase tracking-wider mb-2">Retrieval Trend (Past 30 Days)</div>
              <div className={`text-3xl font-bold ${trendPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {trendPct >= 0 ? `↑ ${trendPct}%` : `↓ ${Math.abs(trendPct)}%`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document View */}
      {activeTab === 'document-view' && (
        <div className="space-y-6">
          {viewErr && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={16} /> {viewErr}
            </div>
          )}

          <div className="bg-surface/50 backdrop-blur border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="text-white font-semibold">Document Retrieval Heatmap</div>

              <div className="flex items-center gap-3 text-xs text-secondary">
                <div>
                  Page {page} of {pageCount}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 disabled:opacity-40 disabled:hover:bg-white/5 flex items-center justify-center"
                    title="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={page >= pageCount}
                    className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 disabled:opacity-40 disabled:hover:bg-white/5 flex items-center justify-center"
                    title="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-wrap items-center gap-4 text-xs text-secondary">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-red-500/80" />
                High Retrieval (200+ times)
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-yellow-500/80" />
                Medium Retrieval (50–200 times)
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-blue-500/80" />
                Low Retrieval (1–50 times)
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-white/10 border border-white/10" />
                Not Retrieved
              </div>
            </div>

            <div className="mt-4 bg-black/20 border border-white/5 rounded-2xl p-4">
              {viewLoading && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={28} className="animate-spin text-primary" />
                </div>
              )}

              {!viewLoading && viewUrl && (
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/30">
                  <iframe title="document-viewer" src={viewUrl} className="w-full h-[650px]" />
                </div>
              )}

              {!viewLoading && !viewUrl && (
                <div className="text-sm text-secondary p-4">
                  Document viewer needs a backend URL (signed/proxy URL).
                  <div className="mt-3 text-xs text-secondary/70">
                    Implement <code className="text-white/80">kbService.getDocumentViewUrl(kb_id, document_id)</code> and
                    return <code className="text-white/80">{`{ url, page_count }`}</code>.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Override Strategy Modal */}
      {overrideOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-surface border border-white/10 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Override Processing Strategy</h2>
                <p className="text-sm text-secondary mt-1">
                  Current strategy: <span className="text-white/90">{d.processing_strategy ?? 'pdf_auto'}</span>
                </p>
              </div>
              <button
                onClick={() => setOverrideOpen(false)}
                className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/80"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-3 max-h-[55vh] overflow-auto pr-1">
              {(strategyOptions.length ? strategyOptions : [
                { key: 'semantic', label: 'Semantic (Essay/Policy)', description: 'Paragraph-oriented semantic chunking for narrative documents.' },
                { key: 'pdf_auto', label: 'Auto (Default)', description: 'General-purpose PDF parsing.' },
              ]).map((option) => {
                const isSelected = selectedStrategy === option.key;
                return (
                <label
                  key={option.key}
                  className={`block rounded-xl border p-4 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-green-400/50 bg-green-500/10'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="strategy-option"
                      value={option.key}
                      checked={selectedStrategy === option.key}
                      onChange={() => setSelectedStrategy(option.key)}
                      className="mt-1 accent-green-500"
                    />
                    <div>
                      <div className={`text-sm font-medium ${isSelected ? 'text-green-300' : 'text-white'}`}>
                        {option.label}
                      </div>
                      <div className={`text-xs mt-1 ${isSelected ? 'text-green-200/90' : 'text-secondary'}`}>
                        {option.description}
                      </div>
                    </div>
                  </div>
                </label>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setOverrideOpen(false)}
                disabled={overrideBusy}
                className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyOverrideStrategy}
                disabled={overrideBusy}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
              >
                {overrideBusy ? <Loader2 size={14} className="animate-spin" /> : <Settings2 size={14} />}
                Apply and Reprocess
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border shadow-2xl ${
              toast.kind === 'ok'
                ? 'bg-green-500/10 border-green-500/20 text-green-300'
                : 'bg-red-500/10 border-red-500/20 text-red-300'
            }`}
          >
            {toast.kind === 'ok' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span className="text-sm">{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentDetails;
