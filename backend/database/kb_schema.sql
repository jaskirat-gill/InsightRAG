-- Knowledge Base Control Plane Schema
-- Run this AFTER init.sql

-- Knowledge Bases table
CREATE TABLE IF NOT EXISTS knowledge_bases (
    kb_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    storage_provider VARCHAR(50) NOT NULL DEFAULT 's3', -- 's3', 'gcs', 'azure', etc.
    storage_config JSONB NOT NULL, -- Provider-specific config
    processing_strategy VARCHAR(50) DEFAULT 'semantic', -- 'semantic', 'hierarchical', 'layout-aware', 'table-preserving'
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-ada-003',
    chunk_size INTEGER DEFAULT 512,
    chunk_overlap INTEGER DEFAULT 50,
    status VARCHAR(50) DEFAULT 'initializing', -- 'initializing', 'active', 'syncing', 'error', 'paused'
    health_score INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
    total_documents INTEGER DEFAULT 0,
    total_size_bytes BIGINT DEFAULT 0,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT kb_name_owner_unique UNIQUE (owner_id, name)
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kb_id UUID REFERENCES knowledge_bases(kb_id) ON DELETE CASCADE,
    source_path TEXT NOT NULL, -- S3 key or file path
    document_type VARCHAR(50), -- 'pdf', 'docx', 'html', etc.
    title VARCHAR(500),
    file_size_bytes BIGINT,
    file_hash VARCHAR(64), -- SHA-256 for change detection
    processing_strategy VARCHAR(50), -- Strategy used for this doc
    processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    processing_error TEXT,
    total_chunks INTEGER DEFAULT 0,
    health_score INTEGER DEFAULT 100,
    retrieval_count INTEGER DEFAULT 0, -- How often retrieved
    avg_similarity DECIMAL(3,2), -- Average similarity when retrieved
    last_retrieved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_at TIMESTAMP,
    CONSTRAINT doc_path_kb_unique UNIQUE (kb_id, source_path)
);

-- Chunk Metadata table
CREATE TABLE IF NOT EXISTS chunk_metadata (
    chunk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(document_id) ON DELETE CASCADE,
    kb_id UUID REFERENCES knowledge_bases(kb_id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL, -- Position in document
    chunk_text TEXT NOT NULL, -- Actual text content
    chunk_tokens INTEGER, -- Token count
    vector_id TEXT, -- ID in Qdrant
    section_title VARCHAR(500), -- Parent section/heading
    page_number INTEGER,
    health_score INTEGER DEFAULT 100,
    retrieval_count INTEGER DEFAULT 0,
    last_retrieved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chunk_doc_index_unique UNIQUE (document_id, chunk_index)
);

-- Sync Jobs table (track sync operations)
CREATE TABLE IF NOT EXISTS sync_jobs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kb_id UUID REFERENCES knowledge_bases(kb_id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL, -- 'full_sync', 'delta_sync', 'event_sync'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    files_discovered INTEGER DEFAULT 0,
    files_processed INTEGER DEFAULT 0,
    files_failed INTEGER DEFAULT 0,
    bytes_processed BIGINT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document Processing Queue (Celery tasks)
CREATE TABLE IF NOT EXISTS processing_queue (
    queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(document_id) ON DELETE CASCADE,
    kb_id UUID REFERENCES knowledge_bases(kb_id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL, -- 'parse', 'chunk', 'embed', 'reprocess'
    priority INTEGER DEFAULT 0, -- Higher = more urgent
    status VARCHAR(50) DEFAULT 'queued', -- 'queued', 'processing', 'completed', 'failed'
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    celery_task_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Analytics & Health Metrics
CREATE TABLE IF NOT EXISTS kb_analytics (
    metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kb_id UUID REFERENCES knowledge_bases(kb_id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    total_queries INTEGER DEFAULT 0,
    total_retrievals INTEGER DEFAULT 0,
    avg_query_latency_ms INTEGER,
    top_k_avg INTEGER, -- Average number of results returned
    cache_hit_rate DECIMAL(4,2), -- Percentage
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT kb_analytics_unique UNIQUE (kb_id, metric_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_kb_owner ON knowledge_bases(owner_id);
CREATE INDEX IF NOT EXISTS idx_kb_status ON knowledge_bases(status);
CREATE INDEX IF NOT EXISTS idx_docs_kb ON documents(kb_id);
CREATE INDEX IF NOT EXISTS idx_docs_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_docs_hash ON documents(file_hash);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunk_metadata(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_kb ON chunk_metadata(kb_id);
CREATE INDEX IF NOT EXISTS idx_chunks_retrieval ON chunk_metadata(retrieval_count DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_kb ON sync_jobs(kb_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_queue_status ON processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON processing_queue(priority DESC, created_at ASC);

-- Update triggers
CREATE TRIGGER update_kb_updated_at BEFORE UPDATE ON knowledge_bases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_docs_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();