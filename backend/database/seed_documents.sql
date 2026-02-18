-- Comprehensive document seed data for all KBs
-- Shows various document states for frontend testing
-- Run AFTER seed_user_kb.sql

DO $$
DECLARE
    admin_user_id UUID;
    dev_user_id UUID;
    enduser_user_id UUID;
    
    product_kb_id UUID;
    support_kb_id UUID;
    wiki_kb_id UUID;
    api_kb_id UUID;
    examples_kb_id UUID;
    notes_kb_id UUID;
BEGIN
    -- Get users
    SELECT user_id INTO admin_user_id FROM users WHERE email = 'admin@example.com';
    SELECT user_id INTO dev_user_id FROM users WHERE email = 'developer@example.com';
    SELECT user_id INTO enduser_user_id FROM users WHERE email = 'user@example.com';
    
    -- Get KBs
    SELECT kb_id INTO product_kb_id FROM knowledge_bases 
        WHERE owner_id = admin_user_id AND name = 'Product Documentation';
    SELECT kb_id INTO support_kb_id FROM knowledge_bases 
        WHERE owner_id = admin_user_id AND name = 'Customer Support KB';
    SELECT kb_id INTO wiki_kb_id FROM knowledge_bases 
        WHERE owner_id = admin_user_id AND name = 'Internal Wiki';
    SELECT kb_id INTO api_kb_id FROM knowledge_bases 
        WHERE owner_id = dev_user_id AND name = 'API Reference';
    SELECT kb_id INTO examples_kb_id FROM knowledge_bases 
        WHERE owner_id = dev_user_id AND name = 'Code Examples';
    SELECT kb_id INTO notes_kb_id FROM knowledge_bases 
        WHERE owner_id = enduser_user_id AND name = 'Personal Notes';

    -- =====================================
    -- Product Documentation KB (12 docs)
    -- Mix of completed, processing, failed
    -- =====================================
    IF product_kb_id IS NOT NULL THEN
        INSERT INTO documents (
            document_id, kb_id, source_path, document_type, title,
            file_size_bytes, file_hash, processing_strategy, processing_status,
            total_chunks, health_score, retrieval_count, avg_similarity,
            last_retrieved_at, uploaded_at
        ) VALUES
        -- COMPLETED DOCUMENTS (9)
        (
            gen_random_uuid(), product_kb_id,
            's3://company-docs/product/getting-started.md', 'markdown',
            'Getting Started Guide',
            156789, 'hash_gs_001', 'semantic', 'completed',
            12, 100, 892, 0.92,
            NOW() - INTERVAL '5 hours', NOW() - INTERVAL '10 days'
        ),
        (
            gen_random_uuid(), product_kb_id,
            's3://company-docs/product/api-auth-guide.pdf', 'pdf',
            'API Authentication Guide',
            2516582, 'hash_auth_001', 'hierarchical', 'completed',
            47, 98, 1247, 0.89,
            NOW() - INTERVAL '2 hours', NOW() - INTERVAL '5 days'
        ),
        (
            gen_random_uuid(), product_kb_id,
            's3://company-docs/product/advanced-features.pdf', 'pdf',
            'Advanced Features Documentation',
            3245678, 'hash_adv_001', 'hierarchical', 'completed',
            89, 95, 2156, 0.87,
            NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 days'
        ),
        (
            gen_random_uuid(), product_kb_id,
            's3://company-docs/product/troubleshooting.docx', 'docx',
            'Troubleshooting Common Issues',
            892456, 'hash_ts_001', 'semantic', 'completed',
            34, 90, 445, 0.85,
            NOW() - INTERVAL '1 day', NOW() - INTERVAL '7 days'
        ),
        (
            gen_random_uuid(), product_kb_id,
            's3://company-docs/product/user-manual.pdf', 'pdf',
            'Complete User Manual v2.5',
            5678901, 'hash_um_001', 'hierarchical', 'completed',
            156, 94, 678, 0.88,
            NOW() - INTERVAL '6 hours', NOW() - INTERVAL '15 days'
        ),
        (
            gen_random_uuid(), product_kb_id,
            's3://company-docs/product/quickstart-tutorial.md', 'markdown',
            'Quickstart Tutorial',
            234567, 'hash_qt_001', 'semantic', 'completed',
            18, 97, 543, 0.91,
            NOW() - INTERVAL '4 hours', NOW() - INTERVAL '8 days'
        ),
        (
            gen_random_uuid(), product_kb_id,
            's3://company-docs/product/best-practices.pdf', 'pdf',
            'Best Practices and Guidelines',
            1456789, 'hash_bp_001', 'hierarchical', 'completed',
            52, 93, 321, 0.86,
            NOW() - INTERVAL '12 hours', NOW() - INTERVAL '20 days'
        ),
        (
            gen_random_uuid(), product_kb_id,
            's3://company-docs/product/faq.html', 'html',
            'Frequently Asked Questions',
            345678, 'hash_faq_001', 'semantic', 'completed',
            23, 96, 1234, 0.90,
            NOW() - INTERVAL '1 hour', NOW() - INTERVAL '30 days'
        ),
        (
            gen_random_uuid(), product_kb_id,
            's3://company-docs/product/migration-guide.md', 'markdown',
            'Migration Guide v2 to v3',
            567890, 'hash_mg_001', 'semantic', 'completed',
            28, 91, 234, 0.84,
            NOW() - INTERVAL '8 hours', NOW() - INTERVAL '12 days'
        ),
        
        -- PROCESSING (2)
        (
            gen_random_uuid(), product_kb_id,
            's3://company-docs/product/release-notes-2025.pdf', 'pdf',
            'Release Notes 2025',
            567890, 'hash_rn_001', 'semantic', 'processing',
            0, 100, 0, NULL,
            NULL, NOW() - INTERVAL '1 hour'
        ),
        (
            gen_random_uuid(), product_kb_id,
            's3://company-docs/product/developer-changelog.md', 'markdown',
            'Developer Changelog',
            123456, 'hash_dc_001', 'semantic', 'processing',
            0, 100, 0, NULL,
            NULL, NOW() - INTERVAL '30 minutes'
        ),
        
        -- FAILED (1)
        (
            gen_random_uuid(), product_kb_id,
            's3://company-docs/product/legacy-system-docs.pdf', 'pdf',
            'Legacy System Documentation (Corrupted)',
            4567890, 'hash_leg_001', 'hierarchical', 'failed',
            0, 0, 0, NULL,
            NULL, NOW() - INTERVAL '15 days'
        )
        ON CONFLICT (kb_id, source_path) DO NOTHING;

        RAISE NOTICE '✅ Added 12 documents to Product Documentation';
    END IF;

    -- =====================================
    -- Customer Support KB (8 docs)
    -- Mostly completed, some processing
    -- =====================================
    IF support_kb_id IS NOT NULL THEN
        INSERT INTO documents (
            document_id, kb_id, source_path, document_type, title,
            file_size_bytes, file_hash, processing_strategy, processing_status,
            total_chunks, health_score, retrieval_count, avg_similarity,
            last_retrieved_at, uploaded_at
        ) VALUES
        -- COMPLETED (6)
        (
            gen_random_uuid(), support_kb_id,
            's3://support-content/kb/faq-general.html', 'html',
            'General FAQs',
            234567, 'hash_faq_002', 'semantic', 'completed',
            18, 98, 3421, 0.91,
            NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 days'
        ),
        (
            gen_random_uuid(), support_kb_id,
            's3://support-content/kb/billing-issues.pdf', 'pdf',
            'Billing and Payment Issues',
            456789, 'hash_bill_001', 'semantic', 'completed',
            26, 95, 1876, 0.88,
            NOW() - INTERVAL '2 hours', NOW() - INTERVAL '45 days'
        ),
        (
            gen_random_uuid(), support_kb_id,
            's3://support-content/kb/account-security.md', 'markdown',
            'Account Security Best Practices',
            123456, 'hash_sec_001', 'semantic', 'completed',
            15, 100, 987, 0.93,
            NOW() - INTERVAL '1 hour', NOW() - INTERVAL '20 days'
        ),
        (
            gen_random_uuid(), support_kb_id,
            's3://support-content/kb/common-errors.pdf', 'pdf',
            'Common Error Messages and Solutions',
            678901, 'hash_err_001', 'semantic', 'completed',
            32, 92, 654, 0.86,
            NOW() - INTERVAL '3 hours', NOW() - INTERVAL '25 days'
        ),
        (
            gen_random_uuid(), support_kb_id,
            's3://support-content/kb/integration-help.md', 'markdown',
            'Third-Party Integration Help',
            345678, 'hash_int_001', 'semantic', 'completed',
            21, 94, 432, 0.87,
            NOW() - INTERVAL '4 hours', NOW() - INTERVAL '18 days'
        ),
        (
            gen_random_uuid(), support_kb_id,
            's3://support-content/kb/refund-policy.html', 'html',
            'Refund and Cancellation Policy',
            234567, 'hash_ref_001', 'semantic', 'completed',
            12, 97, 876, 0.89,
            NOW() - INTERVAL '6 hours', NOW() - INTERVAL '60 days'
        ),
        
        -- PROCESSING (2)
        (
            gen_random_uuid(), support_kb_id,
            's3://support-content/kb/new-feature-guide.pdf', 'pdf',
            'New Feature Announcement',
            456789, 'hash_nf_001', 'semantic', 'processing',
            0, 100, 0, NULL,
            NULL, NOW() - INTERVAL '15 minutes'
        ),
        (
            gen_random_uuid(), support_kb_id,
            's3://support-content/kb/troubleshooting-2025.md', 'markdown',
            'Troubleshooting Guide 2025',
            567890, 'hash_ts_002', 'semantic', 'processing',
            0, 100, 0, NULL,
            NULL, NOW() - INTERVAL '45 minutes'
        )
        ON CONFLICT (kb_id, source_path) DO NOTHING;

        RAISE NOTICE '✅ Added 8 documents to Customer Support KB';
    END IF;

    -- =====================================
    -- Internal Wiki (5 docs)
    -- Mix of states - showing partial sync
    -- =====================================
    IF wiki_kb_id IS NOT NULL THEN
        INSERT INTO documents (
            document_id, kb_id, source_path, document_type, title,
            file_size_bytes, file_hash, processing_strategy, processing_status,
            total_chunks, health_score, retrieval_count, avg_similarity,
            last_retrieved_at, uploaded_at
        ) VALUES
        -- COMPLETED (3)
        (
            gen_random_uuid(), wiki_kb_id,
            's3://internal-docs/wiki/engineering-handbook.pdf', 'pdf',
            'Engineering Handbook',
            5678901, 'hash_eng_001', 'hierarchical', 'completed',
            67, 92, 234, 0.86,
            NOW() - INTERVAL '1 day', NOW() - INTERVAL '30 days'
        ),
        (
            gen_random_uuid(), wiki_kb_id,
            's3://internal-docs/wiki/company-policies.docx', 'docx',
            'Company Policies and Procedures',
            3456789, 'hash_pol_001', 'hierarchical', 'completed',
            45, 88, 156, 0.84,
            NOW() - INTERVAL '2 days', NOW() - INTERVAL '45 days'
        ),
        (
            gen_random_uuid(), wiki_kb_id,
            's3://internal-docs/wiki/benefits-guide.pdf', 'pdf',
            'Employee Benefits Guide 2025',
            2345678, 'hash_ben_001', 'hierarchical', 'completed',
            38, 90, 98, 0.85,
            NOW() - INTERVAL '3 days', NOW() - INTERVAL '60 days'
        ),
        
        -- PROCESSING (1)
        (
            gen_random_uuid(), wiki_kb_id,
            's3://internal-docs/wiki/onboarding-guide.md', 'markdown',
            'New Employee Onboarding Guide',
            234567, 'hash_onb_001', 'semantic', 'processing',
            0, 100, 0, NULL,
            NULL, NOW() - INTERVAL '6 hours'
        ),
        
        -- PENDING (1) - just discovered, not started
        (
            gen_random_uuid(), wiki_kb_id,
            's3://internal-docs/wiki/remote-work-policy.pdf', 'pdf',
            'Remote Work Policy',
            1234567, 'hash_rem_001', 'hierarchical', 'pending',
            0, 100, 0, NULL,
            NULL, NOW() - INTERVAL '2 hours'
        )
        ON CONFLICT (kb_id, source_path) DO NOTHING;

        RAISE NOTICE '✅ Added 5 documents to Internal Wiki (showing partial sync: 3/5 complete)';
    END IF;

    -- =====================================
    -- API Reference (4 docs)
    -- All completed - dev's clean KB
    -- =====================================
    IF api_kb_id IS NOT NULL THEN
        INSERT INTO documents (
            document_id, kb_id, source_path, document_type, title,
            file_size_bytes, file_hash, processing_strategy, processing_status,
            total_chunks, health_score, retrieval_count, avg_similarity,
            last_retrieved_at, uploaded_at
        ) VALUES
        (
            gen_random_uuid(), api_kb_id,
            's3://api-docs/openapi-spec.yaml', 'yaml',
            'OpenAPI Specification v3',
            89012, 'hash_oas_001', 'semantic', 'completed',
            23, 100, 567, 0.91,
            NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '15 days'
        ),
        (
            gen_random_uuid(), api_kb_id,
            's3://api-docs/rest-api-guide.pdf', 'pdf',
            'REST API Developer Guide',
            345678, 'hash_rest_001', 'hierarchical', 'completed',
            38, 98, 432, 0.87,
            NOW() - INTERVAL '1 hour', NOW() - INTERVAL '20 days'
        ),
        (
            gen_random_uuid(), api_kb_id,
            's3://api-docs/webhook-reference.md', 'markdown',
            'Webhook Events Reference',
            234567, 'hash_web_001', 'semantic', 'completed',
            19, 100, 321, 0.89,
            NOW() - INTERVAL '2 hours', NOW() - INTERVAL '10 days'
        ),
        (
            gen_random_uuid(), api_kb_id,
            's3://api-docs/rate-limits.html', 'html',
            'API Rate Limits and Quotas',
            123456, 'hash_rate_001', 'semantic', 'completed',
            14, 99, 234, 0.90,
            NOW() - INTERVAL '3 hours', NOW() - INTERVAL '25 days'
        )
        ON CONFLICT (kb_id, source_path) DO NOTHING;

        RAISE NOTICE '✅ Added 4 documents to API Reference';
    END IF;

    -- =====================================
    -- Code Examples (3 docs)
    -- =====================================
    IF examples_kb_id IS NOT NULL THEN
        INSERT INTO documents (
            document_id, kb_id, source_path, document_type, title,
            file_size_bytes, file_hash, processing_strategy, processing_status,
            total_chunks, health_score, retrieval_count, avg_similarity,
            last_retrieved_at, uploaded_at
        ) VALUES
        (
            gen_random_uuid(), examples_kb_id,
            's3://dev-content/examples/python-quickstart.md', 'markdown',
            'Python SDK Quickstart',
            67890, 'hash_py_001', 'semantic', 'completed',
            8, 100, 123, 0.92,
            NOW() - INTERVAL '1 hour', NOW() - INTERVAL '5 days'
        ),
        (
            gen_random_uuid(), examples_kb_id,
            's3://dev-content/examples/javascript-examples.md', 'markdown',
            'JavaScript Integration Examples',
            89012, 'hash_js_001', 'semantic', 'completed',
            11, 98, 87, 0.88,
            NOW() - INTERVAL '2 hours', NOW() - INTERVAL '8 days'
        ),
        (
            gen_random_uuid(), examples_kb_id,
            's3://dev-content/examples/curl-recipes.md', 'markdown',
            'cURL Command Recipes',
            45678, 'hash_curl_001', 'semantic', 'completed',
            6, 97, 65, 0.86,
            NOW() - INTERVAL '3 hours', NOW() - INTERVAL '12 days'
        )
        ON CONFLICT (kb_id, source_path) DO NOTHING;

        RAISE NOTICE '✅ Added 3 documents to Code Examples';
    END IF;

    -- =====================================
    -- Personal Notes (2 docs)
    -- =====================================
    IF notes_kb_id IS NOT NULL THEN
        INSERT INTO documents (
            document_id, kb_id, source_path, document_type, title,
            file_size_bytes, file_hash, processing_strategy, processing_status,
            total_chunks, health_score, retrieval_count, avg_similarity,
            last_retrieved_at, uploaded_at
        ) VALUES
        (
            gen_random_uuid(), notes_kb_id,
            's3://user-content/notes/learning-notes.md', 'markdown',
            'My Learning Notes',
            34567, 'hash_learn_001', 'semantic', 'completed',
            4, 100, 12, 0.91,
            NOW() - INTERVAL '1 hour', NOW() - INTERVAL '3 days'
        ),
        (
            gen_random_uuid(), notes_kb_id,
            's3://user-content/notes/project-ideas.txt', 'txt',
            'Project Ideas and TODO',
            12345, 'hash_todo_001', 'semantic', 'completed',
            2, 100, 5, 0.87,
            NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 day'
        )
        ON CONFLICT (kb_id, source_path) DO NOTHING;

        RAISE NOTICE '✅ Added 2 documents to Personal Notes';
    END IF;

END $$;

-- Summary
DO $$
DECLARE
    total_docs INTEGER;
    completed_docs INTEGER;
    processing_docs INTEGER;
    failed_docs INTEGER;
    pending_docs INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_docs FROM documents;
    SELECT COUNT(*) INTO completed_docs FROM documents WHERE processing_status = 'completed';
    SELECT COUNT(*) INTO processing_docs FROM documents WHERE processing_status = 'processing';
    SELECT COUNT(*) INTO failed_docs FROM documents WHERE processing_status = 'failed';
    SELECT COUNT(*) INTO pending_docs FROM documents WHERE processing_status = 'pending';

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '       DOCUMENT SEED COMPLETE!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Total Documents: %', total_docs;
    RAISE NOTICE '  ✅ Completed: %', completed_docs;
    RAISE NOTICE '  ⏳ Processing: %', processing_docs;
    RAISE NOTICE '  ⏸️  Pending: %', pending_docs;
    RAISE NOTICE '  ❌ Failed: %', failed_docs;
    RAISE NOTICE '';
    RAISE NOTICE 'Document Distribution:';
    RAISE NOTICE '  - Product Documentation: 12 docs';
    RAISE NOTICE '  - Customer Support KB: 8 docs';
    RAISE NOTICE '  - Internal Wiki: 5 docs (partial sync)';
    RAISE NOTICE '  - API Reference: 4 docs';
    RAISE NOTICE '  - Code Examples: 3 docs';
    RAISE NOTICE '  - Personal Notes: 2 docs';
    RAISE NOTICE '==============================================';
END $$;