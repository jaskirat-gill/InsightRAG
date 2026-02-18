-- Complete seed for users + knowledge bases
-- Run this AFTER init.sql, seed.sql, and kb_schema.sql
-- Creates demo users and their KBs (skips if users already exist)

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
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzq0MRZ.NK', -- Admin123!
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
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzq0MRZ.NK', -- Admin123!
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
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzq0MRZ.NK', -- Admin123!
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

    -- =====================================
    -- PART 4: Create Knowledge Bases (Skip if exist)
    -- =====================================

    -- Admin's Knowledge Bases
    INSERT INTO knowledge_bases (
        kb_id, owner_id, name, description, storage_provider, storage_config,
        processing_strategy, chunk_size, chunk_overlap, status, health_score,
        total_documents, total_size_bytes, last_synced_at
    ) VALUES 
    (
        gen_random_uuid(),
        admin_user_id,
        'Product Documentation',
        'Complete product documentation and API references',
        's3',
        '{"bucket_name": "company-docs", "region": "us-east-1", "prefix": "product/"}'::jsonb,
        'hierarchical',
        512,
        50,
        'active',
        98,
        1247,
        2516582400,
        NOW() - INTERVAL '2 hours'
    ),
    (
        gen_random_uuid(),
        admin_user_id,
        'Customer Support KB',
        'Customer support articles and FAQs',
        's3',
        '{"bucket_name": "support-content", "region": "us-west-2", "prefix": "kb/"}'::jsonb,
        'semantic',
        512,
        50,
        'active',
        95,
        856,
        1932735283,
        NOW() - INTERVAL '5 minutes'
    ),
    (
        gen_random_uuid(),
        admin_user_id,
        'Internal Wiki',
        'Company internal wiki and knowledge sharing',
        's3',
        '{"bucket_name": "internal-docs", "region": "us-east-1", "prefix": "wiki/"}'::jsonb,
        'hierarchical',
        768,
        100,
        'syncing',
        87,
        2103,
        4404019200,
        NOW() - INTERVAL '1 day'
    )
    ON CONFLICT (owner_id, name) DO NOTHING;

    RAISE NOTICE '✅ Created KBs for admin user';

    -- Developer's Knowledge Bases
    INSERT INTO knowledge_bases (
        kb_id, owner_id, name, description, storage_provider, storage_config,
        processing_strategy, chunk_size, chunk_overlap, status, health_score,
        total_documents, total_size_bytes, last_synced_at
    ) VALUES 
    (
        gen_random_uuid(),
        dev_user_id,
        'API Reference',
        'REST API documentation and OpenAPI specs',
        's3',
        '{"bucket_name": "api-docs", "region": "us-east-1"}'::jsonb,
        'hierarchical',
        512,
        50,
        'active',
        100,
        432,
        934281830,
        NOW() - INTERVAL '30 minutes'
    ),
    (
        gen_random_uuid(),
        dev_user_id,
        'Code Examples',
        'Sample code and integration examples',
        's3',
        '{"bucket_name": "dev-content", "region": "us-east-1", "prefix": "examples/"}'::jsonb,
        'semantic',
        256,
        25,
        'active',
        92,
        178,
        268435456,
        NOW() - INTERVAL '1 hour'
    )
    ON CONFLICT (owner_id, name) DO NOTHING;

    RAISE NOTICE '✅ Created KBs for developer user';

    -- End User's Knowledge Base
    INSERT INTO knowledge_bases (
        kb_id, owner_id, name, description, storage_provider, storage_config,
        processing_strategy, chunk_size, chunk_overlap, status, health_score,
        total_documents, total_size_bytes, last_synced_at
    ) VALUES 
    (
        gen_random_uuid(),
        enduser_user_id,
        'Personal Notes',
        'Personal documentation and learning resources',
        's3',
        '{"bucket_name": "user-content", "region": "us-east-1", "prefix": "notes/"}'::jsonb,
        'semantic',
        256,
        25,
        'active',
        100,
        45,
        52428800,
        NOW() - INTERVAL '1 hour'
    )
    ON CONFLICT (owner_id, name) DO NOTHING;

    RAISE NOTICE '✅ Created KB for end user';

    -- =====================================
    -- PART 5: Add Sample Documents (rest of code stays the same)
    -- =====================================
    
    DECLARE
        admin_kb_id UUID;
    BEGIN
        SELECT kb_id INTO admin_kb_id FROM knowledge_bases 
        WHERE owner_id = admin_user_id AND name = 'Product Documentation';

        IF admin_kb_id IS NOT NULL THEN
            INSERT INTO documents (
                document_id, kb_id, source_path, document_type, title, 
                file_size_bytes, file_hash, processing_strategy, processing_status,
                total_chunks, health_score, retrieval_count, avg_similarity,
                last_retrieved_at, uploaded_at
            ) VALUES
            (
                gen_random_uuid(),
                admin_kb_id,
                's3://company-docs/product/api-auth-guide.pdf',
                'pdf',
                'API Authentication Guide',
                2516582,
                'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                'hierarchical',
                'completed',
                47,
                98,
                1247,
                0.89,
                NOW() - INTERVAL '2 hours',
                NOW() - INTERVAL '5 days'
            ),
            (
                gen_random_uuid(),
                admin_kb_id,
                's3://company-docs/product/getting-started.md',
                'markdown',
                'Getting Started Guide',
                156789,
                'a3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b123',
                'semantic',
                'completed',
                12,
                100,
                892,
                0.92,
                NOW() - INTERVAL '5 hours',
                NOW() - INTERVAL '10 days'
            ),
            (
                gen_random_uuid(),
                admin_kb_id,
                's3://company-docs/product/release-notes.pdf',
                'pdf',
                'Release Notes 2025',
                567890,
                'd3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b012',
                'semantic',
                'processing',
                0,
                100,
                0,
                NULL,
                NULL,
                NOW() - INTERVAL '1 hour'
            )
            ON CONFLICT (kb_id, source_path) DO NOTHING;

            RAISE NOTICE '✅ Added sample documents to Product Documentation KB';
        END IF;
    END;

    DECLARE
        dev_kb_id UUID;
    BEGIN
        SELECT kb_id INTO dev_kb_id FROM knowledge_bases 
        WHERE owner_id = dev_user_id AND name = 'API Reference';

        IF dev_kb_id IS NOT NULL THEN
            INSERT INTO documents (
                document_id, kb_id, source_path, document_type, title,
                file_size_bytes, file_hash, processing_strategy, processing_status,
                total_chunks, health_score, retrieval_count, avg_similarity,
                last_retrieved_at, uploaded_at
            ) VALUES
            (
                gen_random_uuid(),
                dev_kb_id,
                's3://api-docs/openapi-spec.yaml',
                'yaml',
                'OpenAPI Specification',
                89012,
                'f3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b678',
                'semantic',
                'completed',
                23,
                100,
                567,
                0.91,
                NOW() - INTERVAL '30 minutes',
                NOW() - INTERVAL '15 days'
            ),
            (
                gen_random_uuid(),
                dev_kb_id,
                's3://api-docs/rest-api-guide.pdf',
                'pdf',
                'REST API Developer Guide',
                345678,
                'g3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b901',
                'hierarchical',
                'completed',
                38,
                98,
                432,
                0.87,
                NOW() - INTERVAL '1 hour',
                NOW() - INTERVAL '20 days'
            )
            ON CONFLICT (kb_id, source_path) DO NOTHING;

            RAISE NOTICE '✅ Added sample documents to API Reference KB';
        END IF;
    END;
    -- (Continue with chunks and analytics as before...)
    
END $$;


-- Add documents for Internal Wiki
DO $$
DECLARE
    admin_user_id UUID;
    wiki_kb_id UUID;
BEGIN
    -- Get admin user
    SELECT user_id INTO admin_user_id FROM users WHERE email = 'admin@example.com';
    
    -- Get Internal Wiki KB
    SELECT kb_id INTO wiki_kb_id FROM knowledge_bases 
    WHERE owner_id = admin_user_id AND name = 'Internal Wiki';

    IF wiki_kb_id IS NOT NULL THEN
        INSERT INTO documents (
            document_id, kb_id, source_path, document_type, title,
            file_size_bytes, file_hash, processing_strategy, processing_status,
            total_chunks, health_score, retrieval_count, avg_similarity,
            last_retrieved_at, uploaded_at
        ) VALUES
        (
            gen_random_uuid(),
            wiki_kb_id,
            's3://internal-docs/wiki/engineering-handbook.pdf',
            'pdf',
            'Engineering Handbook',
            5678901,
            'wiki1_hash',
            'hierarchical',
            'completed',
            67,
            92,
            234,
            0.86,
            NOW() - INTERVAL '1 day',
            NOW() - INTERVAL '30 days'
        ),
        (
            gen_random_uuid(),
            wiki_kb_id,
            's3://internal-docs/wiki/company-policies.docx',
            'docx',
            'Company Policies and Procedures',
            3456789,
            'wiki2_hash',
            'hierarchical',
            'completed',
            45,
            88,
            156,
            0.84,
            NOW() - INTERVAL '2 days',
            NOW() - INTERVAL '45 days'
        ),
        (
            gen_random_uuid(),
            wiki_kb_id,
            's3://internal-docs/wiki/onboarding-guide.md',
            'markdown',
            'New Employee Onboarding Guide',
            234567,
            'wiki3_hash',
            'semantic',
            'processing',
            0,
            100,
            0,
            NULL,
            NULL,
            NOW() - INTERVAL '6 hours'
        )
        ON CONFLICT (kb_id, source_path) DO NOTHING;

        RAISE NOTICE '✅ Added sample documents to Internal Wiki KB';
    END IF;
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