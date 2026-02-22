#!/bin/bash
set -e

echo "🧹 Resetting database..."
docker exec -i openwebui-project-postgres-1 psql -v ON_ERROR_STOP=1 -U user -d openwebui < backend/database/reset_all.sql

echo "📦 Recreating schema..."
docker exec -i openwebui-project-postgres-1 psql -v ON_ERROR_STOP=1 -U user -d openwebui < backend/database/init.sql

echo "🔐 Seeding roles and permissions..."
docker exec -i openwebui-project-postgres-1 psql -v ON_ERROR_STOP=1 -U user -d openwebui < backend/database/seed_roles.sql

echo "🌱 Seeding demo data..."
docker exec -i openwebui-project-postgres-1 psql -v ON_ERROR_STOP=1 -U user -d openwebui < backend/database/seed_user_kb.sql
docker exec -i openwebui-project-postgres-1 psql -v ON_ERROR_STOP=1 -U user -d openwebui < backend/database/seed_documents.sql

echo "✅ Reset and seed complete."
