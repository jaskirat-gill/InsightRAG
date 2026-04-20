# InsightRAG — Knowledge Base Control Plane for RAG Systems

A full-stack platform for syncing, processing, and searching documents via a hybrid RAG pipeline, with an MCP server for AI assistant integration.

- **Sync** documents from AWS S3 via a plugin system
- **Process** documents (parse → chunk → embed → index) into Qdrant vector DB
- **Search** via hybrid retrieval (vector + keyword) exposed through an MCP server
- **Monitor** KB health, document status, and retrieval analytics in a web UI
- **Manage** users and roles with JWT-based authentication and RBAC

**GitHub:** https://github.com/jaskirat-gill/InsightRAG

---

## Demo credentials

**Demo video:** https://youtu.be/-OyOqQNddfs

| Field | Value |
|-------|-------|
| Email | `admin@example.com` |
| Password | `Admin123!` |

The database seeds this account automatically on first start.

---

## Quick start

### Prerequisites

| Tool | Version |
|------|---------|
| Docker Desktop | 24+ |
| Node.js | 22+ |
| Git | any |

### 1. Clone and configure

```bash
git clone https://github.com/jaskirat-gill/InsightRAG.git
cd InsightRAG
cp .env.example .env
```

Open `.env` and fill in your AWS credentials (see [AWS & SQS setup](#aws--sqs-setup) below):

```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/your-queue
```

### 2. Start backend services

```bash
docker compose up --build
```

First build takes 5–15 minutes. When logs settle and you see `Application startup complete`, the backend is ready.

| Service | URL |
|---------|-----|
| Sync Service API docs | http://localhost:8000/docs |
| Query Engine API docs | http://localhost:8001/docs |
| MCP Server | http://localhost:8002/mcp |
| Qdrant dashboard | http://localhost:6333/dashboard |
| Postgres | localhost:5433 |

### 3. Start the frontend

Open a second terminal:

```bash
cd frontend
npm ci
npm run dev -- --host
```

Open **http://localhost:5173** and log in with the demo credentials above.

> **Docker-only frontend:** add `ports: ["5173:80"]` under the `frontend` service in `docker-compose.yml` instead of running the Vite dev server.

---

## AWS & SQS setup

The S3 plugin requires both an S3 bucket and an SQS queue. `SQS_QUEUE_URL` must be a valid queue URL — leaving it empty causes a sync crash.

See **`backend/sync-service/AWS_SETUP.md`** for the full step-by-step guide covering:

- Creating the S3 bucket and IAM policy
- Creating the IAM user and access keys
- Creating the SQS queue and wiring S3 event notifications to it

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AWS_ACCESS_KEY_ID` | Yes | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS secret key |
| `AWS_REGION` | Yes | S3 bucket region |
| `S3_BUCKET_NAME` | Yes | S3 bucket to sync from |
| `SQS_QUEUE_URL` | Yes | SQS queue URL for S3 event notifications |
| `SYNC_INTERVAL_SECONDS` | No | Background sync interval in seconds (default `300`, set `0` to disable) |
| `VITE_API_URL` | No | Frontend API base (default `http://localhost:8000` for local dev) |

Defaults for internal services (`DATABASE_URL`, `QDRANT_URL`, `REDIS_URL`, `SECRET_KEY`) are set in `docker-compose.yml` and work out of the box.

---

## How to use the system

1. **Login** at http://localhost:5173 with the demo credentials
2. **Settings → Plugins → Add Plugin** — configure the S3 plugin with your bucket and SQS queue URL
3. **Knowledge Bases → New** — create a KB and select the plugin as its source
4. **Knowledge Bases → Sync** — pull documents from S3 and process them into the index
5. **Settings → General → Access Token → Copy** — get your bearer token for MCP
6. **Connect your MCP client** to `http://localhost:8002/mcp` with `Authorization: Bearer <token>`

MCP tools available: `search_knowledge_base`, `get_available_collections`, `list_kb_resources`

---

## Project structure

```
InsightRAG/
├── frontend/                        # React 19 + Vite + TypeScript UI
├── backend/
│   ├── sync-service/                # FastAPI: auth, KB CRUD, plugins, sync scheduler
│   │   └── AWS_SETUP.md             # Step-by-step AWS S3 + SQS setup guide
│   ├── document-processing-engine/  # Celery worker: parse, chunk, embed, index
│   ├── query-engine/                # FastAPI: search API used by the UI
│   ├── mcp-server/                  # FastMCP: MCP tools with JWT auth
│   ├── database/                    # PostgreSQL schema (init.sql) and seed scripts
│   └── shared/                      # Shared Python utilities
├── docs/                            # Additional setup guides
│   ├── plugin-setup.md              # Configuring sync plugins via API
│   ├── plugin-development.md        # Writing new source plugins
│   └── setup-openwebui.md           # Integrating MCP with OpenWebUI
├── scripts/
│   └── run_mcp_stdio.sh             # stdio MCP transport wrapper
├── handover/                        # Client handover package
│   ├── HANDOVER.md                  # Full handover document
│   └── screenshots/                 # Setup guide screenshots
├── diagrams/                        # Architecture diagrams
├── docker-compose.yml               # Full local dev stack
├── .env.example                     # Environment variable template
└── skill.md                         # MCP tool reference for LLM agents
```

---

## Core concepts

### Knowledge bases

A KB is a named document collection with its own processing config stored in Postgres. It controls:

- **Routing** — which S3 paths feed into this KB (`sync_paths` prefix matching; longest match wins; empty = catch-all)
- **Processing** — `processing_strategy`, `chunk_size`, `chunk_overlap`

### Sync plugins

Plugins live in `backend/sync-service/app/plugins/`. The Sync Service auto-discovers any class that inherits `SourcePlugin`. Currently only `S3Plugin` is implemented. See `docs/plugin-development.md` to add new sources.

At runtime: discover plugins → load active instances → `POST /sync` → delta detection → download changed files → enqueue for processing.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Sync crashes with `InvalidAddress` | `SQS_QUEUE_URL` is empty or invalid — set a real queue URL in `.env` |
| No plugins found in Settings | Confirm plugin file is in `backend/sync-service/app/plugins/` and class inherits `SourcePlugin` |
| Sync completes but no documents appear | Check KB `storage_config.plugin_id` matches the plugin ID and `sync_paths` prefixes match actual S3 key prefixes |
| Documents stuck in `processing` | Check `docker compose logs document-processing-engine` and confirm Redis is healthy |
| MCP returns 401 | Token expired — copy a fresh Access Token from Settings → General |
| Frontend 404 on `/api` routes | Backend containers not running on expected ports; confirm `docker compose up` is healthy |

---

## Handover

See **`handover/HANDOVER.md`** for the full client handover document including feature summary, known bugs, codebase walkthrough, and future work.
