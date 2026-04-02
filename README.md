# OpenWebUI Project (KB Sync + RAG + MCP)

This repo is a prototype “knowledge base control plane” for RAG systems:

- **Sync** documents from external sources via a **plugin system**
- **Process** documents (parse → chunk → embed → index) into **Qdrant**
- **Query** via a hybrid retriever and expose search via an **MCP server**
- **Observe** KB/document health + retrieval analytics in a web UI

## Links

- **Project board**: `https://github.com/users/Sherry-Rui-Xia/projects/1`

### Language / runtime versions

- **Node.js 22** is the frontend build/runtime assumption.
  The Docker build uses `node:22-alpine`.
- **npm** is the active frontend package manager assumption.
  The frontend Docker build runs `npm ci`, and the repo includes `frontend/package-lock.json`.
- **Python 3.11** is the backend runtime assumption.
  All Python services build from `python:3.11-slim`.
- **nginx** serves the production frontend image.
- **Docker Compose** is the main way to run the full stack locally.

## Quick start (Docker Compose)

### Prerequisites

- **Docker** and **Docker Compose**
- Optional for local dev (outside Docker): **Node.js 22+**, **Python 3.11+**

### Run the stack

```bash
docker-compose up --build
```

### What comes up

- **Sync Service (API + plugins + KB CRUD)**: `http://localhost:8000/docs`
- **Query Engine**: `http://localhost:8001/docs`
- **MCP Server (HTTP transport by default)**: `http://localhost:8002/mcp`
- **Qdrant dashboard**: `http://localhost:6333/dashboard`
- **Postgres**: exposed on host `localhost:5433` (internal `postgres:5432`)

Note: by default, `docker-compose.yml` **does not publish** the `frontend` container to a host port.
For a UI, either run the frontend locally (recommended for development) or add a port mapping (see below).

## Frontend (local dev vs Docker)

### Option A (recommended): run backend in Docker, frontend locally

1) Start the backend services:

```bash
docker-compose up --build
```
The frontend can be run by:

2) In a second terminal, start the Vite dev server:

```bash
cd frontend
npm ci
npm run dev -- --host
```

Then open the UI at `http://localhost:5173`.

The Vite dev proxy is configured to forward:
- `/api` → `http://localhost:8000`
- `/plugins` → `http://localhost:8000`
- `/sync` → `http://localhost:8000`

### Option B: publish the Docker-built frontend

The `frontend` image serves static assets via **nginx** (container port 80). To expose it locally,
add a `ports:` mapping under the `frontend:` service in `docker-compose.yml`, for example:

```yaml
ports:
  - "5173:80"
```

Then the UI will be available at `http://localhost:5173`.

## Core concepts

### Knowledge bases

Knowledge bases live in Postgres (`knowledge_bases` table). A KB controls:

- **Routing**: which incoming documents belong to which KB
- **Processing defaults**: `processing_strategy`, `chunk_size`, `chunk_overlap`
- **Storage**: `storage_provider` + `storage_config` (provider-specific JSON)

### Sync plugins (sources)

The Sync Service discovers Python plugins under `backend/sync-service/app/plugins/`.
Each active plugin instance is configured in the Sync Service DB table:
`source_plugin_config` (managed by SQLModel).

At runtime:

1. Sync Service **discovers plugin classes** (imports `app.plugins.*`)
2. It loads **active plugin instances** from `source_plugin_config`
3. `POST /sync` runs sync for all active plugin instances
4. Each plugin yields `FileEvent`s; the Sync Service does delta detection in `synced_file`
5. New/changed files get downloaded to a shared volume and enqueued for processing

### KB routing with `plugin_id` + `sync_paths`

The Sync Service routes each discovered file to a KB using:

- `knowledge_bases.storage_config.plugin_id` (the source plugin instance ID), and
- `knowledge_bases.storage_config.sync_paths` (a list of path prefixes)

Routing rule: **longest prefix wins**. A KB can be a “catch-all” for a plugin by
setting an empty `sync_paths` list.

## Configuration (env vars)

Most defaults are in `docker-compose.yml`. Common env vars you may want:

### Sync Service

- `DATABASE_URL`: Postgres DSN (default in compose)
- `QDRANT_URL`: Qdrant base URL (default in compose)
- `REDIS_URL`: Redis DSN (default in compose)
- `SYNC_INTERVAL_SECONDS`: background sync interval (default 300; set `0` to disable)

### S3 plugin

If you use the built-in `S3Plugin`, set:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET_NAME`
- Optional: `SQS_QUEUE_URL` (enables near-real-time updates; otherwise it reconciles via list-objects)

See `backend/sync-service/AWS_SETUP.md` for step-by-step AWS + SQS setup.

### MCP server

- `QDRANT_URL`
- `DATABASE_URL`
- `DEFAULT_SCORE_THRESHOLD` (default `0.5`)

## Using the system

The current system is centered on direct MCP requests such as `get` and `set`. A typical user flow is:

### 1) Start from the document source

Open the S3 bucket that contains the files you want to make available in the system.

If the source connection has not been configured yet, the UI has a plugin manager under
**Settings** -> **Plugins** where an admin can add a plugin instance and save its credentials.
Detailed setup is in `docs/plugin-setup.md`.

### 2) Open the Knowledge Bases page

In the left sidebar, click **Knowledge Bases**.

This page is the main operational screen for syncing and managing indexed content. At the top
right you will see:

- **Sync**: trigger a sync for all active plugins
- **Reset**: clear sync cache so the next sync re-processes files
- **New**: create a new knowledge base

If you are creating a knowledge base for the first time:

1. Click **New**
2. Enter a KB name and optional description
3. Choose the plugin source from **Storage Configuration**
4. Optionally fill in **Sync Folders** to route only specific S3 paths into that KB
5. Leave the default chunking settings unless you need different processing behavior
6. Click **Create Knowledge Base**

If the KB already exists, use the per-KB configuration controls to adjust sync folders later.

### 3) Configure the Sync plugin

The system currently supports only S3 as a sync source.

To configure it in the UI:

1. Click **Settings** in the left sidebar
2. Open **Plugins**
3. Add or edit the **Sync** plugin
4. Configure it with your AWS S3 credentials
5. Save the plugin configuration

### 4) Sync the knowledge base

From the **Knowledge Bases** page, click **Sync** in the top action bar.

The button changes to `Syncing…` while the request is in progress, and the page shows a short
status badge when the sync call finishes. This step pulls data from active source plugins,
detects changed files, and queues them for document processing.

### 5) Get your Bearer token

The MCP server is authenticated so it can enforce per-user knowledge base access.

To get the token in the UI:

1. Click **Settings** in the left sidebar
2. Stay on the **General** tab
3. In **Session Tokens**, find **Access Token**
4. Click **Copy**

### 6) Ask questions through MCP

Once the KB has been synced and you have the Bearer token, connect your MCP client to:

- HTTP MCP endpoint (compose): `http://localhost:8002/mcp`
- Stdio helper script: `scripts/run_mcp_stdio.sh`

When configuring MCP, use Bearer authentication with the token you copied in step 5.

You can then send direct requests to the system and ask questions about the indexed database content.

If you’re using OpenWebUI, see `docs/setup-openwebui.md` for the MCP registration flow.

## Plugin docs

The README only covers the operational flow.

- Plugin manager and source setup: `docs/plugin-setup.md`
- Writing a new sync plugin: `docs/plugin-development.md`

## Project structure

- `frontend/`: React + Vite UI (KBs, health dashboard, document details)
- `backend/sync-service/`: FastAPI sync service (KB CRUD + plugin manager + sync scheduler)
- `backend/document-processing-engine/`: worker that parses/chunks/embeds/indexes docs
- `backend/query-engine/`: query API (separate from MCP; used by the UI)
- `backend/mcp-server/`: MCP server wrapping hybrid search (and retrieval tracking)
- `docs/`: setup notes (OpenWebUI MCP integration, migrations, etc.)

## Troubleshooting

- **No plugins found**: confirm your plugin file is in `backend/sync-service/app/plugins/` and the class inherits `SourcePlugin`.
- **Plugin exists but won’t initialize**: check `POST /plugins/{id}/test` output and ensure `is_active=true`.
- **Sync runs but no docs appear**: ensure your KB’s `storage_config.plugin_id` matches the plugin instance `id` and `sync_paths` prefixes match the file paths emitted by `sync()`.
- **MCP stdio transport is noisy/broken**: use `scripts/run_mcp_stdio.sh` (it avoids Docker lifecycle chatter on stdout).
