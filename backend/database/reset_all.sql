-- DANGER: This drops ALL tables and data
-- Use only for development/testing

-- Drop all tables in reverse dependency order

-- Drop KB tables
DROP TABLE IF EXISTS kb_analytics CASCADE;
DROP TABLE IF EXISTS processing_queue CASCADE;
DROP TABLE IF EXISTS sync_jobs CASCADE;
DROP TABLE IF EXISTS chunk_metadata CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS knowledge_bases CASCADE;

-- Drop auth tables
DROP TABLE IF EXISTS auth_audit_log CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop plugin manager table (if exists)
DROP TABLE IF EXISTS source_plugin_config CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '       ALL TABLES DROPPED!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Database is now empty and ready for fresh seed.';
    RAISE NOTICE 'Run: ./reset_and_seed.sh';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
END $$;