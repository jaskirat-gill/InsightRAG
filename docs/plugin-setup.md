# Plugin setup

This guide keeps the operational README focused on using the system. Use this document when
you need to create, activate, or troubleshoot a sync plugin instance.

## Create or activate a source plugin instance

The Sync Service exposes a small plugin management API:

- Discover available plugin classes: `GET /plugins/discovered`
- Create a plugin instance (DB row): `POST /plugins`
- Test a plugin’s connection: `POST /plugins/{plugin_id}/test`
- Activate or deactivate a plugin: `PUT /plugins/{plugin_id}` with `is_active: true|false`

The OpenAPI docs are at `http://localhost:8000/docs`.

The repo includes an `S3Plugin` implementation (`app.plugins.s3.S3Plugin`) and an example
seeder script (`backend/sync-service/init_db.py`) you can adapt.

### Example: create and activate an S3 plugin instance

This assumes the Sync Service container has AWS env vars configured from `docker-compose.yml`
or that you pass credentials directly in the JSON config.

```bash
# 1) See what plugin classes are available
curl -sS http://localhost:8000/plugins/discovered | jq .

# 2) Create a plugin instance
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

## Create a knowledge base and route documents into it

Create KBs via the Sync Service API under `/api/v1/knowledge-bases`.

If you want KB routing from a plugin instance, set the KB's `storage_config` like:

```json
{
  "plugin_id": 1,
  "sync_paths": ["team-a/policies", "team-a/handbook"]
}
```

### Example: create a KB routed from a plugin instance

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
and `/api/v1/api-keys/*` endpoints in the Swagger docs to create an API key or token for API requests.

## Run a sync

- Manually: `POST /sync`
- Automatically: the background scheduler runs every `SYNC_INTERVAL_SECONDS`

## MCP authentication

HTTP MCP expects:

```text
Authorization: Bearer <sync-service access token>
```

The server enforces per-user KB access for authenticated HTTP callers. STDIO remains a trusted
local or development path and does not carry per-user HTTP auth headers.
