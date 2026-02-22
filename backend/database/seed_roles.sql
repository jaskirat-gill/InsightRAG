-- Seed roles, permissions, and role-permission mappings
-- Run AFTER schema.sql (or init.sql)

-- Insert default roles
INSERT INTO roles (role_name, description) VALUES
    ('admin', 'Full system access - configure sync, manage users, view all analytics'),
    ('developer', 'API and MCP access - integrate KB into applications'),
    ('end_user', 'Query access only - interact through LLM interfaces')
ON CONFLICT (role_name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (permission_name, resource, action, description) VALUES
    -- Knowledge Base permissions
    ('kb.create', 'knowledge_base', 'create', 'Create new knowledge bases'),
    ('kb.read', 'knowledge_base', 'read', 'View knowledge base details'),
    ('kb.update', 'knowledge_base', 'update', 'Modify knowledge base configuration'),
    ('kb.delete', 'knowledge_base', 'delete', 'Delete knowledge bases'),
    
    -- Document permissions
    ('doc.read', 'document', 'read', 'View documents and metadata'),
    ('doc.delete', 'document', 'delete', 'Delete documents'),
    ('doc.reprocess', 'document', 'update', 'Trigger document reprocessing'),
    
    -- Query permissions
    ('query.execute', 'query', 'create', 'Execute search queries'),
    
    -- Sync permissions
    ('sync.configure', 'sync', 'update', 'Configure cloud sync settings'),
    ('sync.trigger', 'sync', 'create', 'Manually trigger sync operations'),
    ('sync.view_status', 'sync', 'read', 'View sync status and logs'),
    
    -- Analytics permissions
    ('analytics.view', 'analytics', 'read', 'View system analytics and health metrics'),
    
    -- User management permissions
    ('user.create', 'user', 'create', 'Create new users'),
    ('user.read', 'user', 'read', 'View user information'),
    ('user.update', 'user', 'update', 'Modify user details and roles'),
    ('user.delete', 'user', 'delete', 'Delete users'),
    
    -- API key permissions
    ('apikey.create', 'api_key', 'create', 'Generate API keys'),
    ('apikey.read', 'api_key', 'read', 'View API keys'),
    ('apikey.revoke', 'api_key', 'delete', 'Revoke API keys')
ON CONFLICT (resource, action) DO NOTHING;

-- Assign permissions to roles
WITH role_perms AS (
    SELECT 
        r.role_id,
        r.role_name,
        p.permission_id,
        p.permission_name
    FROM roles r
    CROSS JOIN permissions p
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT role_id, permission_id FROM role_perms
WHERE 
    -- Admin gets everything
    (role_name = 'admin') OR
    
    -- Developer gets API access and queries
    (role_name = 'developer' AND permission_name IN (
        'kb.read', 'doc.read', 'query.execute', 
        'apikey.create', 'apikey.read', 'apikey.revoke',
        'analytics.view', 'sync.view_status'
    )) OR
    
    -- End user gets query only
    (role_name = 'end_user' AND permission_name = 'query.execute')
ON CONFLICT (role_id, permission_id) DO NOTHING;
