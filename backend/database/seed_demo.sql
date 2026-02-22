-- Demo data entrypoint (users, KBs, documents)
-- Run AFTER seed_roles.sql (or init.sql + seed_roles.sql)
\i backend/database/seed_user_kb.sql
\i backend/database/seed_documents.sql
