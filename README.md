# OpenWebUI Project (KB Sync + RAG + MCP)

This repo is a prototype “knowledge base control plane” for RAG systems:

- **Sync** documents from external sources via a **plugin system**
- **Process** documents (parse → chunk → embed → index) into **Qdrant**
- **Query** via a hybrid retriever and expose search via an **MCP server**
- **Observe** KB/document health + retrieval analytics in a web UI

## Links

- **Project board**: `https://github.com/users/Sherry-Rui-Xia/projects/1`

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

### S3 plugin (optional)

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

## Using the system (high-level flow)

### 1) Create/activate a source plugin instance

The Sync Service exposes a small plugin management API:

- Discover available plugin classes: `GET /plugins/discovered`
- Create a plugin instance (DB row): `POST /plugins`
- Test a plugin’s connection: `POST /plugins/{plugin_id}/test`
- Activate/deactivate: `PUT /plugins/{plugin_id}` with `is_active: true|false`

The OpenAPI docs are at `http://localhost:8000/docs`.

Tip: The repo includes an `S3Plugin` implementation (`app.plugins.s3.S3Plugin`) and
an example seeder script (`backend/sync-service/init_db.py`) you can adapt.

#### Example: create + activate an S3 plugin instance (API)

This assumes the Sync Service container has AWS env vars configured (see `docker-compose.yml`)
or you pass credentials directly in the JSON config.

```bash
# 1) See what plugin classes are available
curl -sS http://localhost:8000/plugins/discovered | jq .

# 2) Create a plugin instance (this creates a row in source_plugin_config)
curl -sS -X POST http://localhost:8000/plugins \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "s3-main",
    "module_name": "app.plugins.s3",
    "class_name": "S3Plugin",
    "is_active": true,
    "config": {
      "bucket_name": "my-bucket",
      "region_name": "us-east-1"
    }
  }' | jq .

# 3) List plugin instances and grab the numeric plugin_id ("id")
curl -sS http://localhost:8000/plugins | jq .

# 4) Test connection (replace {plugin_id})
curl -sS -X POST http://localhost:8000/plugins/{plugin_id}/test | jq .

# 5) Trigger a sync cycle for all active plugins
curl -sS -X POST http://localhost:8000/sync | jq .
```

### 2) Create a knowledge base and route documents into it

Create KBs via the Sync Service API under `/api/v1/knowledge-bases`.

If you want KB routing from a plugin instance, set the KB’s `storage_config` like:

```json
{
  "plugin_id": 1,
  "sync_paths": ["team-a/policies", "team-a/handbook"]
}
```

#### Example: create a KB routed from a plugin instance (API)

```bash
curl -sS -X POST http://localhost:8000/api/v1/knowledge-bases \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_SYNC_SERVICE_API_KEY_OR_TOKEN' \
  -d '{
    "name": "Team A Policies",
    "description": "Policies + handbook content",
    "storage_provider": "plugin",
    "storage_config": { "plugin_id": 1, "sync_paths": ["team-a/policies", "team-a/handbook"] },
    "processing_strategy": "semantic",
    "chunk_size": 512,
    "chunk_overlap": 50
  }' | jq .
```

Auth note: the Sync Service has its own auth system and permissions. Use the `/api/v1/auth/*`
and `/api/v1/api-keys/*` endpoints (see the Swagger docs) to create an API key/token for requests.

### 3) Run a sync

- Manually: `POST /sync`
- Or automatically: the background scheduler runs every `SYNC_INTERVAL_SECONDS`

### 4) Query via MCP

The MCP server exposes tools including `search_knowledge_base(query, top_k, kb_id, score_threshold)`.

- HTTP MCP endpoint (compose): `http://localhost:8002/mcp`
- Stdio helper script (runs a container with stdio transport): `scripts/run_mcp_stdio.sh`

If you’re using OpenWebUI, see `docs/setup-openwebui.md` for how to register the MCP tool.

## Writing a new sync plugin

The plugin system is intentionally lightweight: **a plugin is a Python class** that
inherits `SourcePlugin` and implements 4 methods.

### 1) Implement the interface

Create a new file under:

- `backend/sync-service/app/plugins/my_source.py`

Implement `SourcePlugin` from `backend/sync-service/app/plugins/interface.py`.

Minimal template:

```python
from typing import Any, Dict, Generator
from app.plugins.interface import SourcePlugin, FileEvent


class MySourcePlugin(SourcePlugin):
    @classmethod
    def config_schema(cls) -> list:
        # Used by the frontend (and API clients) to render config forms.
        return [
            {
                "name": "api_key",
                "label": "API Key",
                "type": "password",
                "required": True,
                "placeholder": "..."
            },
        ]

    def initialize(self, config: Dict[str, Any]) -> None:
        self.config = config
        self.validate_config(config)
        # create client(s) here

    def validate_config(self, config: Dict[str, Any]) -> None:
        if not config.get("api_key"):
            raise ValueError("Missing api_key")

    def test_connection(self) -> bool:
        # Return True when credentials + connectivity look good
        return True

    def sync(self) -> Generator[FileEvent, None, None]:
        # Yield FileEvent(source_type=..., event_type=..., file_path=..., metadata=...)
        yield FileEvent(source_type="my_source", event_type="present", file_path="docs/a.pdf")

    def download_file(self, file_path: str, local_destination: str) -> None:
        # Download remote file_path into local_destination
        raise NotImplementedError
```

Notes:

- `sync()` should yield `FileEvent`s with:
  - `event_type`: usually `"present"` for discovered files, or `"deleted"` when removed
  - `metadata`: include a stable fingerprint like an `etag` when possible (used for delta detection)
- The Sync Service will mark anything not “seen” during a sync cycle as deleted (reconciliation)

### 2) Run & verify discovery

Plugin discovery scans the `app.plugins` package. If the service is running,
your class should appear in:

- `GET /plugins/discovered`

### 3) Register a plugin instance (DB row) and activate it

Use the Sync Service API:

1. `POST /plugins` with `module_name`, `class_name`, `config`
2. `POST /plugins/{plugin_id}/test`
3. `PUT /plugins/{plugin_id}` with `is_active: true`
4. `POST /sync`

Reference docs: `backend/sync-service/PLUGINS.md`

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

