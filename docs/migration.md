# Migration Guide - Authentication System

## Overview

This guide helps team members set up the new authentication system after pulling the auth implementation branch.

- **Database migrations are required** - the init scripts only run automatically on fresh databases
- **Existing deployments must run migrations manually**
- **All team members need to follow these steps**

After migration, there are 3 basic existing users:

```
Created admin user: admin@example.com (password: Admin123!)

Created developer user: developer@example.com (password: Admin123!)

Created end user: user@example.com (password: Admin123!)
```

## Step 1: Run Database Migrations

### Option A: Using Docker (Recommended)
```bash
# Make sure postgres is running
docker-compose up -d postgres

# Wait a few seconds for postgres to be ready
sleep 5

# Run init script (creates tables)
docker exec -i openwebui-project-postgres-1 psql -U user -d openwebui < backend/database/init.sql

# Run seed script (creates roles, permissions, and demo users only)
docker exec -i openwebui-project-postgres-1 psql -U user -d openwebui < backend/database/seed_user_kb.sql
```

### Option B: Using pgAdmin

1. Open pgAdmin
2. Connect to your database:
   - Host: `localhost`
   - Port: `5433` (note the non-standard port)
   - Database: `openwebui`
   - Username: `user`
   - Password: `password`
3. Open Query Tool (Tools → Query Tool)
4. Open file `backend/database/reset_all.sql`
5. Click Execute (▶️ button)
6. Open file `backend/database/init.sql`
7. Click Execute (▶️ button)
8. Open file `backend/database/seed_user_kb.sql`
9. Click Execute (▶️ button)
10. Do not run `backend/database/seed_documents.sql` unless you explicitly want demo KB/document data

### Option C: Using psql Directly
```bash
# If you have psql installed locally
psql -h localhost -p 5433 -U user -d openwebui -f backend/database/reset_all.sql
psql -h localhost -p 5433 -U user -d openwebui -f backend/database/init.sql
psql -h localhost -p 5433 -U user -d openwebui -f backend/database/seed_user_kb.sql
# Do not run seed_documents.sql for clean environments (it inserts demo KB/docs)
# psql -h localhost -p 5433 -U user -d openwebui -f backend/database/seed_documents.sql
```

## Step 2: Verify Tables Created

Run this query to verify all tables were created:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected tables include (auth + KB control plane):**
- `api_keys`
- `auth_audit_log`
- `chunk_metadata`
- `documents`
- `kb_analytics`
- `knowledge_bases`
- `permissions`
- `processing_queue`
- `refresh_tokens`
- `role_permissions`
- `roles`
- `sync_jobs`
- `user_roles`
- `users`

---

## Step 3: Rebuild Backend Service
```bash
# Rebuild with new dependencies
docker-compose build sync-service

# Start the service
docker-compose up sync-service postgres qdrant
```

**Expected output:**
```
✅ Auth database connected
🚀 Cloud Sync Service started
INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

## Step 4: Set Up Frontend

### Option A: Run Locally (Recommended for Development)
```bash
# In a new terminal
cd frontend

# Install dependencies (requires Node.js 20+)
npm install

# Start dev server
npm run dev
```

### Option B: Run in Docker
```bash
# If you prefer Docker
docker-compose up frontend
```

---

## Step 5: Test Authentication

### Test 1: Register a User

1. Go to http://localhost:5173
2. Click "Create one"
3. Enter:
   - Email: `test@example.com`
   - Password: `TestPass123!`
   - Full Name: `Test User`
4. Click "Create Account"
5. Should see success message

### Test 2: Login

1. Enter the credentials you just created
2. Click "Sign In"
3. Should see the dashboard with your name
4. Should see "developer" role badge

### Test 3: API Endpoints

1. Go to http://localhost:8000/docs
2. Scroll to "Authentication" section
3. Click on `POST /api/v1/auth/login`
4. Click "Try it out"
5. Enter:
```json
   {
     "email": "test@example.com",
     "password": "TestPass123!"
   }
```
6. Click "Execute"
7. Should get back tokens
8. Copy the `access_token` value

### Test 4: Authorized Endpoints

1. Click the 🔒 **Authorize** button (top right)
2. Enter: `Bearer <paste-your-access-token-here>`
3. Click "Authorize"
4. Click "Close"
5. Try `GET /api/v1/auth/me`
6. Should see your user info

---

## Step 6: Create Admin User (Optional)

If you need admin access for testing user management:
```sql
-- Promote your test user to admin
INSERT INTO user_roles (user_id, role_id)
SELECT 
  u.user_id,
  r.role_id
FROM users u, roles r
WHERE u.email = 'test@example.com'
  AND r.role_name = 'admin'
ON CONFLICT DO NOTHING;
```
