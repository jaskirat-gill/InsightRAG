-- Migration: 003_user_kb_access.sql
-- Add explicit per-user knowledge-base grants for read/query access.

CREATE TABLE IF NOT EXISTS user_kb_access (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    kb_id UUID REFERENCES knowledge_bases(kb_id) ON DELETE CASCADE,
    granted_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, kb_id)
);

CREATE INDEX IF NOT EXISTS idx_user_kb_access_user_id ON user_kb_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_kb_access_kb_id ON user_kb_access(kb_id);