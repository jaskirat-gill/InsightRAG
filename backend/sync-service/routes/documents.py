from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, timedelta
import hashlib
import logging
import os
import json
from botocore.exceptions import ClientError

import boto3
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue

from database import get_db, Database
from middleware.auth import get_current_active_user
from middleware.permissions import require_permission
from utils.kb_access import require_kb_manage_access, require_kb_read_access, user_can_manage_kb

logger = logging.getLogger("sync_service.documents")

QDRANT_URL = os.getenv("QDRANT_URL", "http://qdrant:6333")
COLLECTION_NAME = "document_chunks"
DOWNLOAD_BASE = os.getenv("DOWNLOAD_BASE", "/data/downloads")

try:
    from celery_app import celery_app
    CELERY_AVAILABLE = True
except ImportError:
    celery_app = None
    CELERY_AVAILABLE = False

S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME") or os.getenv("AWS_S3_BUCKET")  # support either name
AWS_REGION = os.getenv("AWS_REGION") or "us-east-1"

router = APIRouter(prefix="/knowledge-bases", tags=["Documents"])

_s3 = None

def get_s3_client():
    global _s3
    if _s3 is None:
        _s3 = boto3.client(
            "s3",
            region_name=AWS_REGION,
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        )
    return _s3

class DocumentResponse(BaseModel):
    document_id: UUID
    kb_id: UUID
    source_path: str
    document_type: Optional[str]
    title: Optional[str]
    file_size_bytes: Optional[int]
    processing_strategy: Optional[str] = None
    processing_status: str
    total_chunks: int
    health_score: int
    retrieval_count: int = 0
    last_retrieved_at: Optional[datetime] = None
    avg_chunk_size_tokens: Optional[int] = None
    avg_chunk_size_chars: Optional[int] = None
    preview_text: Optional[str] = None
    view_url: Optional[str] = None
    view_page_count: Optional[int] = None
    created_at: datetime


class ChunkResponse(BaseModel):
    chunk_id: UUID
    document_id: UUID
    kb_id: UUID
    chunk_index: int
    chunk_text: str
    chunk_tokens: Optional[int] = None
    vector_id: Optional[str] = None
    section_title: Optional[str] = None
    page_number: Optional[int] = None
    retrieval_count: int = 0
    last_retrieved_at: Optional[datetime] = None
    created_at: datetime


class RetrievalDayResponse(BaseModel):
    date: date
    retrieval_count: int


class DocumentRetrievalHistoryResponse(BaseModel):
    days: int
    series: List[RetrievalDayResponse]
    total_retrievals: int
    peak_day: Optional[date] = None
    peak_count: int = 0
    avg_daily_retrievals: float = 0.0
    trend_pct: float = 0.0
    last7_total: int = 0
    prev7_total: int = 0

class DocumentStrategyOption(BaseModel):
    key: str
    label: str
    description: str


class DocumentStrategyResponse(BaseModel):
    current_strategy: Optional[str] = None
    current_strategy_label: str
    options: List[DocumentStrategyOption]


class OverrideDocumentStrategyRequest(BaseModel):
    strategy: str


PDF_STRATEGY_OPTIONS: List[DocumentStrategyOption] = [
    DocumentStrategyOption(
        key="semantic",
        label="Semantic (Essay/Policy)",
        description="Paragraph-oriented semantic chunking for narrative documents.",
    ),
    DocumentStrategyOption(
        key="pdf_auto",
        label="Auto (Default)",
        description="Uses automatic PDF partition strategy with general-purpose settings.",
    ),
    DocumentStrategyOption(
        key="pdf_table_heavy",
        label="Table Heavy",
        description="Optimized for table extraction from dense tabular PDFs.",
    ),
    DocumentStrategyOption(
        key="pdf_multicolumn",
        label="Multi-Column",
        description="Optimized for 2/3-column PDFs to preserve reading order.",
    ),
    DocumentStrategyOption(
        key="pdf_dataviz_heavy",
        label="Data Visualization Heavy",
        description="Optimized for chart/image-heavy PDFs while retaining table signals.",
    ),
]
PDF_STRATEGY_KEYS = {o.key for o in PDF_STRATEGY_OPTIONS}

# Chunk strategies available for non-PDF document override.
CHUNK_STRATEGY_OPTIONS: List[DocumentStrategyOption] = [
    DocumentStrategyOption(
        key="semantic",
        label="Semantic",
        description="Paragraph-oriented semantic chunking for narrative documents.",
    ),
    DocumentStrategyOption(
        key="section-aware",
        label="Section-Aware",
        description="Splits at heading/title boundaries, never mid-section.",
    ),
    DocumentStrategyOption(
        key="table-preserving",
        label="Table-Preserving",
        description="Keeps each table intact; splits only at row boundaries.",
    ),
    DocumentStrategyOption(
        key="slide-per-chunk",
        label="Slide-per-Chunk",
        description="One chunk per slide, preserves slide number metadata.",
    ),
]
_CHUNK_STRATEGY_KEYS = {o.key for o in CHUNK_STRATEGY_OPTIONS}

# Mirrors processing/strategy_selector.py COMPATIBLE_CHUNK_STRATEGIES.
# sync-service can't import from document-processing-engine directly.
_UNIVERSAL_CHUNK = ["semantic", "section-aware", "table-preserving"]
_COMPATIBLE_CHUNK_STRATEGIES: dict = {
    ".csv":  _UNIVERSAL_CHUNK,
    ".tsv":  _UNIVERSAL_CHUNK,
    ".xlsx": _UNIVERSAL_CHUNK,
    ".xls":  _UNIVERSAL_CHUNK,
    ".pptx": ["slide-per-chunk"] + _UNIVERSAL_CHUNK,
    ".ppt":  ["slide-per-chunk"] + _UNIVERSAL_CHUNK,
    ".docx": _UNIVERSAL_CHUNK,
    ".doc":  _UNIVERSAL_CHUNK,
    ".md":   _UNIVERSAL_CHUNK,
    ".html": _UNIVERSAL_CHUNK,
    ".htm":  _UNIVERSAL_CHUNK,
}

class PageHeatmapBin(BaseModel):
    page_number: int
    raw_retrievals: int
    normalized_score: float


class DocumentHeatmapResponse(BaseModel):
    document_id: UUID
    kb_id: UUID
    max_retrievals: int
    bins: List[PageHeatmapBin]


class DocumentViewResponse(BaseModel):
    url: str
    page_count: Optional[int] = None


async def _ensure_daily_retrieval_table(db: Database) -> None:
    await db.execute(
        """
        CREATE TABLE IF NOT EXISTS document_retrieval_daily (
            document_id UUID REFERENCES documents(document_id) ON DELETE CASCADE,
            retrieval_date DATE NOT NULL,
            retrieval_count INTEGER NOT NULL DEFAULT 0,
            last_retrieved_at TIMESTAMP,
            PRIMARY KEY (document_id, retrieval_date)
        )
        """
    )
    await db.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_doc_retrieval_daily_date
        ON document_retrieval_daily(retrieval_date)
        """
    )


async def _resolve_document_local_path(
    db: Database,
    source_path: str,
) -> Optional[str]:
    if source_path.startswith("/") and os.path.exists(source_path):
        return source_path

    synced = await db.fetch_one(
        """
        SELECT plugin_id
        FROM synced_file
        WHERE file_path = $1 AND status != 'deleted'
        ORDER BY updated_at DESC
        LIMIT 1
        """,
        source_path,
    )
    if synced:
        synced_data = dict(synced)
        if synced_data.get("plugin_id") is None:
            return None
        candidate = os.path.join(DOWNLOAD_BASE, str(synced_data["plugin_id"]), source_path)
        if os.path.exists(candidate):
            return candidate

    return None

# List documents in KB
@router.get("/{kb_id}/documents", response_model=List[DocumentResponse])
async def list_documents(
    kb_id: UUID,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_active_user),
    db: Database = Depends(get_db)
):
    """List all documents in a knowledge base"""
    await require_kb_read_access(db, current_user, str(kb_id))
    
    docs = await db.fetch_all("""
        SELECT
            d.document_id,
            d.kb_id,
            d.source_path,
            d.document_type,
            d.title,
            d.file_size_bytes,
            d.processing_strategy,
            d.processing_status,
            d.total_chunks,
            d.health_score,
            COALESCE(cm.total_retrievals, 0)::INT AS retrieval_count,
            cm.last_retrieved_at,
            cm.avg_chunk_size_tokens,
            cm.avg_chunk_size_chars,
            d.created_at
        FROM documents d
        LEFT JOIN (
            SELECT
                document_id,
                COALESCE(SUM(retrieval_count), 0) AS total_retrievals,
                MAX(last_retrieved_at) AS last_retrieved_at,
                ROUND(AVG(chunk_tokens))::INT AS avg_chunk_size_tokens,
                ROUND(AVG(CHAR_LENGTH(chunk_text)))::INT AS avg_chunk_size_chars
            FROM chunk_metadata
            WHERE kb_id = $1
            GROUP BY document_id
        ) cm ON cm.document_id = d.document_id
        WHERE d.kb_id = $1
        ORDER BY d.created_at DESC
        LIMIT $2 OFFSET $3
    """, str(kb_id), limit, skip)
    
    return [DocumentResponse(**dict(d)) for d in docs]

# Upload document (for MVP - manual upload)
@router.post("/{kb_id}/documents/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    kb_id: UUID,
    file: UploadFile = File(...),
    current_user: dict = require_permission("kb.update"),
    db: Database = Depends(get_db)
):
    """Upload a document to knowledge base (MVP - triggers processing)"""
    await require_kb_manage_access(db, current_user, str(kb_id))
    
    # Read file
    content = await file.read()
    file_size = len(content)
    file_hash = hashlib.sha256(content).hexdigest()
    
    # Save to local storage (MVP - just save locally)
    import os
    os.makedirs("/tmp/kb_uploads", exist_ok=True)
    local_path = f"/tmp/kb_uploads/{kb_id}/{file.filename}"
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    
    with open(local_path, "wb") as f:
        f.write(content)
    
    # Get file extension
    file_ext = os.path.splitext(file.filename)[1].lower().replace(".", "")
    
    # Create document record
    doc = await db.fetch_one("""
        INSERT INTO documents (
            kb_id, source_path, document_type, title,
            file_size_bytes, file_hash, processing_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING *
    """, 
        str(kb_id),
        local_path,
        file_ext,
        file.filename,
        file_size,
        file_hash
    )
    
    # TODO: Trigger processing (for now, just return)
    # In real implementation: send to Celery or call processing function

    return DocumentResponse(**dict(doc))

# Get document details
@router.get("/{kb_id}/documents/{doc_id}", response_model=DocumentResponse)
async def get_document(
    kb_id: UUID,
    doc_id: UUID,
    current_user: dict = Depends(get_current_active_user),
    db: Database = Depends(get_db)
):
    """Get document details"""
    await require_kb_read_access(db, current_user, str(kb_id))

    doc = await db.fetch_one(
        """
        SELECT
            d.document_id,
            d.kb_id,
            d.source_path,
            d.document_type,
            d.title,
            d.file_size_bytes,
            d.processing_strategy,
            d.processing_status,
            d.total_chunks,
            d.health_score,
            COALESCE(cm.total_retrievals, 0)::INT AS retrieval_count,
            cm.last_retrieved_at,
            cm.avg_chunk_size_tokens,
            cm.avg_chunk_size_chars,
            preview.preview_text,
            d.created_at
        FROM documents d
        LEFT JOIN (
            SELECT
                document_id,
                COALESCE(SUM(retrieval_count), 0) AS total_retrievals,
                MAX(last_retrieved_at) AS last_retrieved_at,
                ROUND(AVG(chunk_tokens))::INT AS avg_chunk_size_tokens,
                ROUND(AVG(CHAR_LENGTH(chunk_text)))::INT AS avg_chunk_size_chars
            FROM chunk_metadata
            WHERE kb_id = $1
            GROUP BY document_id
        ) cm ON cm.document_id = d.document_id
        LEFT JOIN LATERAL (
            SELECT string_agg(pre.chunk_text, E'\n\n' ORDER BY pre.chunk_index) AS preview_text
            FROM (
                SELECT chunk_text, chunk_index
                FROM chunk_metadata
                WHERE document_id = d.document_id
                ORDER BY chunk_index
                LIMIT 3
            ) pre
        ) preview ON TRUE
        WHERE d.document_id = $2 AND d.kb_id = $1
        """,
        str(kb_id), str(doc_id)
    )
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return DocumentResponse(**dict(doc))

@router.get("/{kb_id}/documents/{doc_id}/s3-url")
async def get_document_s3_url(
    kb_id: UUID,
    doc_id: UUID,
    current_user: dict = Depends(get_current_active_user),
    db: Database = Depends(get_db),
):
    """
    Return a presigned S3 URL for this document.
    Assumes documents.source_path stores the S3 key (e.g. 'Test/Qdrant Schema.png')
    and S3 bucket is provided via env S3_BUCKET_NAME.
    """
    await require_kb_read_access(db, current_user, str(kb_id))

    doc = await db.fetch_one(
        "SELECT source_path FROM documents WHERE document_id = $1 AND kb_id = $2",
        str(doc_id), str(kb_id),
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not S3_BUCKET_NAME:
        raise HTTPException(status_code=500, detail="S3_BUCKET_NAME is not configured")

    # treat source_path as key
    s3_key = str(doc["source_path"]).lstrip("/")
    try:
        url = get_s3_client().generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": S3_BUCKET_NAME, "Key": s3_key},
            ExpiresIn=300,
        )
        return {"url": url}
    except ClientError as e:
        logger.exception("Failed to generate presigned url: %s", e)
        raise HTTPException(status_code=500, detail="Failed to generate S3 URL")

@router.get("/{kb_id}/documents/{doc_id}/strategy", response_model=DocumentStrategyResponse)
async def get_document_strategy(
    kb_id: UUID,
    doc_id: UUID,
    current_user: dict = Depends(get_current_active_user),
    db: Database = Depends(get_db),
):
    await require_kb_read_access(db, current_user, str(kb_id))

    doc = await db.fetch_one(
        """
        SELECT document_id, document_type, source_path, processing_strategy
        FROM documents
        WHERE document_id = $1 AND kb_id = $2
        """,
        str(doc_id), str(kb_id),
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc_data = dict(doc)

    strategy = doc_data.get("processing_strategy")
    doc_type = (doc_data.get("document_type") or "").lower()

    if doc_type == "pdf":
        strategy_label = next((o.label for o in PDF_STRATEGY_OPTIONS if o.key == strategy), "Auto (Default)")
        return DocumentStrategyResponse(
            current_strategy=strategy,
            current_strategy_label=strategy_label,
            options=PDF_STRATEGY_OPTIONS,
        )

    # Non-PDF: return compatible chunk strategies for this file type.
    source_path = doc_data.get("source_path") or ""
    ext = os.path.splitext(source_path)[1].lower()
    compatible_keys = _COMPATIBLE_CHUNK_STRATEGIES.get(ext, ["semantic"])
    options = [o for o in CHUNK_STRATEGY_OPTIONS if o.key in compatible_keys]
    strategy_label = next((o.label for o in options if o.key == strategy), strategy or "Auto (Default)")

    return DocumentStrategyResponse(
        current_strategy=strategy,
        current_strategy_label=strategy_label,
        options=options,
    )


@router.post("/{kb_id}/documents/{doc_id}/strategy/override", status_code=202)
async def override_document_strategy(
    kb_id: UUID,
    doc_id: UUID,
    body: OverrideDocumentStrategyRequest,
    current_user: dict = require_permission("kb.update"),
    db: Database = Depends(get_db),
):
    if not CELERY_AVAILABLE:
        raise HTTPException(status_code=503, detail="Document worker queue is unavailable")

    await require_kb_manage_access(db, current_user, str(kb_id))

    doc = await db.fetch_one(
        """
        SELECT document_id, kb_id, source_path, document_type, file_size_bytes
        FROM documents
        WHERE document_id = $1 AND kb_id = $2
        """,
        str(doc_id), str(kb_id),
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc_data = dict(doc)

    doc_type = (doc_data.get("document_type") or "").lower()
    if doc_type == "pdf":
        if body.strategy not in PDF_STRATEGY_KEYS:
            raise HTTPException(status_code=400, detail="Unknown PDF strategy")
    else:
        source_path = doc_data.get("source_path") or ""
        ext = os.path.splitext(source_path)[1].lower()
        compatible_keys = _COMPATIBLE_CHUNK_STRATEGIES.get(ext, ["semantic"])
        if body.strategy not in compatible_keys:
            raise HTTPException(
                status_code=400,
                detail=f"Strategy '{body.strategy}' is not compatible with {ext or 'this'} files. "
                       f"Compatible strategies: {', '.join(compatible_keys)}",
            )

    synced = await db.fetch_one(
        """
        SELECT plugin_id, etag, file_size
        FROM synced_file
        WHERE file_path = $1 AND status != 'deleted'
        ORDER BY updated_at DESC
        LIMIT 1
        """,
        doc_data["source_path"],
    )
    if not synced:
        raise HTTPException(status_code=409, detail="Cannot locate source plugin mapping for this document")
    synced_data = dict(synced)

    plugin = await db.fetch_one(
        """
        SELECT id, name
        FROM source_plugin_config
        WHERE id = $1
        """,
        synced_data["plugin_id"],
    )
    if not plugin:
        raise HTTPException(status_code=409, detail="Source plugin is missing for this document")
    plugin_data = dict(plugin)

    local_path = await _resolve_document_local_path(
        db=db,
        source_path=doc_data["source_path"],
    )
    if not local_path:
        raise HTTPException(
            status_code=409,
            detail="Local document file not found. Run sync first, then retry strategy override.",
        )

    await db.execute(
        """
        UPDATE documents
        SET processing_status = 'processing',
            processing_strategy = $3,
            processing_error = NULL,
            updated_at = NOW()
        WHERE document_id = $1 AND kb_id = $2
        """,
        str(doc_id), str(kb_id), body.strategy,
    )

    payload = {
        "plugin_id": int(synced_data["plugin_id"]),
        "plugin_name": plugin_data["name"],
        "file_path": doc_data["source_path"],
        "local_path": local_path,
        "file_size": doc_data.get("file_size_bytes") or synced_data.get("file_size"),
        "etag": synced_data.get("etag"),
        "kb_id": str(kb_id),
        "document_id": str(doc_id),
    }
    if doc_type == "pdf":
        payload["parse_profile"] = body.strategy
    else:
        payload["chunk_strategy"] = body.strategy
    celery_app.send_task("process_document", args=[payload])

    return {
        "message": f"Reprocessing queued with strategy '{body.strategy}'",
        "document_id": str(doc_id),
        "kb_id": str(kb_id),
        "strategy": body.strategy,
        "status": "processing",
    }


@router.get("/{kb_id}/documents/{doc_id}/chunks", response_model=List[ChunkResponse])
async def list_document_chunks(
    kb_id: UUID,
    doc_id: UUID,
    skip: int = 0,
    limit: int = 500,
    current_user: dict = Depends(get_current_active_user),
    db: Database = Depends(get_db),
):
    """List chunk metadata (including retrieval stats) for a document."""
    await require_kb_read_access(db, current_user, str(kb_id))

    doc_exists = await db.fetch_one(
        "SELECT document_id FROM documents WHERE document_id = $1 AND kb_id = $2",
        str(doc_id), str(kb_id)
    )
    if not doc_exists:
        raise HTTPException(status_code=404, detail="Document not found")

    rows = await db.fetch_all(
        """
        SELECT
            chunk_id,
            document_id,
            kb_id,
            chunk_index,
            chunk_text,
            chunk_tokens,
            vector_id,
            section_title,
            page_number,
            retrieval_count,
            last_retrieved_at,
            created_at
        FROM chunk_metadata
        WHERE kb_id = $1 AND document_id = $2
        ORDER BY chunk_index ASC
        LIMIT $3 OFFSET $4
        """,
        str(kb_id), str(doc_id), limit, skip
    )

    return [ChunkResponse(**dict(r)) for r in rows]


@router.get(
    "/{kb_id}/documents/{doc_id}/retrieval-history",
    response_model=DocumentRetrievalHistoryResponse,
)
async def get_document_retrieval_history(
    kb_id: UUID,
    doc_id: UUID,
    days: int = 30,
    current_user: dict = Depends(get_current_active_user),
    db: Database = Depends(get_db),
):
    """Return per-day retrieval counts and summary metrics for one document."""
    window_days = max(1, min(days, 365))
    await require_kb_read_access(db, current_user, str(kb_id))

    doc_exists = await db.fetch_one(
        "SELECT document_id FROM documents WHERE document_id = $1 AND kb_id = $2",
        str(doc_id), str(kb_id)
    )
    if not doc_exists:
        raise HTTPException(status_code=404, detail="Document not found")

    await _ensure_daily_retrieval_table(db)

    rows = await db.fetch_all(
        """
        SELECT retrieval_date, retrieval_count
        FROM document_retrieval_daily
        WHERE document_id = $1
          AND retrieval_date >= CURRENT_DATE - ($2::int - 1) * INTERVAL '1 day'
        ORDER BY retrieval_date ASC
        """,
        str(doc_id), window_days
    )

    row_map = {r["retrieval_date"]: int(r["retrieval_count"]) for r in rows}
    end_day = date.today()
    start_day = end_day - timedelta(days=window_days - 1)

    series: List[RetrievalDayResponse] = []
    counts: List[int] = []
    cur = start_day
    while cur <= end_day:
        count = row_map.get(cur, 0)
        series.append(RetrievalDayResponse(date=cur, retrieval_count=count))
        counts.append(count)
        cur += timedelta(days=1)

    total = sum(counts)

    if counts:
        peak_count = max(counts)
        peak_idx = counts.index(peak_count)
        peak_day = series[peak_idx].date
    else:
        peak_count = 0
        peak_day = None

    avg_daily = float(total) / float(window_days)

    last7 = counts[-7:] if len(counts) >= 7 else counts
    prev7 = counts[-14:-7] if len(counts) >= 14 else []
    last7_total = sum(last7)
    prev7_total = sum(prev7)
    if prev7_total > 0:
        trend_pct = ((last7_total - prev7_total) / prev7_total) * 100.0
    else:
        trend_pct = 0.0

    return DocumentRetrievalHistoryResponse(
        days=window_days,
        series=series,
        total_retrievals=total,
        peak_day=peak_day,
        peak_count=peak_count,
        avg_daily_retrievals=avg_daily,
        trend_pct=trend_pct,
        last7_total=last7_total,
        prev7_total=prev7_total,
    )


@router.get(
    "/{kb_id}/documents/{doc_id}/heatmap",
    response_model=DocumentHeatmapResponse,
)
async def get_document_heatmap(
    kb_id: UUID,
    doc_id: UUID,
    current_user: dict = Depends(get_current_active_user),
    db: Database = Depends(get_db),
):
    """
    Return per-page retrieval heatmap data for one document.

    Aggregates chunk_metadata.retrieval_count by page_number for the given
    document, then normalizes per document so that the hottest page has
    normalized_score = 1.0. Pages with no retrievals have score 0.0.
    """

    await require_kb_read_access(db, current_user, str(kb_id))

    doc_exists = await db.fetch_one(
        "SELECT document_id FROM documents WHERE document_id = $1 AND kb_id = $2",
        str(doc_id),
        str(kb_id),
    )
    if not doc_exists:
        raise HTTPException(status_code=404, detail="Document not found")

    rows = await db.fetch_all(
        """
        SELECT
            COALESCE(page_number, 1) AS page_number,
            COALESCE(SUM(retrieval_count), 0)::INT AS page_retrievals
        FROM chunk_metadata
        WHERE kb_id = $1
          AND document_id = $2
        GROUP BY COALESCE(page_number, 1)
        ORDER BY page_number ASC
        """,
        str(kb_id),
        str(doc_id),
    )

    bins: List[PageHeatmapBin] = []
    max_retrievals = 0

    for r in rows:
        page_retrievals = int(r["page_retrievals"])
        if page_retrievals > max_retrievals:
            max_retrievals = page_retrievals

    if max_retrievals <= 0:
        for r in rows:
            bins.append(
                PageHeatmapBin(
                    page_number=int(r["page_number"]),
                    raw_retrievals=int(r["page_retrievals"]),
                    normalized_score=0.0,
                )
            )
        return DocumentHeatmapResponse(
            document_id=doc_id,
            kb_id=kb_id,
            max_retrievals=0,
            bins=bins,
        )

    for r in rows:
        page_retrievals = int(r["page_retrievals"])
        score = float(page_retrievals) / float(max_retrievals)
        bins.append(
            PageHeatmapBin(
                page_number=int(r["page_number"]),
                raw_retrievals=page_retrievals,
                normalized_score=score,
            )
        )

    return DocumentHeatmapResponse(
        document_id=doc_id,
        kb_id=kb_id,
        max_retrievals=max_retrievals,
        bins=bins,
    )


@router.get(
    "/{kb_id}/documents/{doc_id}/view",
    response_model=DocumentViewResponse,
)
async def get_document_view_url(
    kb_id: UUID,
    doc_id: UUID,
    current_user: dict = Depends(get_current_active_user),
    db: Database = Depends(get_db),
):
    """
    Return a signed/proxy URL for viewing the original document.

    For S3-backed knowledge bases, this generates a short-lived pre-signed
    URL for the document's S3 object. For other providers, the raw
    source_path is returned as-is, assuming it is directly accessible.
    Also returns an approximate page_count derived from chunk_metadata.
    """
    logger.info(f"Getting document view URL for document {doc_id} in KB {kb_id}")
    kb = await require_kb_read_access(db, current_user, str(kb_id))

    doc = await db.fetch_one(
        """
        SELECT source_path, document_type
        FROM documents
        WHERE document_id = $1 AND kb_id = $2
        """,
        str(doc_id),
        str(kb_id),
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    source_path: str = doc["source_path"]
    storage_provider = kb.get("storage_provider", "s3")

    raw_cfg = kb.get("storage_config")
    if isinstance(raw_cfg, dict):
        storage_config = raw_cfg
    elif isinstance(raw_cfg, str):
        try:
            storage_config = json.loads(raw_cfg)
        except Exception:
            storage_config = {}
    else:
        storage_config = {}

    url = source_path

    # Generate a pre-signed S3 URL when possible.
    try:
        bucket: Optional[str] = None
        region: str = os.environ.get("AWS_REGION") or "us-east-1"
        key: str = source_path

        if storage_provider == "s3":
            logger.info("VIEW provider=s3 storage_config=%r", storage_config)
            bucket = storage_config.get("bucket_name")
            region = storage_config.get("region") or region

            if source_path.startswith("s3://"):
                _, rest = source_path.split("://", 1)
                bucket_from_path, key_part = rest.split("/", 1)
                bucket = bucket or bucket_from_path
                key = key_part
            else:
                key = source_path.lstrip("/")

        elif storage_provider == "plugin":
            # Mirror plugin-based storage: resolve S3 settings from SourcePluginConfig.
            plugin_row = await db.fetch_one(
                """
                SELECT spc.config, sf.file_path
                FROM source_plugin_config spc
                JOIN synced_file sf ON sf.plugin_id = spc.id
                WHERE sf.file_path = $1
                ORDER BY sf.last_seen_at DESC
                LIMIT 1
                """,
                source_path,
            )
            if plugin_row:
                raw_plugin_cfg = plugin_row["config"]
                if isinstance(raw_plugin_cfg, dict):
                    plugin_cfg = raw_plugin_cfg
                else:
                    try:
                        plugin_cfg = json.loads(raw_plugin_cfg)
                    except Exception:
                        plugin_cfg = {}

                logger.info("VIEW provider=plugin plugin_cfg=%r", plugin_cfg)

                bucket = plugin_cfg.get("bucket_name") or plugin_cfg.get("bucket")
                region = plugin_cfg.get("region_name") or plugin_cfg.get("region") or region
                key = str(plugin_row["file_path"]).lstrip("/")

        # Fall back: if storage_provider is something else, but source_path looks like s3://bucket/key
        if bucket is None and source_path.startswith("s3://"):
            _, rest = source_path.split("://", 1)
            bucket_from_path, key_part = rest.split("/", 1)
            bucket = bucket_from_path
            key = key_part

        if bucket:
            s3_client = boto3.client("s3", region_name=region)
            url = s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket, "Key": key},
                ExpiresIn=3600,
            )
            logger.info(
                "Generated S3 presigned URL for doc %s (bucket=%s, key=%s, region=%s)",
                doc_id,
                bucket,
                key,
                region,
            )
        else:
            logger.info(
                "VIEW: no bucket resolved for doc %s (provider=%s, source_path=%s)",
                doc_id,
                storage_provider,
                source_path,
            )
    except Exception as exc:
        logger.warning("Failed to generate S3 pre-signed URL for document %s: %s", doc_id, exc)
        # Fallback: leave url as source_path (may or may not be browser-accessible).

    # Derive page count from chunk_metadata if available.
    page_row = await db.fetch_one(
        """
        SELECT MAX(page_number) AS max_page
        FROM chunk_metadata
        WHERE document_id = $1 AND kb_id = $2
        """,
        str(doc_id),
        str(kb_id),
    )
    max_page = page_row["max_page"] if page_row and page_row["max_page"] is not None else 1

    try:
        page_count = int(max_page)
        if page_count <= 0:
            page_count = 1
    except (TypeError, ValueError):
        page_count = 1

    return DocumentViewResponse(url=url, page_count=page_count)

# Delete document
@router.delete("/{kb_id}/documents/{doc_id}", status_code=204)
async def delete_document(
    kb_id: UUID,
    doc_id: UUID,
    current_user: dict = require_permission("doc.delete"),
    db: Database = Depends(get_db),
):
    """Delete a document (SQL + Qdrant + S3)."""
    await require_kb_manage_access(db, current_user, str(kb_id))

    doc = await db.fetch_one(
        "SELECT source_path FROM documents WHERE document_id = $1 AND kb_id = $2",
        str(doc_id), str(kb_id),
    )
    if not doc:
        return None  # idempotent delete (204)

    # 1. Delete Qdrant points for this doc
    try:
        qdrant = QdrantClient(url=QDRANT_URL)
        qdrant.delete(
            collection_name=COLLECTION_NAME,
            points_selector=Filter(
                must=[FieldCondition(key="document_id", match=MatchValue(value=str(doc_id)))]
            ),
        )
    except Exception as e:
        # Don't block deletion if qdrant fails
        logger.warning("Qdrant delete failed for doc %s: %s", doc_id, e)

    # 2. Delete S3 object (best-effort)
    if S3_BUCKET_NAME:
        try:
            s3_key = str(doc["source_path"]).lstrip("/")
            get_s3_client().delete_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
        except Exception as e:
            logger.warning("S3 delete failed for doc %s: %s", doc_id, e)

    # 3. Delete SQL rows (documents table; chunks should cascade if FK is set)
    await db.execute(
        "DELETE FROM documents WHERE document_id = $1 AND kb_id = $2",
        str(doc_id), str(kb_id),
    )

    return None

# Reassign documents to a different KB
class ReassignItem(BaseModel):
    document_id: UUID
    to_kb_id: UUID

@router.post("/{from_kb_id}/reassign")
async def reassign_documents(
    from_kb_id: UUID,
    items: List[ReassignItem],
    current_user: dict = require_permission("kb.update"),
    db: Database = Depends(get_db),
):
    """
    Move one or more documents from from_kb_id to their respective target KBs.
    Updates:
      1. documents.kb_id          (PostgreSQL)
      2. chunk_metadata.kb_id     (PostgreSQL)
      3. kb_id payload field      (Qdrant — all vectors for that document)
    Also refreshes total_documents on affected KBs.
    """
    if not items:
        return {"reassigned": 0}

    await require_kb_manage_access(db, current_user, str(from_kb_id))

    qdrant = QdrantClient(url=QDRANT_URL)
    reassigned = 0

    for item in items:
        doc_id = str(item.document_id)
        to_kb_id = str(item.to_kb_id)

        # Verify the target KB exists
        target_exists = await db.fetch_one(
            "SELECT kb_id FROM knowledge_bases WHERE kb_id = $1", to_kb_id
        )
        if not target_exists:
            logger.warning("Skipping reassign — target KB %s not found", to_kb_id)
            continue
        if not await user_can_manage_kb(db, current_user, to_kb_id):
            logger.warning("Skipping reassign — caller cannot manage target KB %s", to_kb_id)
            continue

        # 1. Update documents table
        await db.execute(
            """
            UPDATE documents
            SET kb_id = $1, updated_at = NOW()
            WHERE document_id = $2 AND kb_id = $3
            """,
            to_kb_id, doc_id, str(from_kb_id),
        )

        # 2. Update chunk_metadata table
        await db.execute(
            "UPDATE chunk_metadata SET kb_id = $1 WHERE document_id = $2",
            to_kb_id, doc_id,
        )

        # 3. Update kb_id payload on all Qdrant points for this document
        try:
            qdrant.set_payload(
                collection_name=COLLECTION_NAME,
                payload={"kb_id": to_kb_id},
                points=Filter(
                    must=[FieldCondition(key="document_id", match=MatchValue(value=doc_id))]
                ),
            )
            logger.info("Qdrant payload updated for doc %s -> KB %s", doc_id, to_kb_id)
        except Exception as e:
            # Postgres already updated — log but keep going
            logger.warning("Qdrant payload update failed for doc %s: %s", doc_id, e)

        reassigned += 1

    # Refresh total_documents and total_size_bytes on every affected KB
    affected_kb_ids = {str(from_kb_id)} | {str(item.to_kb_id) for item in items}
    for kb_id in affected_kb_ids:
        await db.execute(
            """
            UPDATE knowledge_bases
            SET total_documents = (
                SELECT COUNT(*) FROM documents
                WHERE kb_id = $1 AND processing_status = 'completed'
            ),
            total_size_bytes = (
                SELECT COALESCE(SUM(file_size_bytes), 0) FROM documents
                WHERE kb_id = $1 AND processing_status = 'completed'
            ),
            updated_at = NOW()
            WHERE kb_id = $1
            """,
            kb_id,
        )

    logger.info("Reassigned %d/%d documents from KB %s", reassigned, len(items), from_kb_id)
    return {"reassigned": reassigned}


# Simple search endpoint (MVP - keyword search)
@router.post("/{kb_id}/search")
async def search_kb(
    kb_id: UUID,
    query: str,
    top_k: int = 5,
    current_user: dict = require_permission("query.execute"),
    db: Database = Depends(get_db)
):
    """Search knowledge base (MVP - simple keyword search)"""
    await require_kb_read_access(db, current_user, str(kb_id))
    
    # Simple keyword search on chunk text
    results = await db.fetch_all("""
        SELECT 
            c.chunk_id,
            c.chunk_text,
            c.section_title,
            c.page_number,
            d.title as document_title,
            d.source_path,
            d.document_id
        FROM chunk_metadata c
        JOIN documents d ON c.document_id = d.document_id
        WHERE c.kb_id = $1 
        AND c.chunk_text ILIKE $2
        ORDER BY c.retrieval_count DESC
        LIMIT $3
    """, str(kb_id), f"%{query}%", top_k)
    
    # Update retrieval count
    for r in results:
        await db.execute("""
            UPDATE chunk_metadata 
            SET retrieval_count = retrieval_count + 1,
                last_retrieved_at = NOW()
            WHERE chunk_id = $1
        """, r["chunk_id"])
    
    return {
        "query": query,
        "kb_id": str(kb_id),
        "results": [dict(r) for r in results],
        "total_results": len(results)
    }
