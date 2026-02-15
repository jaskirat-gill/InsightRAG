# OpenWebUI Project

## Getting Started

### Prerequisites
- **Docker** and **Docker Compose** installed.
- **Node.js 22+** (if running frontend locally outside Docker).
- **Python 3.11+** (if running backend locally outside Docker).

### Quick Start

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

