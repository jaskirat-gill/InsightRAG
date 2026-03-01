# CI/CD Pipeline Tasks (GitHub Actions)

This project uses the GitHub Actions workflow in `.github/workflows/ci-cd.yml`.

## When the pipeline runs

- On every push to `main`
- On every pull request

## What the pipeline does

### 1) `frontend-checks` - Frontend lint and build

- Checks out the repository
- Sets up Node.js `20` with npm cache
- Installs dependencies in `frontend/` using `npm ci`
- Runs lint with `npm run lint`
- Runs build with `npm run build`

Purpose: catch frontend code quality issues and build errors early.

### 2) `backend-checks` - Python dependency and syntax validation

Runs as a matrix job for:
- `backend/sync-service`
- `backend/query-engine`
- `backend/document-processing-engine`
- `backend/mcp-server`

For each service:
- Checks out the repository
- Sets up Python `3.11`
- Installs dependencies from `requirements.txt` if present
- Validates Python syntax via `python -m compileall -q .`

Purpose: ensure backend services can install dependencies and compile without syntax errors.

### 3) `docker-build` - Docker Compose image build

Depends on:
- `frontend-checks`
- `backend-checks`

Tasks:
- Checks out the repository
- Sets up Docker Buildx
- Prints Docker and Docker Compose versions
- Builds project images using `docker compose -f docker-compose.yml build`

Purpose: verify the full stack can be containerized successfully.

### 4) `smoke-test` - Runtime health check in Docker

Depends on:
- `docker-build`

Tasks:
- Checks out the repository
- Starts required services: `postgres`, `redis`, `qdrant`, `query-engine`, `sync-service`
- Waits for health checks:
  - Postgres container health is `healthy`
  - Redis container health is `healthy`
  - `http://localhost:8000/health` (sync-service) reports healthy
  - `http://localhost:8001/health` (query-engine) reports healthy
- Uses empty env vars for optional AWS/VITE settings to avoid compose warnings
- Prints Docker Compose logs if a failure happens
- Always tears down services with `docker compose ... down -v`

Purpose: confirm key services start and respond correctly after build.

## Job order and flow

1. `frontend-checks` and `backend-checks` run in parallel.
2. `docker-build` runs only if both checks pass.
3. `smoke-test` runs only if docker build passes.

If any required job fails, the workflow fails.

## 5) `deploy-production` - CD to DigitalOcean Droplet

Depends on:
- `smoke-test`

Runs only when:
- Branch is `main`

Tasks:
- Uses an SSH-based GitHub Action to connect to a DigitalOcean Droplet.
- On the Droplet, runs:
  - `git fetch && git checkout main && git pull`
  - `docker compose -f docker-compose.yml up -d --build`

Notes:
- SSH connection details (`DO_SSH_HOST`, `DO_SSH_USER`, `DO_SSH_KEY`) and optional `DO_APP_PATH` are provided via GitHub Actions secrets.
- The `.env` file with production secrets lives only on the Droplet.
