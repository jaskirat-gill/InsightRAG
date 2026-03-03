-- Creates local document cache table for document viewing/reprocessing.
CREATE TABLE IF NOT EXISTS document_local_copies (
    copy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(document_id) ON DELETE CASCADE,
    kb_id UUID REFERENCES knowledge_bases(kb_id) ON DELETE CASCADE,
    source_path TEXT NOT NULL,
    local_path TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_local_copies_doc
    ON document_local_copies(document_id);

CREATE INDEX IF NOT EXISTS idx_document_local_copies_kb_source
    ON document_local_copies(kb_id, source_path);
