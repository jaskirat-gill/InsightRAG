# OpenWebUI Project

## 🚀 Getting Started

### Prerequisites
- **Docker** and **Docker Compose** installed.
- **Node.js 22+** (if running frontend locally outside Docker).
- **Python 3.11+** (if running backend locally outside Docker).

### 🛠️ Quick Start

The easiest way to run the entire stack is using Docker Compose:

```bash
docker-compose up --build
```

Access the services:
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Cloud Sync Service**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Query Engine**: [http://localhost:8001/docs](http://localhost:8001/docs)
- **Qdrant Dashboard**: [http://localhost:6333/dashboard](http://localhost:6333/dashboard)

### 📂 Project Structure

- `frontend/`: React + Vite application.
- `backend/`:
  - `cloud-sync-service/`: FastAPI service for syncing documents.
  - `query-engine/`: FastAPI service for handling RAG queries.
  - `document-processing-engine/`: Python service/script for processing documents.
- `infrastructure/`: Configuration files.
- `docker-compose.yml`: Orchestration for all services.

### ⚠️ Important Notes

- **PostgreSQL Port**: Exposed on host port **5433** to avoid conflicts with local Postgres instances (internal port is standard 5432).
- **SELinux**: If you are using Linux with SELinux, volume mounts in `docker-compose.yml` have the `:z` suffix to ensure proper permissions.

### 🐛 Troubleshooting

**"Permission denied" on frontend?**
If you see permission errors, ensuring the `:z` flag is on volumes (already done in `docker-compose.yml`) usually fixes it. You may also need to run `docker-compose build --no-cache` if issues persist.
