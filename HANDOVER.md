# InsightRAG — Project Handover Document

**Course:** CPSC 319  
**Team:** Sherry Rui Xia, Jaskirat Gill, and team  
**Handover Date:** April 20, 2025  
**Project:** InsightRAG — Knowledge Base Control Plane for RAG Systems

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Prerequisites](#3-prerequisites)
4. [Step-by-Step Setup Guide](#4-step-by-step-setup-guide)
   - [Step 1: Clone the Repository](#step-1-clone-the-repository)
   - [Step 2: Configure Environment Variables](#step-2-configure-environment-variables)
   - [Step 3: Set Up AWS S3 Credentials](#step-3-set-up-aws-s3-credentials)
   - [Step 4: Start Backend Services](#step-4-start-backend-services)
   - [Step 5: Start the Frontend](#step-5-start-the-frontend)
   - [Step 6: Access the Application](#step-6-access-the-application)
   - [Step 7: First-Time Login](#step-7-first-time-login)
   - [Step 8: Configure the S3 Plugin](#step-8-configure-the-s3-plugin)
   - [Step 9: Create a Knowledge Base](#step-9-create-a-knowledge-base)
   - [Step 10: Sync Documents](#step-10-sync-documents)
   - [Step 11: Get Your Access Token (for MCP)](#step-11-get-your-access-token-for-mcp)
   - [Step 12: Connect an MCP Client](#step-12-connect-an-mcp-client)
5. [Feature Summary](#5-feature-summary)
   - [Implemented Features](#51-implemented-features)
   - [Features Not Implemented](#52-features-not-implemented)
   - [Partially Implemented Features](#53-partially-implemented-features)
6. [Known Bugs and Limitations](#6-known-bugs-and-limitations)
7. [Codebase Structure](#7-codebase-structure)
8. [Production Deployment](#8-production-deployment)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Project Overview

**InsightRAG** is a knowledge base control plane for Retrieval-Augmented Generation (RAG) systems. It allows teams to:

- **Sync** documents from external cloud storage (AWS S3) into a managed index via a plugin system
- **Process** documents through a pipeline: parse → chunk → generate embeddings → index into a Qdrant vector database
- **Search** indexed content using hybrid retrieval (vector + keyword search with RRF fusion)
- **Expose** search capabilities via a Model Context Protocol (MCP) server, compatible with Claude and other AI assistants
- **Monitor** knowledge base and document health, retrieval analytics, and chunk-level statistics through a web UI
- **Manage** users, roles, and API keys with a role-based access control (RBAC) system

**Live deployment:** `https://cpsc319.jaskiratgill.ca` (DigitalOcean droplet, requires access)

**Built-in documentation:** Visit `/docs` on any running instance (e.g., `http://localhost:5173/docs` locally or `https://cpsc319.jaskiratgill.ca/docs`) for the interactive docs site covering Quick Start, Features, Plugin Setup, MCP Setup, and team information.

**GitHub repository:** `https://github.com/Sherry-Rui-Xia/OpenWebUI-Project`

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, TypeScript, Tailwind CSS, Radix UI |
| Sync Service (API) | Python 3.11, FastAPI 0.109, SQLModel, Celery |
| Document Processing | Python 3.11, Celery, sentence-transformers, unstructured |
| Query Engine | Python 3.11, FastAPI 0.109 |
| MCP Server | Python 3.11, FastMCP 3.0 |
| Vector Database | Qdrant |
| Relational Database | PostgreSQL 15 |
| Cache / Task Queue | Redis 7 |
| Containerization | Docker, Docker Compose |
| Reverse Proxy | nginx (production) |
| CI/CD | GitHub Actions → DigitalOcean droplet |
| Node.js | v22 (frontend build) |

---

## 3. Prerequisites

Before setting up the project locally, ensure the following are installed:

| Tool | Minimum Version | Download |
|------|----------------|---------|
| Docker Desktop | 24+ | https://www.docker.com/products/docker-desktop |
| Docker Compose | v2 (bundled with Docker Desktop) | (included) |
| Node.js | 22+ | https://nodejs.org |
| npm | 10+ (bundled with Node.js) | (included) |
| Git | Any recent version | https://git-scm.com |

**Optional** (for MCP integration):
- An AWS account with an S3 bucket (see Step 3)
- Claude Desktop or another MCP-compatible client

**Verify your installations** by running:

```bash
docker --version
docker compose version
node --version
npm --version
git --version
```

---

## 4. Step-by-Step Setup Guide

### Step 1: Clone the Repository

Open your terminal and run:

```bash
git clone https://github.com/Sherry-Rui-Xia/OpenWebUI-Project.git
cd OpenWebUI-Project
```

<!-- Screenshot: terminal showing successful git clone output -->

---

### Step 2: Configure Environment Variables

The project uses a `.env` file to store configuration. A template is provided.

```bash
cp .env.example .env
```

Open `.env` in a text editor and fill in the required values:

```env
# ── AWS / S3 (required for document sync) ────────────────
AWS_ACCESS_KEY_ID=AKIA...          # Your AWS Access Key ID
AWS_SECRET_ACCESS_KEY=wJalr...     # Your AWS Secret Access Key
AWS_REGION=us-east-1               # Your S3 bucket region
S3_BUCKET_NAME=your-bucket-name    # Your S3 bucket name

# ── SQS (optional — enables real-time file change detection) ──
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/openwebui-s3-events

# ── Sync Scheduler ───────────────────────────────────────
# How often background sync runs (seconds). Set to 0 to disable.
SYNC_INTERVAL_SECONDS=300

# ── Frontend API Base ────────────────────────────────────
# For local development, leave as-is:
VITE_API_URL=http://localhost:8000

# ── OpenWebUI Integration (optional) ────────────────────
VITE_OPENWEBUI_BASE_URL=http://localhost:3000
VITE_OPENWEBUI_TOKEN=eyJhbGci...
VITE_OPENWEBUI_TIMEOUT_MS=120000
```

> **Important:** Never commit your `.env` file to version control. It is already listed in `.gitignore`.

<!-- Screenshot: .env file open in a text editor with placeholder values -->

---

### Step 3: Set Up AWS S3 Credentials

If you want to use the document sync feature, you need an AWS S3 bucket and IAM credentials.

#### 3a. Create an S3 Bucket

1. Go to the [Amazon S3 Console](https://s3.console.aws.amazon.com/s3/)
2. Click **Create bucket**
3. Enter a bucket name (e.g., `insightrag-docs`) and select a region
4. Leave **Block Public Access** enabled
5. Click **Create bucket**

<!-- Screenshot: AWS S3 Console - Create bucket dialog -->

#### 3b. Create an IAM Policy

1. Go to [IAM Console → Policies](https://us-east-1.console.aws.amazon.com/iamv2/home#/policies)
2. Click **Create policy** → choose **JSON**
3. Paste the following (replace `YOUR_BUCKET_NAME`):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetObject",
                "s3:GetBucketLocation"
            ],
            "Resource": [
                "arn:aws:s3:::YOUR_BUCKET_NAME",
                "arn:aws:s3:::YOUR_BUCKET_NAME/*"
            ]
        }
    ]
}
```

4. Name the policy (e.g., `InsightRAG-S3-Read`) and click **Create policy**

#### 3c. Create an IAM User

1. Go to [IAM Console → Users](https://us-east-1.console.aws.amazon.com/iamv2/home#/users)
2. Click **Create user** → enter a name (e.g., `insightrag-sync`)
3. Select **Attach policies directly** → find and select `InsightRAG-S3-Read`
4. Click **Create user**

#### 3d. Generate Access Keys

1. Click on the new user → go to **Security credentials** tab
2. Scroll to **Access keys** → click **Create access key**
3. Select **Application running outside AWS**
4. Copy the **Access Key ID** and **Secret Access Key** into your `.env` file

<!-- Screenshot: AWS IAM Console showing Access Key creation screen -->

> **Note:** If you do not have AWS credentials, you can still run the application. The sync and document processing features will be unavailable, but the UI, authentication, and MCP server will work.

---

### Step 4: Start Backend Services

From the project root directory, run:

```bash
docker compose up --build
```

This command builds and starts the following 8 services:

| Service | Description | Host Port |
|---------|-------------|-----------|
| `sync-service` | Core API: auth, KB management, plugins, sync | `8000` |
| `query-engine` | Search/query API used by the UI | `8001` |
| `mcp-server` | MCP server for AI assistant integration | `8002` |
| `document-processing-engine` | Celery worker: parse, chunk, embed, index | (none) |
| `postgres` | Relational database (auth, KB metadata) | `5433` |
| `qdrant` | Vector database | `6333` |
| `redis` | Cache and task queue | `6379` |
| `frontend` | Pre-built React UI served by nginx | (no host port by default) |

The first build may take **5–10 minutes** to download images and install dependencies.

<!-- Screenshot: Docker Desktop showing all 8 containers running -->

Wait until you see log output indicating all services are ready. You can verify with:

```bash
# Check sync service health
curl http://localhost:8000/health

# Check query engine health
curl http://localhost:8001/health
```

Both should return `{"status": "ok"}` or similar.

---

### Step 5: Start the Frontend

The recommended approach for local development is to run the Vite dev server outside Docker for fast hot-reloading.

Open a **new terminal window** and run:

```bash
cd frontend
npm ci
npm run dev -- --host
```

<!-- Screenshot: terminal showing Vite dev server starting with "Local: http://localhost:5173" -->

The Vite development server automatically proxies API requests:

- `/api/*` → `http://localhost:8000` (sync service)
- `/plugins/*` → `http://localhost:8000`
- `/sync` → `http://localhost:8000`

> **Alternative (Docker-only frontend):** If you prefer not to run Node.js locally, add the following to the `frontend` service in `docker-compose.yml` and then visit `http://localhost:5173`:
> ```yaml
> ports:
>   - "5173:80"
> ```

---

### Step 6: Access the Application

Open your browser and navigate to:

```
http://localhost:5173
```

You should see the InsightRAG landing page.

<!-- Screenshot: InsightRAG landing page with hero section and navigation -->

The following service dashboards are also available directly:

| Service | URL |
|---------|-----|
| Sync Service API Docs | http://localhost:8000/docs |
| Query Engine API Docs | http://localhost:8001/docs |
| MCP Server | http://localhost:8002/mcp |
| Qdrant Dashboard | http://localhost:6333/dashboard |

---

### Step 7: First-Time Login

The database is automatically seeded with a default admin account. No manual user creation is needed.

1. Go to `http://localhost:5173`
2. Log in with the default admin credentials:

| Field | Value |
|-------|-------|
| **Email** | `admin@example.com` |
| **Password** | `Admin123!` |

<!-- Screenshot: InsightRAG login page with admin credentials entered -->

3. You will be redirected to the Knowledge Bases dashboard

<!-- Screenshot: Knowledge Bases dashboard after login -->

> **Tip:** Once logged in, you can create additional users and assign roles (admin, developer, end_user) from the **User Management** page in the left sidebar.

---

### Step 8: Configure the S3 Plugin

Before syncing documents, you must configure a source plugin that tells the system where to fetch files from.

1. In the left sidebar, click **Settings**
2. Select the **Plugins** tab

<!-- Screenshot: Settings page with Plugins tab highlighted -->

3. Click **Add Plugin** (or the `+` button)
4. Fill in the plugin configuration:
   - **Name:** A descriptive name (e.g., `My S3 Source`)
   - **Module:** `app.plugins.s3`
   - **Class:** `S3Plugin`
   - **Active:** Toggle on
   - **Config → bucket_name:** Your S3 bucket name
   - **Config → region_name:** Your AWS region (e.g., `us-east-1`)
   - **Config → sqs_queue_url:** *(optional)* Your SQS queue URL for real-time sync

<!-- Screenshot: Plugin configuration form filled in -->

5. Click **Save**
6. Click **Test Connection** to verify the plugin can reach your S3 bucket

<!-- Screenshot: Plugin list showing the S3 plugin with a green "Connected" status -->

> If you do not have AWS credentials, skip this step. The system will still run but no documents can be synced.

---

### Step 9: Create a Knowledge Base

A Knowledge Base (KB) defines a logical collection of documents with its own processing configuration and routing rules.

1. In the left sidebar, click **Knowledge Bases**
2. Click **New** (top right)

<!-- Screenshot: Knowledge Bases page with the New button highlighted -->

3. Fill in the form:
   - **Name:** A descriptive name (e.g., `Company Policies`)
   - **Description:** *(optional)*
   - **Storage Configuration → Plugin:** Select the S3 plugin you created
   - **Sync Folders:** *(optional)* Enter S3 path prefixes to route into this KB (e.g., `team-a/policies`). Leave empty to sync all files from the plugin.
   - **Chunk Size:** `512` (default — number of tokens per chunk)
   - **Chunk Overlap:** `50` (default — overlap between adjacent chunks)

<!-- Screenshot: New Knowledge Base form filled in -->

4. Click **Create Knowledge Base**

<!-- Screenshot: Knowledge Bases list showing the newly created KB -->

**Routing logic:** When the sync runs, files are routed to a KB based on path prefix matching. The longest matching prefix wins. A KB with no sync folders acts as a catch-all for its plugin.

---

### Step 10: Sync Documents

Once a plugin and KB are configured, trigger a sync to pull documents from S3.

1. On the **Knowledge Bases** page, click **Sync** in the top action bar

<!-- Screenshot: Knowledge Bases page with the Sync button highlighted -->

2. The button changes to **Syncing...** while the request is in flight
3. After the sync API call completes, a status badge appears

<!-- Screenshot: Sync status badge showing "Sync triggered" -->

The sync process works as follows:

1. The sync service queries all active plugins for file listings
2. It compares against previously synced files (delta detection)
3. New or changed files are downloaded to a shared volume
4. Download tasks are queued in Redis for the document processing engine
5. The processing engine parses, chunks, embeds, and indexes each file into Qdrant

> **Background sync:** By default, a background sync runs every 300 seconds (configurable via `SYNC_INTERVAL_SECONDS` in `.env`). Set to `0` to disable automatic background sync.

> **Reset sync cache:** Click **Reset** to clear the sync delta cache. The next sync will re-process all files from scratch. Use with caution.

To check document processing status, click on a KB, then click on any document to view its status badge (`processing`, `completed`, or `failed`).

<!-- Screenshot: Document details page showing status badges -->

---

### Step 11: Get Your Access Token (for MCP)

The MCP server requires a valid bearer token from the sync service auth system.

1. In the left sidebar, click **Settings**
2. Stay on the **General** tab
3. Find the **Session Tokens** section
4. Click **Copy** next to **Access Token**

<!-- Screenshot: Settings General tab showing the Access Token field with Copy button -->

Keep this token safe. It grants access to all knowledge bases associated with your account.

---

### Step 12: Connect an MCP Client

InsightRAG exposes three MCP tools that AI assistants (Claude, etc.) can call:

| Tool | Description |
|------|-------------|
| `search_knowledge_base` | Hybrid search (vector + keyword) across indexed documents |
| `get_available_collections` | List all knowledge bases accessible to the authenticated user |
| `list_kb_resources` | Full inventory of KBs and their documents with metadata |

#### Option A: HTTP Transport (recommended)

The MCP server listens at `http://localhost:8002/mcp`.

Configure your MCP client with:

- **URL:** `http://localhost:8002/mcp`
- **Authentication:** Bearer token (paste the token from Step 11)

**Claude Desktop example** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "insightrag": {
      "command": "curl",
      "args": [
        "-s", "-N",
        "-H", "Authorization: Bearer YOUR_ACCESS_TOKEN",
        "http://localhost:8002/mcp"
      ]
    }
  }
}
```

<!-- Screenshot: Claude Desktop MCP configuration dialog -->

#### Option B: stdio Transport (local development)

```bash
./scripts/run_mcp_stdio.sh
```

The stdio wrapper keeps stdout clean for the MCP protocol.

#### Option C: OpenWebUI Integration

If you are using OpenWebUI:

1. Go to **Settings → Admin Settings → External Tools**
2. Click **+** → change type to **MCP** (not OpenAPI)
3. Set URL to `http://host.docker.internal:8002/mcp`
4. Set bearer auth with the token from Step 11
5. Enter an ID and name → click **Check Connection** → **Save**

<!-- Screenshot: OpenWebUI External Tools settings page with MCP configuration -->

> **Note:** If OpenWebUI only supports a single static bearer token, all OpenWebUI users will share that token's KB access scope.

---

## 5. Feature Summary

### 5.1 Implemented Features

#### Frontend (React + Vite)

| Feature | Description |
|---------|-------------|
| Authentication | JWT login, token refresh, session expiry dialog, role-based UI |
| Landing page | Animated hero section, feature cards, demo gallery, stats section |
| Documentation pages | Quick start, plugin setup guide, MCP integration guide, team section |
| Knowledge Base dashboard | List all KBs, sync status badges, create/edit KBs |
| Document management | List documents per KB, delete, reassign, view inline |
| Inline document viewer | Renders PDFs, images, and text files directly in the browser |
| Document chunk browser | Browse individual chunks, view retrieval scores |
| Retrieval analytics | Per-document retrieval history with trend charts |
| Document heatmap | Per-page retrieval frequency heatmap for PDFs |
| Health dashboard | KB-level completion rates, chunk counts, retrieval statistics |
| User management | Admin panel to list users and assign roles |
| Settings page | Plugin configuration, access token display, general preferences |
| Dark/light theme | Toggle with persistence in localStorage |
| Responsive design | Mobile-friendly layouts with Framer Motion animations |

#### Supported Document Formats (27+)

| Category | Formats |
|----------|---------|
| Documents | PDF (`.pdf`), Word (`.docx`, `.doc`), OpenDocument (`.odt`), Rich Text (`.rtf`), EPUB (`.epub`) |
| Spreadsheets | Excel (`.xlsx`, `.xls`), CSV (`.csv`), TSV (`.tsv`) |
| Presentations | PowerPoint (`.pptx`, `.ppt`) |
| Text & Markup | Plain text (`.txt`), Markdown (`.md`), HTML (`.html`), JSON (`.json`), XML (`.xml`), YAML (`.yaml`) |
| Images (OCR) | PNG (`.png`), JPEG (`.jpg`), Bitmap (`.bmp`), TIFF (`.tiff`), HEIC (`.heic`) |

#### Processing Strategies

| Strategy | Description |
|----------|-------------|
| Semantic | Splits by sentence boundaries — best for narrative text |
| Auto | General-purpose PDF parsing, good default for most documents |
| Table Heavy | Preserves table structure in dense tabular PDFs |
| Multi-column | Handles newsletters, journals, and multi-column layouts |
| DataViz Heavy | Extracts charts and images from visual-heavy PDFs |
| Section Aware | Splits at headings, never mid-section |
| Table Preserving | Keeps each table intact — best for spreadsheets and CSVs |
| Slide Per Chunk | One chunk per slide — best for presentations |

#### Backend Services

| Feature | Description |
|---------|-------------|
| Auth system | User registration, JWT login (HS256), refresh tokens, bcrypt password hashing |
| RBAC | Roles: admin, developer, end_user; permission tables |
| Knowledge Base CRUD | Create, read, update, delete KBs with routing config |
| S3 plugin | List-objects sync with delta detection via `synced_file` table |
| Background scheduler | Configurable interval sync (default 300s) |
| Document processing pipeline | Parse → chunk → embed (sentence-transformers) → index (Qdrant) |
| Hybrid search | Vector + keyword retrieval with RRF (Reciprocal Rank Fusion) fusion |
| MCP server (HTTP) | Three tools, JWT-authenticated, per-user KB scoping |
| MCP server (stdio) | Local dev transport for stdio-based MCP clients |
| Retrieval tracking | All MCP searches logged to `document_retrieval_history` |
| API key management | Scoped API keys per user |
| Admin API | User listing, role assignment |
| CI/CD pipeline | GitHub Actions: lint, build, pytest, smoke test, deploy to DigitalOcean |

---

### 5.2 Features Not Implemented

| Feature | Notes |
|---------|-------|
| Chat interface | `Chat.tsx` component exists but is not wired into app routing and is not accessible from the UI |
| Additional sync plugins | Only AWS S3 is supported; no Google Cloud Storage, Azure Blob, local filesystem, or HTTP sources |
| Rate limiting | No rate limiting on any API endpoint |
| Observability / metrics | No Prometheus, Jaeger, or structured logging integration |
| Automatic re-processing after strategy override | Strategy override saves to the database but does not trigger the processing pipeline (marked as TODO in code) |
| Offline mode / graceful degradation | UI requires backend connectivity at all times |

---

### 5.3 Partially Implemented Features

| Feature | Status | Notes |
|---------|--------|-------|
| Document strategy override | Partial | UI and API save the strategy to the database, but re-processing is not triggered. The `TODO` comment is at `backend/sync-service/routes/documents.py:435`. |
| Chat page | Partial | `frontend/src/pages/Chat.tsx` contains OpenWebUI integration with model selection and markdown rendering, but no route exists in `App.tsx`. |
| Real-time sync via SQS | Partial | SQS integration is implemented in the S3 plugin and falls back gracefully to list-objects polling when SQS is not configured. Works end-to-end if SQS is set up. |

---

## 6. Known Bugs and Limitations

| # | Description | Severity |
|---|-------------|----------|
| 1 | Document strategy override (e.g., changing chunking strategy) saves the setting to the database but does not re-trigger the document processing pipeline | **Medium** |
| 2 | The Chat page (`Chat.tsx`) is unreachable — no route is defined for it in `App.tsx` | **Medium** |
| 3 | Session expiry dialog: if the user dismisses the re-login dialog without logging in again, the app enters a partially broken state (API requests fail silently) | **Medium** |
| 4 | No rate limiting on the `/sync` or search endpoints — rapid requests could queue duplicate processing jobs | **Medium** |
| 5 | Clicking **Reset** (sync cache clear) is a global operation and could disrupt a concurrent sync cycle | **Low** |
| 6 | S3 presigned URL generation failures surface a generic "Failed to generate S3 URL" message with no actionable detail for the user | **Low** |
| 7 | No frontend unit or integration tests — all frontend correctness relies on manual testing | **Low** |
| 8 | Backend test coverage is minimal — only the sync-service has tests (3 test cases covering plugin manager, password hashing, and JWT) | **Low** |
| 9 | KB health score may appear inaccurate while documents are still being processed (the score reflects only completed documents) | **Low** |
| 10 | No file size limits are enforced on document ingestion — very large files may cause processing timeouts | **Low** |

**Severity scale:**
- **High:** Blocks core functionality or causes major failure
- **Medium:** Significantly affects usability or reliability, but the system still works
- **Low:** Minor issue, cosmetic issue, or edge case

---

## 7. Codebase Structure

```
OpenWebUI-Project/
├── frontend/                          # React + Vite + TypeScript UI
│   ├── src/
│   │   ├── pages/                     # Page-level components
│   │   │   ├── KnowledgeBases.tsx     # KB list + sync controls
│   │   │   ├── DocumentDetails.tsx    # Document viewer + analytics
│   │   │   ├── HealthDashboard.tsx    # KB health metrics
│   │   │   ├── Settings.tsx           # Plugin config + tokens
│   │   │   ├── UserManagement.tsx     # Admin user panel
│   │   │   ├── Docs.tsx               # Documentation pages
│   │   │   ├── Landing.tsx            # Landing page
│   │   │   └── Chat.tsx               # (partial) Chat interface
│   │   ├── components/                # Reusable UI components
│   │   ├── App.tsx                    # Root component + routing
│   │   └── main.tsx                   # Entry point
│   ├── package.json                   # Dependencies + scripts
│   └── vite.config.ts                 # Vite config + API proxy
│
├── backend/
│   ├── sync-service/                  # FastAPI: auth, KB CRUD, plugins, sync
│   │   ├── app/
│   │   │   ├── plugins/               # Plugin implementations
│   │   │   │   ├── interface.py       # SourcePlugin base class
│   │   │   │   └── s3.py              # AWS S3 plugin
│   │   │   └── sync_service.py        # Sync orchestration logic
│   │   ├── routes/                    # API route handlers
│   │   │   ├── auth.py                # Login, logout, refresh
│   │   │   ├── knowledge_bases.py     # KB CRUD
│   │   │   ├── documents.py           # Document management
│   │   │   ├── plugins.py             # Plugin management
│   │   │   └── users.py               # User/admin management
│   │   ├── main.py                    # FastAPI app + sync scheduler
│   │   └── AWS_SETUP.md               # AWS S3/SQS setup guide
│   │
│   ├── document-processing-engine/    # Celery worker: parse/chunk/embed/index
│   ├── query-engine/                  # FastAPI: search API for the UI
│   ├── mcp-server/                    # FastMCP: MCP tools + JWT auth
│   ├── database/                      # PostgreSQL schema + seeds
│   │   ├── init.sql                   # Full schema (auto-runs on postgres start)
│   │   ├── seed_documents.sql         # Demo document data
│   │   └── reset_all.sql              # Full database reset
│   └── shared/                        # Shared Python utilities
│
├── deploy/
│   └── nginx/cpsc319.conf             # Production nginx config (SSL, reverse proxy)
│
├── docs/                              # Additional documentation
│   ├── plugin-setup.md                # Plugin configuration guide
│   ├── plugin-development.md          # Writing new sync plugins
│   ├── setup-openwebui.md             # OpenWebUI + MCP integration
│   ├── migration.md                   # Database migration notes
│   └── unit-tests.md                  # Running tests locally
│
├── scripts/
│   └── run_mcp_stdio.sh               # stdio MCP transport wrapper
│
├── diagrams/                          # Architecture diagrams
├── docker-compose.yml                 # Local dev stack (all 8 services)
├── docker-compose.droplet.yml         # DigitalOcean production overrides
├── .env.example                       # Environment variable template
├── .github/workflows/ci-cd.yml        # CI/CD: lint → test → build → deploy
├── README.md                          # Quick start reference
├── skill.md                           # MCP tool reference for LLM agents
└── HANDOVER.md                        # This document
```

---

## 8. Production Deployment

The production instance is deployed on a **DigitalOcean droplet** using Docker Compose with a host nginx reverse proxy for SSL termination.

### Architecture

```
Client (HTTPS 443)
       ↓
Host nginx (SSL, Let's Encrypt)
       ↓
   /           → frontend (port 8080, Docker)
   /api/sync/  → sync-service (port 8000)
   /api/query/ → query-engine (port 8001)
   /api/mcp/   → mcp-server (port 8002)
```

### Deployment Steps

```bash
# SSH into the droplet
ssh user@cpsc319.jaskiratgill.ca

# Pull latest code
git pull origin main

# Start production stack
docker compose -f docker-compose.yml -f docker-compose.droplet.yml up -d

# Check logs
docker compose logs -f
```

### CI/CD Pipeline

Every push to `main` triggers the GitHub Actions pipeline (`.github/workflows/ci-cd.yml`):

1. **Frontend:** ESLint check + Vite build
2. **Backend:** Python 3.11 syntax validation for all 4 services
3. **Tests:** pytest for sync-service and document-processing-engine
4. **Docker:** Build all images, push to GitHub Container Registry (`ghcr.io`)
5. **Smoke test:** Start postgres, redis, qdrant, sync-service, query-engine; verify `/health` endpoints
6. **Deploy:** SSH to DigitalOcean droplet → `docker compose pull` → `up -d --no-build`

### SSL Certificates

Certificates are managed by Let's Encrypt / Certbot:

```bash
sudo certbot certonly --webroot -w /var/www/html -d cpsc319.jaskiratgill.ca
```

### Required Secrets

The following secrets must be configured in GitHub repository settings for CI/CD to work:

| Secret | Purpose |
|--------|---------|
| `DO_SSH_KEY` | DigitalOcean droplet SSH private key |
| `GHCR_TOKEN` | GitHub Container Registry push token |
| `SECRET_KEY` | JWT signing key (same as in `.env`) |
| `AWS_ACCESS_KEY_ID` | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials |

---

## 9. Troubleshooting

### Docker containers fail to start

**Symptom:** One or more services exit immediately after `docker compose up`.

**Fix:** Check logs with `docker compose logs <service-name>`. Common causes:
- Port conflicts: ensure ports 8000, 8001, 8002, 5433, 6333, 6379 are free on your host
- Missing `.env` variables: ensure `.env` exists with all required values

### No plugins found in Settings → Plugins

**Symptom:** The plugin dropdown in Settings is empty.

**Fix:** Confirm that `backend/sync-service/app/plugins/s3.py` exists and that the `S3Plugin` class inherits from `SourcePlugin` (`backend/sync-service/app/plugins/interface.py`). After fixing, restart the sync-service container.

### Plugin test connection fails

**Symptom:** Clicking **Test Connection** returns an error.

**Fix:**
- Confirm your AWS credentials in `.env` are correct
- Verify the S3 bucket exists and your IAM user has `s3:ListBucket` permission
- Use `POST /plugins/{plugin_id}/test` in the API docs (`http://localhost:8000/docs`) for detailed error output

### Sync runs but no documents appear in the KB

**Symptom:** Sync completes but the Knowledge Base shows 0 documents.

**Fix:**
1. Check that the KB's **Storage Configuration → Plugin** matches the plugin instance ID
2. Verify that the **Sync Folders** path prefixes match the actual S3 key prefixes (e.g., `team-a/` must match the S3 object keys)
3. Leave **Sync Folders** empty to route all files from the plugin into this KB

### Documents stuck in "processing" status

**Symptom:** Documents show `processing` for more than a few minutes and never complete.

**Fix:**
- Check the document-processing-engine logs: `docker compose logs document-processing-engine`
- Ensure Redis is healthy: `docker compose logs redis`
- Very large files may time out during parsing; check for timeout errors in the logs

### MCP authentication fails

**Symptom:** MCP client returns `401 Unauthorized` or `403 Forbidden`.

**Fix:**
- Ensure you copied the **Access Token** from Settings → General, not an API key
- The token must be passed as `Authorization: Bearer <token>` in the HTTP header
- Tokens expire; log in again to get a fresh token if needed

### Frontend proxy errors (404 on /api routes)

**Symptom:** API calls from the UI return 404 when running the Vite dev server.

**Fix:** Confirm the backend Docker containers are running on the expected ports. Check `vite.config.ts` for the proxy target — it should point to `http://localhost:8000`.

---

*InsightRAG — CPSC 319 Final Project Handover | April 2025*
