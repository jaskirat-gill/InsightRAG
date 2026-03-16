import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
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
} from 'lucide-react';
import {
  KnowledgeBase,
  Document,
  DocumentRetrievalHistory,
  DocumentHeatmap,
  DocumentStrategyOption,
  kbService,
} from '../services/kb';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

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

  strategy_overridden?: boolean | null;
  strategy_display_name?: string | null;
  strategy_summary?: string | null;
  rationale_bullets?: string[] | null;
  detected_features?: Array<{ key: string; title: string; subtitle?: string | null }> | null;

  view_url?: string | null;
  view_page_count?: number | null;

  chunks?: any[] | null;
};

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
  if (v <= 0) return 'bg-muted';
  if (v < 0.25) return 'bg-primary/35';
  if (v < 0.5) return 'bg-primary/55';
  if (v < 0.75) return 'bg-primary/75';
  return 'bg-primary';
}

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
  'table-preserving': {
    summary:
      'Keeps each table as a single chunk, splitting only at row boundaries to preserve structure and relationships.',
    rationale: [
      'Tabular structure benefits from whole-table retrieval',
      'Row/column relationships preserved within chunk boundaries',
      'Non-table elements chunked normally around table blocks',
      'Optimized for structured data QA and value lookups',
    ],
    features: [
      { key: 'table-infer', title: 'Table Integrity', subtitle: 'Each table is kept as one unit, never split mid-table', icon: Table2 },
      { key: 'row-col', title: 'Row/Column Fidelity', subtitle: 'Retains table relationships for downstream retrieval', icon: ClipboardList },
      { key: 'preserve', title: 'Structure Preservation', subtitle: 'Minimizes destructive splits inside tabular blocks', icon: Link2 },
      { key: 'analytics', title: 'Data Retrieval', subtitle: 'Improves QA on values, totals, and comparisons', icon: Code2 },
    ],
  },
  'slide-per-chunk': {
    summary:
      'Groups all content per slide into one chunk, preserving slide number metadata for targeted retrieval.',
    rationale: [
      'Slide boundaries represent natural semantic units in presentations',
      'Slide number metadata retained for targeted retrieval',
      'Prevents cross-slide context bleed',
      'Optimized for QA and search over individual slides',
    ],
    features: [
      { key: 'slide-unit', title: 'Slide as Unit', subtitle: 'Each slide becomes one self-contained chunk', icon: ClipboardList },
      { key: 'metadata', title: 'Slide Metadata', subtitle: 'Slide number preserved in chunk metadata', icon: Code2 },
      { key: 'boundary', title: 'Clean Boundaries', subtitle: 'No content bleeds across slide boundaries', icon: Link2 },
      { key: 'retrieval', title: 'Slide-Level Retrieval', subtitle: 'Retrieval targets specific slides rather than fragments', icon: Table2 },
    ],
  },
  'section-aware': {
    summary:
      'Splits at heading and title boundaries, never mid-section, for structured document content.',
    rationale: [
      'Section headings indicate natural topic boundaries',
      'Chunks never split across heading-delimited sections',
      'Improves retrieval relevance for structured documents',
      'Falls back to semantic splitting within oversized sections',
    ],
    features: [
      { key: 'heading', title: 'Heading Boundaries', subtitle: 'Splits only at Title/Header elements, not mid-section', icon: ClipboardList },
      { key: 'coherence', title: 'Section Coherence', subtitle: 'Each chunk covers one complete section', icon: Link2 },
      { key: 'fallback', title: 'Semantic Fallback', subtitle: 'Oversized sections are split semantically within boundaries', icon: Code2 },
      { key: 'retrieval', title: 'Topic Retrieval', subtitle: 'Optimized for topic-level QA over structured content', icon: Table2 },
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

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [chunksLoading, setChunksLoading] = useState(false);
  const [chunksErr, setChunksErr] = useState<string | null>(null);
  const [chunkRows, setChunkRows] = useState<ChunkRow[]>([]);
  const [chunksLoadedOnce, setChunksLoadedOnce] = useState(false);

  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyErr, setStrategyErr] = useState<string | null>(null);
  const [strategyLoadedOnce, setStrategyLoadedOnce] = useState(false);
  const [strategyOptions, setStrategyOptions] = useState<DocumentStrategyOption[]>([]);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('pdf_auto');
  const [overrideBusy, setOverrideBusy] = useState(false);
  const [pendingReprocess, setPendingReprocess] = useState(false);
  const [sawProcessingSinceReprocess, setSawProcessingSinceReprocess] = useState(false);

  const [viewLoading, setViewLoading] = useState(false);
  const [viewErr, setViewErr] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number>(3);
  const [page, setPage] = useState<number>(1);
  const [viewLoadedOnce, setViewLoadedOnce] = useState(false);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyErr, setHistoryErr] = useState<string | null>(null);
  const [historyLoadedOnce, setHistoryLoadedOnce] = useState(false);
  const [history, setHistory] = useState<DocumentRetrievalHistory | null>(null);

  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapErr, setHeatmapErr] = useState<string | null>(null);
  const [heatmapLoadedOnce, setHeatmapLoadedOnce] = useState(false);
  const [heatmap, setHeatmap] = useState<DocumentHeatmap | null>(null);

  const title = useMemo(() => {
    const fallback = doc.source_path?.split('/').pop() ?? 'Document';
    return doc.title ?? fallback;
  }, [doc.title, doc.source_path]);

  const loadDetails = async (): Promise<DocDetails | null> => {
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
      return full;
    } catch (e: any) {
      setErr(e?.message || 'Failed to load document details');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kb.kb_id, doc.document_id]);

  const showToast = (kind: 'ok' | 'err', msg: string) => {
    setToast({ kind, msg });
    window.setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!showDeleteModal) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !actionBusy) setShowDeleteModal(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showDeleteModal, actionBusy]);

  const handleRefresh = async () => {
    setActionBusy(true);
    try {
      await loadDetails();
      if (chunksLoadedOnce) await loadChunks();
      if (strategyLoadedOnce) await loadStrategy();
      if (viewLoadedOnce) await loadDocumentView();
      if (heatmapLoadedOnce) await loadHeatmap();
      if (historyLoadedOnce) await loadRetrievalHistory();

      showToast('ok', 'Refreshed');
    } catch (e: any) {
      showToast('err', e?.message || 'Refresh failed');
    } finally {
      setActionBusy(false);
    }
  };

  const handleViewInSource = async () => {
    setActionBusy(true);
    try {
      const { url } = await (kbService as any).getDocumentS3Url(kb.kb_id, doc.document_id);
      if (!url) throw new Error('No URL returned');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      showToast('err', e?.message || 'Failed to open source link');
    } finally {
      setActionBusy(false);
    }
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
      setPendingReprocess(true);
      setSawProcessingSinceReprocess(false);
      setDetails((prev) => ({
        ...(prev ?? (doc as any)),
        processing_status: 'processing',
        processing_strategy: strategy,
      }));
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
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setActionBusy(true);
    try {
      await (kbService as any).deleteDocument(kb.kb_id, doc.document_id);
      showToast('ok', 'Deleted');
      setShowDeleteModal(false);
      window.setTimeout(() => onBack(), 500);
    } catch (e: any) {
      showToast('err', e?.message || 'Delete failed');
    } finally {
      setActionBusy(false);
    }
  };

  const InfoItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground uppercase tracking-wider">{label}</Label>
      <div className="text-sm text-foreground/90">{value}</div>
    </div>
  );

  const Chip = ({ text }: { text: string }) => (
    <Badge variant="outline" className="text-xs">{text}</Badge>
  );

  const MetricCard = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );

  const d = details ?? (doc as DocDetails);
  const isProcessing = (d.processing_status ?? doc.processing_status) === 'processing';

  const nowMs = Date.now();
  const updatedMs = parseDateMs(d.updated_at) ?? parseDateMs((doc as any).updated_at) ?? null;
  const daysOld = updatedMs ? daysBetween(nowMs, updatedMs) : null;

  const statusText =
    daysOld == null ? 'Unknown' : daysOld <= 7 ? 'Fresh' : daysOld <= 30 ? 'Stale' : 'Old';

  const statusColor =
    daysOld == null
      ? 'text-muted-foreground'
      : daysOld <= 7
        ? 'text-status-success'
        : daysOld <= 30
          ? 'text-status-warning'
          : 'text-status-danger';

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
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y, m, dd] = raw.split('-').map((v) => Number(v));
      parsed = new Date(y, m - 1, dd);
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
            stroke="var(--ring-track-stroke)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke="var(--ring-progress-stroke)"
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
            className="fill-foreground"
            style={{ fontSize: 20, fontWeight: 700 }}
          >
            {days == null ? '—' : String(days)}
          </text>
          <text
            x="60"
            y="74"
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 11 }}
          >
            DAYS OLD
          </text>
        </svg>
      </div>
    );
  };

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
      setPendingReprocess(true);
      setSawProcessingSinceReprocess(false);
      setDetails((prev) => ({
        ...(prev ?? (doc as any)),
        processing_status: 'processing',
        processing_strategy: selectedStrategy,
      }));
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

  const totalChunksNumber = useMemo(() => {
    const n = safeNumber((d as any).total_chunks ?? (doc as any).total_chunks ?? 0, 0);
    return Math.max(0, n);
  }, [doc, d]);

  const renderLimit = 60;

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

  useEffect(() => {
    if (activeTab === 'chunks' && !chunksLoadedOnce && !chunksLoading) loadChunks();
    if (activeTab === 'strategy' && !strategyLoadedOnce && !strategyLoading) loadStrategy();
    if (activeTab === 'document-view' && !viewLoadedOnce && !viewLoading) loadDocumentView();
    if (activeTab === 'document-view' && !heatmapLoadedOnce && !heatmapLoading) loadHeatmap();
    if (activeTab === 'health' && !historyLoadedOnce && !historyLoading) loadRetrievalHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (!isProcessing && !pendingReprocess) return;
    const interval = window.setInterval(async () => {
      const full = await loadDetails();
      const status = full?.processing_status;

      if (status === 'processing') {
        setSawProcessingSinceReprocess(true);
      }

      if (pendingReprocess && sawProcessingSinceReprocess && status && status !== 'processing') {
        setPendingReprocess(false);
        setSawProcessingSinceReprocess(false);
      }

      if (chunksLoadedOnce) void loadChunks();
      if (strategyLoadedOnce) void loadStrategy();
    }, 2500);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing, pendingReprocess, sawProcessingSinceReprocess, chunksLoadedOnce, strategyLoadedOnce]);

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

  const loadHeatmap = async () => {
    setHeatmapLoading(true);
    setHeatmapErr(null);

    try {
      const res = await kbService.getDocumentHeatmap(kb.kb_id, doc.document_id);
      setHeatmap(res);
      setHeatmapLoadedOnce(true);
    } catch (e: any) {
      setHeatmapErr(e?.message || 'Failed to load retrieval heatmap');
    } finally {
      setHeatmapLoading(false);
    }
  };
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

  const maxRetrieved = useMemo(() => {
    if (!chunkRows.length) return 1;
    return Math.max(1, ...chunkRows.map((c) => safeNumber(c.retrieval_count ?? 0, 0)));
  }, [chunkRows]);

  const ChunkCard = ({ row }: { row: ChunkRow }) => {
    const retrieved = safeNumber(row.retrieval_count ?? 0, 0);
    const pct = clamp(retrieved / maxRetrieved, 0.02, 1);

    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-primary">
                {row.chunk_id || `chunk_${pad3(row.chunk_index + 1)}`}
              </div>

              <div className="text-muted-foreground text-sm mt-2 leading-6 line-clamp-2">
                {row.text || '—'}
              </div>

              <div className="mt-3 flex items-center gap-6 text-xs text-muted-foreground">
                <div>
                  Avg Similarity:{' '}
                  <span className="text-foreground/80">
                    {row.avg_similarity != null ? String(row.avg_similarity) : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 text-xs text-muted-foreground text-right">
              <div className="text-foreground/70">{row.token_count ? `${row.token_count} tokens` : '—'}</div>
              <div className="mt-1">{row.section ? `Section: ${row.section}` : ' '}</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span />
              <span>Retrieved: {retrieved.toLocaleString()} times</span>
            </div>

            <div className="h-2 rounded-full bg-muted border overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500/80 via-blue-500/80 to-blue-500"
                style={{ width: `${Math.round(pct * 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const currentPageBin = useMemo(() => {
    if (!heatmap?.bins) return null;
    return heatmap.bins.find((b) => b.page_number === page) ?? null;
  }, [heatmap, page]);

  const currentPageRetrievals = currentPageBin?.raw_retrievals ?? 0;
  const currentPageScore = clamp(currentPageBin?.normalized_score ?? 0, 0, 1);
  const overlayAlpha = currentPageScore > 0 ? 0.12 + 0.28 * currentPageScore : 0;

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
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft size={16} />
          Back
        </Button>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
                <ArrowLeft size={18} />
              </Button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-semibold text-foreground truncate">{title}</h1>
                  {doc.document_type && <Chip text={doc.document_type.toUpperCase()} />}
                </div>

                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {kb.name} / {title}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleViewInSource} disabled={actionBusy}>
                <ExternalLink size={14} />
                Source
              </Button>

              <Button size="sm" onClick={handleReprocess} disabled={actionBusy || isProcessing}>
                {actionBusy || isProcessing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {isProcessing ? 'Processing...' : 'Reprocess'}
              </Button>

              <Button variant="outline" size="sm" onClick={handleOverrideStrategy} disabled={actionBusy}>
                <Settings2 size={14} />
                Strategy
              </Button>

              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={handleDelete} disabled={actionBusy}>
                <Trash2 size={14} />
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 md:grid-cols-3 gap-4">
            <InfoItem label="Source" value={<span className="text-foreground/80 truncate block">{doc.source_path}</span>} />
            <InfoItem
              label="Size"
              value={doc.file_size_bytes != null ? kbService.formatFileSize(doc.file_size_bytes) : '—'}
            />
            <InfoItem label="Chunks" value={d.total_chunks?.toLocaleString?.() ?? '—'} />
            <InfoItem label="Strategy" value={d.processing_strategy ?? '—'} />
            <InfoItem label="Status" value={d.processing_status ?? '—'} />
            <InfoItem label="Updated" value={d.updated_at ? kbService.formatRelativeTime(d.updated_at) : '—'} />
          </div>
        </CardContent>

        <div className="px-6 border-t">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="w-full">
            <div className="flex items-center">
              <TabsList className="bg-transparent h-auto p-0 gap-2">
                <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="strategy" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3">
                  Strategy
                </TabsTrigger>
                <TabsTrigger value="chunks" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3">
                  Chunks
                </TabsTrigger>
                <TabsTrigger value="health" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3">
                  Health
                </TabsTrigger>
                <TabsTrigger value="document-view" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3">
                  Document View
                </TabsTrigger>
              </TabsList>

              <div className="ml-auto py-2">
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={actionBusy} title="Refresh document data">
                  <RefreshCw size={14} className={actionBusy ? 'animate-spin' : ''} />
                  Refresh
                </Button>
              </div>
            </div>
          </Tabs>
        </div>
      </Card>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              label="Total Retrievals"
              value={(d.total_retrievals ?? doc.retrieval_count ?? 0).toLocaleString()}
            />
            <MetricCard label="Avg Similarity" value={d.avg_similarity != null ? String(d.avg_similarity) : '—'} />
            <MetricCard
              label="Last Retrieved"
              value={d.last_retrieved_at ? kbService.formatRelativeTime(d.last_retrieved_at) : '—'}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Document Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-5 text-sm text-muted-foreground leading-6 whitespace-pre-wrap">
                {d.preview_text && d.preview_text.trim()
                  ? d.preview_text
                  : 'Preview not available yet. (This appears after the document has chunks.)'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'strategy' && (
        <div className="space-y-6">
          {strategyErr && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{strategyErr}</AlertDescription>
            </Alert>
          )}

          {strategyLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          )}

          {!strategyLoading && (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">Processing Strategy</CardTitle>
                      <div className="text-muted-foreground text-sm mt-3 leading-6 max-w-4xl">
                        {d.strategy_summary ?? defaultStrategy.summary}
                      </div>

                      <div className="mt-5">
                        <div className="text-foreground font-semibold text-sm mb-2">Rationale</div>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                          {(d.rationale_bullets ?? defaultStrategy.rationale).map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <Badge variant="secondary">{strategyName}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detected Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(() => {
                      const fromBackend = d.detected_features;
                      if (Array.isArray(fromBackend) && fromBackend.length > 0) {
                        return fromBackend.map((f, i) => (
                          <div
                            key={f.key ?? i}
                            className="bg-muted rounded-lg p-4 flex items-center gap-3"
                          >
                            <div className="h-9 w-9 rounded-xl bg-background border flex items-center justify-center text-muted-foreground">
                              <ClipboardList size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm text-foreground/90">{f.title}</div>
                              {f.subtitle ? <div className="text-xs text-muted-foreground mt-1">{f.subtitle}</div> : null}
                            </div>
                          </div>
                        ));
                      }

                      return defaultStrategy.features.map((f) => {
                        const Icon = f.icon;
                        return (
                          <div
                            key={f.key}
                            className="bg-muted rounded-lg p-4 flex items-center gap-3"
                          >
                            <div className="h-9 w-9 rounded-xl bg-background border flex items-center justify-center text-muted-foreground">
                              <Icon size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm text-foreground/90">{f.title}</div>
                              {f.subtitle ? <div className="text-xs text-muted-foreground mt-1">{f.subtitle}</div> : null}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {activeTab === 'chunks' && (
        <div className="space-y-5">
          <div>
            <div className="text-foreground font-semibold">Chunks</div>
            <div className="text-xs text-muted-foreground mt-1">
              {totalChunksNumber > 0
                ? `Total: ${totalChunksNumber.toLocaleString()} chunks${
                    totalChunksNumber > renderLimit ? ` (showing first ${renderLimit})` : ''
                  }`
                : ' '}
            </div>
          </div>

          {chunksErr && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{chunksErr}</AlertDescription>
            </Alert>
          )}

          {chunksLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          )}

          {!chunksLoading && !chunksErr && chunkRows.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-muted-foreground text-sm">No chunks available yet.</div>
              </CardContent>
            </Card>
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

      {activeTab === 'health' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Retrieval History (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {historyErr && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{historyErr}</AlertDescription>
                </Alert>
              )}

              {historyLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-primary" />
                </div>
              )}

              <div className="bg-muted rounded-lg p-6">
                <div className="grid grid-cols-7 gap-3 max-w-[520px]">
                  {Array.from({ length: 35 }).map((_, i) => {
                    const idx = i - (35 - 30);
                    const v = idx >= 0 && idx < 30 ? daily[idx] : 0;
                    return (
                      <div
                        key={i}
                        className={`h-8 rounded ${heatClass(v)} border`}
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Staleness Indicator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <Ring days={daysOld} />
                <div className="mt-2 text-xs text-muted-foreground">
                  Last updated: {d.updated_at ? kbService.formatRelativeTime(d.updated_at) : '—'}
                </div>
                <div className="mt-1 text-xs">
                  <span className="text-muted-foreground">Status: </span>
                  <span className={`font-medium ${statusColor}`}>{statusText}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  Peak Retrieval Day (Past 30 Days)
                </div>
                <div className="text-3xl font-bold text-foreground">{peakDate ? formatShortMonthDay(peakDate) : '—'}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  Avg Daily Retrievals (Past 30 Days)
                </div>
                <div className="text-3xl font-bold text-foreground">{avgDaily.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  Retrieval Trend (Past 30 Days)
                </div>
                <div className={`text-3xl font-bold ${trendPct >= 0 ? 'text-status-success' : 'text-status-danger'}`}>
                  {trendPct >= 0 ? `↑ ${trendPct}%` : `↓ ${Math.abs(trendPct)}%`}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'document-view' && (
        <div className="space-y-6">
          {heatmapErr && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{heatmapErr}</AlertDescription>
            </Alert>
          )}

          {viewErr && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{viewErr}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base">Document Retrieval Heatmap</CardTitle>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div>
                    Page {page} of {pageCount}
                  </div>

                  <div className="text-xs text-muted-foreground/80">
                    {heatmapLoading
                      ? 'Loading page activity…'
                      : `Page activity: ${
                          currentPageRetrievals > 0
                            ? `${currentPageRetrievals.toLocaleString()} retrievals`
                            : 'no retrievals yet'
                        }`}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      title="Previous page"
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                      disabled={page >= pageCount}
                      title="Next page"
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted rounded-lg p-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-foreground/80" />
                  High Retrieval (hottest pages for this document)
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-foreground/50" />
                  Medium Retrieval (above-average activity)
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-foreground/25" />
                  Low Retrieval (some retrievals recorded)
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-muted border" />
                  Not Retrieved (no activity yet)
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4">
                {viewLoading && (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 size={28} className="animate-spin text-primary" />
                  </div>
                )}

                {!viewLoading && viewUrl && (
                  <div className="relative rounded-lg overflow-hidden border bg-background">
                    <iframe title="document-viewer" src={viewUrl} className="w-full h-[650px]" />
                    {overlayAlpha > 0 && (
                      <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background: `radial-gradient(circle at 50% 30%, rgba(239,68,68,${overlayAlpha}), rgba(59,130,246,${overlayAlpha * 0.5}))`,
                          mixBlendMode: 'multiply',
                        }}
                      />
                    )}
                  </div>
                )}

                {!viewLoading && !viewUrl && (
                  <div className="text-sm text-muted-foreground p-4">
                    Document viewer needs a backend URL (signed/proxy URL).
                    <div className="mt-3 text-xs text-muted-foreground/70">
                      Implement <code className="text-foreground/80">kbService.getDocumentViewUrl(kb_id, document_id)</code> and
                      return <code className="text-foreground/80">{`{ url, page_count }`}</code>.
                    </div>
                  </div>
                )}

                {!viewLoading && viewUrl && heatmapLoadedOnce && (heatmap?.max_retrievals ?? 0) === 0 && (
                  <div className="mt-3 text-xs text-muted-foreground/80">
                    No retrievals recorded yet for this document. The heatmap overlay will update after it is used in answers.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Override Processing Strategy</DialogTitle>
            <DialogDescription>
              Current strategy: <span className="text-foreground/90">{d.processing_strategy ?? 'pdf_auto'}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[55vh] overflow-auto pr-1">
            {(strategyOptions.length ? strategyOptions : [
              { key: 'semantic', label: 'Semantic (Essay/Policy)', description: 'Paragraph-oriented semantic chunking for narrative documents.' },
              { key: 'pdf_auto', label: 'Auto (Default)', description: 'General-purpose PDF parsing.' },
            ]).map((option) => {
              const isSelected = selectedStrategy === option.key;
              return (
                <label
                  key={option.key}
                  className={`block rounded-lg border p-4 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-border bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="strategy-option"
                      value={option.key}
                      checked={selectedStrategy === option.key}
                      onChange={() => setSelectedStrategy(option.key)}
                      className="mt-1 accent-primary"
                    />
                    <div>
                      <div className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {option.label}
                      </div>
                      <div className={`text-xs mt-1 ${isSelected ? 'text-primary/70' : 'text-muted-foreground'}`}>
                        {option.description}
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideOpen(false)} disabled={overrideBusy}>
              Cancel
            </Button>
            <Button onClick={handleApplyOverrideStrategy} disabled={overrideBusy}>
              {overrideBusy ? <Loader2 size={14} className="animate-spin" /> : <Settings2 size={14} />}
              Apply and Reprocess
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteModal} onOpenChange={(open) => !actionBusy && setShowDeleteModal(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="items-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/15 border border-destructive/25 flex items-center justify-center text-destructive">
              <AlertCircle size={20} />
            </div>
            <DialogTitle className="text-xl text-center">Delete Document?</DialogTitle>
            <DialogDescription className="text-center">
              You are about to delete <span className="text-foreground/90 font-medium">"{title}"</span>
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertDescription className="space-y-2 text-sm">
              <div className="flex gap-2">
                <span className="mt-[2px]">•</span>
                <span>
                  This document will be permanently removed from the SQL database and Qdrant vector store (and source storage if wired).
                </span>
              </div>
              <div className="flex gap-2 text-status-warning">
                <span className="mt-[2px]">•</span>
                <span>
                  If your KB sync configuration still exists, the next sync may re-add the file from the source.
                </span>
              </div>
            </AlertDescription>
          </Alert>

          <DialogFooter className="flex-row gap-3 sm:gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDeleteModal(false)}
              disabled={actionBusy}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              className="flex-1"
              onClick={confirmDelete}
              disabled={actionBusy}
            >
              {actionBusy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <Alert
            variant={toast.kind === 'err' ? 'destructive' : 'default'}
            className={toast.kind === 'ok' ? 'border-status-success/20 bg-status-success/10 text-status-success' : ''}
          >
            {toast.kind === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>{toast.msg}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default DocumentDetails;
