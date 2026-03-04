
-- Complete seed for users + roles/permissions
-- Run this AFTER init.sql
-- Creates demo users only (no demo KB/doc entries)

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
    (role_name = 'admin')
    OR
    -- Developer can create users (but backend restricts roles they can create)
    (role_name = 'developer' AND permission_name IN (
        'kb.read', 'doc.read', 'query.execute',
        'apikey.create', 'apikey.read', 'apikey.revoke',
        'analytics.view', 'sync.view_status',
        'user.create', 'user.read'
    ))
    OR
    -- End user can query + create/read users (but backend restricts to end_user only)
    (role_name = 'end_user' AND permission_name IN (
        'query.execute',
        'user.create', 'user.read'
    ))
ON CONFLICT (role_id, permission_id) DO NOTHING;

DO $$
DECLARE
    admin_user_id UUID;
    dev_user_id UUID;
    enduser_user_id UUID;
    admin_role_id UUID;
    dev_role_id UUID;
    enduser_role_id UUID;
BEGIN
    -- Get role IDs
    SELECT role_id INTO admin_role_id FROM roles WHERE role_name = 'admin';
    SELECT role_id INTO dev_role_id FROM roles WHERE role_name = 'developer';
    SELECT role_id INTO enduser_role_id FROM roles WHERE role_name = 'end_user';

    -- =====================================
    -- PART 1: Create or Get Admin User
    -- =====================================
    SELECT user_id INTO admin_user_id FROM users WHERE email = 'admin@example.com';
    
    IF admin_user_id IS NULL THEN
        -- Create new admin user
        INSERT INTO users (user_id, email, hashed_password, full_name, is_active, is_verified)
        VALUES (
            gen_random_uuid(),
            'admin@example.com',
            '$2b$12$pspCZFvmjE92KGauR1s9ieQc4YgORvVIbEWSArcFDNCerDDKjT16y', -- Admin123!
            'Admin User',
            true,
            true
        )
        RETURNING user_id INTO admin_user_id;

        -- Assign admin role
        INSERT INTO user_roles (user_id, role_id)
        VALUES (admin_user_id, admin_role_id)
        ON CONFLICT DO NOTHING;

        RAISE NOTICE '✅ Created admin user: admin@example.com (password: Admin123!)';
    ELSE
        RAISE NOTICE '⏭️  Admin user already exists: admin@example.com';
        
        -- Ensure admin role is assigned
        INSERT INTO user_roles (user_id, role_id)
        VALUES (admin_user_id, admin_role_id)
        ON CONFLICT DO NOTHING;
    END IF;

    -- =====================================
    -- PART 2: Create or Get Developer User
    -- =====================================
    SELECT user_id INTO dev_user_id FROM users WHERE email = 'developer@example.com';
    
    IF dev_user_id IS NULL THEN
        INSERT INTO users (user_id, email, hashed_password, full_name, is_active, is_verified)
        VALUES (
            gen_random_uuid(),
            'developer@example.com',
            '$2b$12$pspCZFvmjE92KGauR1s9ieQc4YgORvVIbEWSArcFDNCerDDKjT16y', -- Admin123!
            'Developer User',
            true,
            true
        )
        RETURNING user_id INTO dev_user_id;

        INSERT INTO user_roles (user_id, role_id)
        VALUES (dev_user_id, dev_role_id)
        ON CONFLICT DO NOTHING;

        RAISE NOTICE '✅ Created developer user: developer@example.com (password: Admin123!)';
    ELSE
        RAISE NOTICE '⏭️  Developer user already exists: developer@example.com';
        
        INSERT INTO user_roles (user_id, role_id)
        VALUES (dev_user_id, dev_role_id)
        ON CONFLICT DO NOTHING;
    END IF;

    -- =====================================
    -- PART 3: Create or Get End User
    -- =====================================
    SELECT user_id INTO enduser_user_id FROM users WHERE email = 'user@example.com';
    
    IF enduser_user_id IS NULL THEN
        INSERT INTO users (user_id, email, hashed_password, full_name, is_active, is_verified)
        VALUES (
            gen_random_uuid(),
            'user@example.com',
            '$2b$12$pspCZFvmjE92KGauR1s9ieQc4YgORvVIbEWSArcFDNCerDDKjT16y', -- Admin123!
            'End User',
            true,
            true
        )
        RETURNING user_id INTO enduser_user_id;

        INSERT INTO user_roles (user_id, role_id)
        VALUES (enduser_user_id, enduser_role_id)
        ON CONFLICT DO NOTHING;

        RAISE NOTICE '✅ Created end user: user@example.com (password: Admin123!)';
    ELSE
        RAISE NOTICE '⏭️  End user already exists: user@example.com';
        
        INSERT INTO user_roles (user_id, role_id)
        VALUES (enduser_user_id, enduser_role_id)
        ON CONFLICT DO NOTHING;
    END IF;

    RAISE NOTICE '⏭️  Skipping demo KB and document seed data.';
    
END $$;

-- Summary at the end
DO $$
DECLARE
    user_count INTEGER;
    kb_count INTEGER;
    doc_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO kb_count FROM knowledge_bases;
    SELECT COUNT(*) INTO doc_count FROM documents;

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '       SEED DATA COMPLETE!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Total Users: %', user_count;
    RAISE NOTICE 'Total KBs: %', kb_count;
    RAISE NOTICE 'Total Docs: %', doc_count;
    RAISE NOTICE '==============================================';
END $$;
