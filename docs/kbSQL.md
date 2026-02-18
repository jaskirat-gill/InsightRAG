# Knowledge Base Control Plane - Feature Documentation


## 🏗️ Architecture

### Database Schema
```
┌─────────────────────────────────────────────────────────────┐
│                    Knowledge Base Layer                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  knowledge_bases (KB metadata & config)                     │
│   ├─ kb_id (PK)                                             │
│   ├─ owner_id → users.user_id                               │
│   ├─ name, description                                      │
│   ├─ storage_config (JSONB) - S3 bucket info                │
│   ├─ processing_strategy (semantic/hierarchical/...)        │
│   ├─ status (active/syncing/error/paused)                   │
│   ├─ health_score (0-100)                                   │
│   └─ total_documents, total_size_bytes                      │
│                                                             │
│  documents (individual files in KB)                         │
│   ├─ document_id (PK)                                       │
│   ├─ kb_id → knowledge_bases.kb_id                          │
│   ├─ source_path (s3://bucket/key)                          │
│   ├─ document_type (pdf/docx/md/html/...)                   │
│   ├─ processing_status (pending/processing/completed/...)   │
│   ├─ total_chunks                                           │
│   └─ health_score, retrieval_count                          │
│                                                             │
│  chunk_metadata (searchable text chunks)                    │
│   ├─ chunk_id (PK)                                          │
│   ├─ document_id → documents.document_id                    │
│   ├─ chunk_text (actual content)                            │
│   ├─ vector_id (reference to Qdrant)                        │
│   └─ retrieval_count, page_number                           │
│                                                             │
│  sync_jobs (track sync operations)                          │
│   ├─ job_id (PK)                                            │
│   ├─ kb_id → knowledge_bases.kb_id                          │
│   ├─ job_type (full_sync/delta_sync/event_sync)             │
│   ├─ status (pending/running/completed/failed)              │
│   └─ files_discovered, files_processed, files_failed        │
│                                                             │
│  processing_queue (document processing tasks)               │
│   ├─ queue_id (PK)                                          │
│   ├─ document_id → documents.document_id                    │
│   ├─ task_type (parse/chunk/embed/reprocess)                │
│   └─ status, priority, attempts                             │
│                                                             │
│  kb_analytics (daily metrics)                               │
│   ├─ metric_id (PK)                                         │
│   ├─ kb_id → knowledge_bases.kb_id                          │
│   ├─ metric_date                                            │
│   └─ total_queries, avg_latency, cache_hit_rate             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Relationships
```
users (1) ──→ (N) knowledge_bases
              │
              ├─→ (N) documents
              │    │
              │    └─→ (N) chunk_metadata
              │
              ├─→ (N) sync_jobs
              ├─→ (N) processing_queue
              └─→ (N) kb_analytics
```

### Storage Architecture
```
┌─────────────────────────────────────────────────────────┐
│ Cloud Storage (S3/GCS/Azure)                            │
│ - Original binary files (PDF, DOCX, etc.)               │
│ - Size: GB to TB                                         │
└─────────────────────────────────────────────────────────┘
                      ↓ reference
┌─────────────────────────────────────────────────────────┐
│ PostgreSQL                                               │
│ - Metadata only (no file content)                       │
│ - Document records with source_path references          │
│ - Extracted text in chunk_metadata.chunk_text           │
│ - Size: MB to GB                                         │
└─────────────────────────────────────────────────────────┘
                      ↓ reference
┌─────────────────────────────────────────────────────────┐
│ Qdrant (Vector Database)                                │
│ - Vector embeddings (1536-dimensional)                  │
│ - Referenced by chunk_metadata.vector_id                │
│ - Size: GB                                               │
└─────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Knowledge Base CRUD
```http
# List all KBs (user sees only their own, admin sees all)
GET /api/v1/knowledge-bases
Authorization: Bearer <token>
Response: 200 OK
[
  {
    "kb_id": "uuid",
    "name": "Product Documentation",
    "description": "Complete product docs",
    "status": "active",
    "health_score": 98,
    "total_documents": 1247,
    "total_size_bytes": 2516582400,
    "last_synced_at": "2026-02-17T12:00:00Z"
  }
]
```
```http
# Create new KB
POST /api/v1/knowledge-bases
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Knowledge Base",
  "description": "Optional description",
  "storage_provider": "s3",
  "storage_config": {
    "bucket_name": "my-bucket",
    "region": "us-east-1"
  },
  "processing_strategy": "semantic",
  "chunk_size": 512,
  "chunk_overlap": 50
}

Response: 201 Created
{
  "kb_id": "uuid",
  "name": "My Knowledge Base",
  "status": "initializing",
  ...
}
```
```http
# Get KB details
GET /api/v1/knowledge-bases/{kb_id}
Authorization: Bearer <token>
Response: 200 OK

# Update KB
PUT /api/v1/knowledge-bases/{kb_id}
Authorization: Bearer <token>
Content-Type: application/json
{
  "description": "Updated description",
  "status": "paused"
}
Response: 200 OK

# Delete KB
DELETE /api/v1/knowledge-bases/{kb_id}
Authorization: Bearer <token>
Response: 204 No Content

# Get KB health metrics
GET /api/v1/knowledge-bases/{kb_id}/health
Authorization: Bearer <token>
Response: 200 OK
{
  "kb_id": "uuid",
  "name": "Product Documentation",
  "status": "active",
  "total_documents": 1247,
  "actual_documents": 12,
  "completed_docs": 9,
  "processing_docs": 2,
  "failed_docs": 1,
  "pending_docs": 1235,
  "avg_document_health": 94.5,
  "total_chunks": 284,
  "sync_complete": false,
  "sync_progress": 0.96
}
```

### Permissions Required

| Endpoint | Permission | Notes |
|----------|------------|-------|
| List KBs | `kb.read` | Returns only owned KBs (unless admin) |
| Create KB | `kb.create` | Developer/Admin only |
| Get KB | `kb.read` | Must own KB or be admin |
| Update KB | `kb.update` | Must own KB or be admin |
| Delete KB | `kb.delete` | Must own KB or be admin |
| Health | `kb.read` | Must own KB or be admin |

---

## 💾 Database Migration

### Initial Setup

**Run migrations in order:**
```bash
# 1. Create all tables
psql -U user -d openwebui < backend/database/schema.sql

# 2. Insert roles & permissions
psql -U user -d openwebui < backend/database/seed_roles.sql

# 3. (Optional) Load demo data
psql -U user -d openwebui < backend/database/seed_demo.sql
```

### Quick Setup Script
```bash
#!/bin/bash
# File: scripts/setup_kb.sh

set -e

echo "📦 Setting up Knowledge Base schema..."

# Create tables
docker exec -i openwebui-project-postgres-1 psql -U user -d openwebui < backend/database/schema.sql
echo "✅ Tables created"

# Insert roles/permissions
docker exec -i openwebui-project-postgres-1 psql -U user -d openwebui < backend/database/seed_roles.sql
echo "✅ Roles configured"

# Load demo data
docker exec -i openwebui-project-postgres-1 psql -U user -d openwebui < backend/database/seed_demo.sql
echo "✅ Demo data loaded"

echo ""
echo "🎉 Knowledge Base setup complete!"
echo ""
echo "Demo data includes:"
echo "  - 3 users (admin, developer, end user)"
echo "  - 6 knowledge bases"
echo "  - 34 sample documents"
echo ""
echo "Login at: http://localhost:5173"
echo "  admin@example.com / Admin123!"
echo ""
```

### What Gets Created

**Tables (6):**
- `knowledge_bases` - KB metadata
- `documents` - Document records
- `chunk_metadata` - Text chunks
- `sync_jobs` - Sync tracking
- `processing_queue` - Task queue
- `kb_analytics` - Metrics

**Demo Data:**
```sql
-- 6 Knowledge Bases
Product Documentation   (1,247 docs, 2.4 GB, admin)
Customer Support KB     (856 docs, 1.8 GB, admin)
Internal Wiki          (2,103 docs, 4.1 GB, admin)
API Reference          (432 docs, 890 MB, developer)
Code Examples          (178 docs, 268 MB, developer)
Personal Notes         (45 docs, 50 MB, end user)

-- 34 Documents (various states)
✅ 30 completed
⏳ 3 processing  
❌ 1 failed
```

---

## 🧪 Testing

### Backend Tests (Swagger UI)
```bash
# 1. Start services
docker-compose up -d

# 2. Open Swagger
open http://localhost:8000/docs

# 3. Test sequence:
POST /api/v1/auth/login
  → Email: admin@example.com
  → Password: Admin123!
  → Copy access_token

Click 🔒 Authorize
  → Enter: Bearer <token>

GET /api/v1/knowledge-bases
  → Should return 6 KBs

POST /api/v1/knowledge-bases
  → Create new KB
  → Check it appears in list

GET /api/v1/knowledge-bases/{kb_id}/health
  → View health metrics
```

### Frontend Tests
```bash
# 1. Start frontend
cd frontend
npm run dev

# 2. Open browser
open http://localhost:5173

# 3. Test flow:
Login → admin@example.com / Admin123!
  ↓
Click Database icon (bottom nav)
  ↓
See 6 knowledge bases in grid
  ↓
Try search: "Product"
  ↓
Click "+ Create New"
  ↓
Fill form and submit
  ↓
New KB appears in list
```

### Verify Database
```bash
# Check tables exist
docker exec -it openwebui-project-postgres-1 psql -U user -d openwebui -c "\dt"

# Count records
docker exec -it openwebui-project-postgres-1 psql -U user -d openwebui <<EOF
SELECT 
  (SELECT COUNT(*) FROM knowledge_bases) as kbs,
  (SELECT COUNT(*) FROM documents) as docs,
  (SELECT COUNT(*) FROM chunk_metadata) as chunks;
EOF

# View KBs per user
docker exec -it openwebui-project-postgres-1 psql -U user -d openwebui <<EOF
SELECT u.email, kb.name, kb.status, kb.total_documents
FROM knowledge_bases kb
JOIN users u ON kb.owner_id = u.user_id
ORDER BY u.email, kb.name;
EOF
```

---

## 📊 Sample Data Overview

### Knowledge Base Examples

**Product Documentation:**
- 12 actual documents in DB (out of 1,247 total)
- Mix: PDF, Markdown, DOCX, HTML
- States: 9 completed, 2 processing, 1 failed
- Shows: System can handle various doc types and states

**Internal Wiki:**
- 5 documents (out of 2,103 total)
- Shows: Partial sync in progress (60% complete)
- Useful for: Testing sync progress UI

**API Reference:**
- 4 documents (all completed)
- Shows: Healthy, stable KB
- Useful for: Testing search/query features

---
