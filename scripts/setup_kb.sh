#!/bin/bash
set -e

echo "📦 Setting up Knowledge Base schema..."

# Create tables
docker exec -i openwebui-project-postgres-1 psql -v ON_ERROR_STOP=1 -U user -d openwebui < backend/database/init.sql
echo "✅ Tables created"

# Insert roles/permissions
docker exec -i openwebui-project-postgres-1 psql -v ON_ERROR_STOP=1 -U user -d openwebui < backend/database/seed_roles.sql
echo "✅ Roles configured"

# Load demo data
docker exec -i openwebui-project-postgres-1 psql -v ON_ERROR_STOP=1 -U user -d openwebui < backend/database/seed_user_kb.sql
docker exec -i openwebui-project-postgres-1 psql -v ON_ERROR_STOP=1 -U user -d openwebui < backend/database/seed_documents.sql
echo "✅ Demo data loaded"

echo ""
echo "🎉 Knowledge Base setup complete!"
echo ""
echo "Demo data includes:"
echo "  - 3 users (admin, developer, end user)"
echo "  - 6 knowledge bases"
echo "  - 35 sample documents"
echo ""
echo "Login at: http://localhost:5173"
echo "  admin@example.com / Admin123!"
echo ""
