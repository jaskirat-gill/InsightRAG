# CPSC 319 - MVP Evaluation Report

## Adaptive RAG Intelligence System

**Intelligent Document Processing & Knowledge Base Health Management**

---

### Project Info

| Field | Details |
|---|---|
| **Team Name** | OpenWebUI Group B |
| **Project Name** | Adaptive RAG Intelligence System |
| **Group Letter** | B |
| **Client Name** | Tim J. Baek |
| **Client Contact** | tim@openwebui.com |
| **GitHub Repo** | [https://github.com/jaskirat-gill/OpenWebUI-Project](https://github.com/jaskirat-gill/OpenWebUI-Project) |
| **Requirements Report** | [CPSC319-Requirements-OpenWebUI-B.md](https://github.com/jaskirat-gill/OpenWebUI-Project/blob/main/CPSC319-Requirements-OpenWebUI-B.md) |
| **Backlog / Board** | [GitHub Project Board](https://github.com/users/Sherry-Rui-Xia/projects/1) |
| **Document Version** | 1.0 |

#### Team Members

| Name | Student ID | Role |
|---|---|---|
| Jaskirat Gill | _[ID]_ | Backend & DevOps Lead |
| Shibo Ai | _[ID]_ | Backend & MCP Integration |
| Rui Xia | 15156524 | Backend & MCP Development & Frontend |
| Crystal Zhao | _[ID]_ | Frontend & QA |

> **TA Access Note:** The GitHub repository is public. The project board is public at the link above. Teaching team members (TA, Parsa, Fahim) do not require additional permissions to access any linked resources. All links have been verified in incognito mode.

---

## MVP Deliverable

### Deployed Website Link

**Production URL:** [https://cpsc319.jaskiratgill.ca](https://cpsc319.jaskiratgill.ca)

The application is deployed on a DigitalOcean Droplet with automated CI/CD via GitHub Actions. The deployment runs Docker Compose with the following services: Frontend (React), Sync Service, Query Engine, Document Processing Engine, MCP Server, PostgreSQL, Redis, and Qdrant.

---

## MVP Scope Snapshot

The following scope was established at Requirements sign-off:

### Must Have

- **US-001:** Automatic document structure analysis and content characteristic detection
- **US-002:** Processing strategy rationale display per document
- **US-005:** Document classification into semantic categories
- **US-006:** Dynamic chunking strategy selection (semantic, hierarchical, layout-aware, table-preserving)
- **US-008:** Dashboard showing document retrieval frequency (heatmap)
- **US-009:** Automated staleness alerts with visual health indicators
- **US-012:** Retrieval performance metrics and document health scoring
- **FR-018:** System configuration UI (chunk size, staleness thresholds, strategy settings)

### Should Have

- **US-003:** Manual strategy override for documents
- **US-007:** Automatic metadata extraction and filtered search
- **US-011:** Failed query analysis and knowledge gap identification
- **US-013:** Intelligent document improvement recommendations

### Could Have

- **US-004:** Performance-based learning from retrieval outcomes
- **US-010:** Semantic contradiction detection across documents
- **US-014:** Duplicate document detection and archiving
- **US-015:** Document dependency/relationship graphs
- **US-016:** A/B testing for processing strategies

### Won't Have

- ML-based strategy selection model (deferred to post-MVP; rule-based approach used)
- Multi-cloud support beyond S3 (plugin architecture in place, only S3 implemented)
- Email notification system for staleness alerts

### Scope Changes Since Sign-Off

| What Changed | Why | When | Evidence |
|---|---|---|---|
| Replaced ML-based strategy selection with a rule-based heuristic approach for MVP | Reduce technical risk and fit the 6-week timeline | Week 2 | Sprint planning / architecture notes |
| Limited adaptive processing to core chunking strategies only | Prioritized a stable end-to-end pipeline over broader experimentation | Week 2–3 | Backlog refinement / implementation PRs |
| Moved performance-based learning (US-004) to post-MVP / Could Have | Needed more retrieval history and evaluation infrastructure than MVP allowed | Week 2 | Backlog change / meeting notes |
| Moved contradiction detection (US-010) to post-MVP / Could Have | High complexity and false-positive risk; prioritized analytics and staleness first | Week 3 | Risk review / backlog update |
| Deferred duplicate detection (US-014), relationship graphs (US-015), and A/B testing (US-016) | Lower priority than core document analysis, chunking, and health monitoring | Week 3 | MoSCoW updates / issue tracker |
| Removed email notifications for staleness alerts | Avoided extra integration work; kept dashboard-based alerts only | Week 3 | Design notes / ticket update |
| Limited storage integration to S3 only | Reduced integration and testing complexity for MVP | Week 2 | Architecture decision / storage PR |
| Reframed health features as diagnostic only, not automated remediation | Kept MVP focused on visibility and monitoring rather than automated actions | Week 2 | Scope review / dashboard design notes |

---

## Progress vs. Plan

| Scope Item (Name + ID) | MoSCoW | Planned for MVP or Final? | Ticket Owner | Status | Evidence | Notes |
|---|---|---|---|---|---|---|
| [US-008: Retrieval Frequency Heatmap](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/53) | Must | MVP | Jaskirat | 🟢 Done | [PR #36](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/36) · [Live](https://cpsc319.jaskiratgill.ca) | |
| [US-009: Staleness Detection & Alerts](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/54) | Must | MVP | Jaskirat, Crystal | 🟢 Done | [PR #43](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/43) · [Live](https://cpsc319.jaskiratgill.ca) | Visual health indicators on KB list |
| [US-012: Document Health Score Display](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/57) | Must | MVP | Crystal, Rui, Jaskirat | 🟢 Done | [PR #43](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/43) · [Live](https://cpsc319.jaskiratgill.ca) | Health circle UI implemented |
| [FR-018: Auth + RBAC (Admin/Dev/User)](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/62) | Must | MVP | Rui, Crystal | 🟢 Done | [PR #41](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/41) · [PR #15: Basic Role Base Authetication endpoints](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/15) · [Live](https://cpsc319.jaskiratgill.ca) | Role-based access: admin/developer/user |
| [US-019: Local Chat System (MCP-Integrated)](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/63) | Must | MVP | Shibo | 🟢 Done | [PR #33](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/33) · [PR #26](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/26) · [Live](https://cpsc319.jaskiratgill.ca) | Chat + MCP server integrated; works with Claude Desktop |
| [US-002: Strategy Rationale Logging & Display](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/47) | Must | MVP | Jaskirat | 🟢 Done | [PR #35](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/35) · [Live](https://cpsc319.jaskiratgill.ca) | Strategy tab in Document Detail View |
| [S3 Cloud Sync (Event-Driven + Daily Reconciliation)](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/64) | Must | MVP | Jaskirat | 🟢 Done | [PR #1](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/1) · [PR #16](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/16) · [PR #17](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/17) · [PR #19](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/19) · [Live](https://cpsc319.jaskiratgill.ca) | SQS event-driven + daily reconciliation |
| [Knowledge Base CRUD](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/65) | Must | MVP | Rui | 🟢 Done | [PR #18](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/18) · [PR #24](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/24) · [PR #39](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/39) · [Live](https://cpsc319.jaskiratgill.ca) | Create, list, search, delete KB |
| [Plugin Architecture (S3 Provider)](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/66) | Must | MVP | Jaskirat | 🟢 Done | [PR #1](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/1) · [PR #14](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/14) · [Live](https://cpsc319.jaskiratgill.ca) | ABC pattern, auto-discovery from /plugins/ |
| CI/CD | Must | MVP | Jaskirat, Shibo | 🟢 Done | [PR #22](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/22) | CI/CD pipeline setup |
| MCP server | Must | MVP | Rui | 🟢 Done | [PR #20](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/20) · [Live](https://cpsc319.jaskiratgill.ca) | MCP server integration and improvements |
| [Document Detail View](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/67) | Must | MVP | Crystal | 🟢 Done | [PR #38](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/38) · [Live](https://cpsc319.jaskiratgill.ca) | Tabs: Overview, Strategy, Chunks, Health, Document View |
| [Light / Dark Mode UI](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/68) | Should | MVP | Crystal | 🟢 Done | [PR #42](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/42) · [Live](https://cpsc319.jaskiratgill.ca) | |
| [US-006: Dynamic Chunking Strategy Selection](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/51) | Must | MVP | Rui, Jaskirat | 🟡 Partial | [PR #35](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/35) · Target: Mar 15, 2026 | Rule-based selector with 4 strategies done; dynamic learned selection by Final |
| [US-001: Auto Document Structure & Content Analysis](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/46) | Must | MVP | Jaskirat, Shibo, Rui | 🟡 Partial | [PR #35](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/35) · Target: Mar 15, 2026 | Basic structure extraction done; full content characteristic detection in progress |
| [US-003: Manual Strategy Override with Audit Trail](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/48) | Should | MVP | Rui | 🟡 Partial | [PR #35](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/35) · Target: Mar 15, 2026 | Override UI present; full audit trail logging in progress |
| [US-005: Multi-Label Document Classification](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/50) | Must | MVP | Jaskirat, Rui, Crystal, Shibo | 🟡 Partial | [PR #35](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/35) · Target: Mar 15, 2026 | Single-label classification done; multi-label + confidence score in progress |
| [US-010: Semantic Contradiction Detection](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/55) | Could | Final | Shibo | 🔴 Not Started | Target: Mar 22, 2026 | Deferred — high complexity, false-positive risk |
| [US-004: Performance-Based Learning](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/49) | Could | Final | Jaskirat | 🔴 Not Started | Target: Mar 25, 2026 | Deferred — needs retrieval history infrastructure |
| [US-016: A/B Testing for Processing Strategies](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/61) | Could | Final | Rui | 🔴 Not Started | Target: Mar 28, 2026 | Deferred post-MVP |
| [US-007: Intelligent Metadata Extraction](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/52) | Should | Final | Crystal | 🔴 Not Started | Target: Mar 18, 2026 | |
| [US-011: Failed Query Analysis & Knowledge Gap ID](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/56) | Should | Final | Shibo | 🔴 Not Started | Target: Mar 20, 2026 | |
| [US-013: Document Improvement Recommendations](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/58) | Should | Final | Crystal | 🔴 Not Started | Target: Mar 22, 2026 | |
| [US-014: Duplicate Document Detection & Archiving](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/59) | Could | Final | Rui | 🔴 Not Started | Target: Mar 25, 2026 | |
| [US-015: Document Dependency & Relationship Graphs](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/60) | Could | Final | Jaskirat | 🔴 Not Started | Target: Mar 28, 2026 | |

**Status Legend:** 🟢 Done &nbsp;|&nbsp; 🟡 Partial &nbsp;|&nbsp; 🔴 Not Started / Deferred

---

## MVP Assessment Set-Up

### Test Accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | `admin@example.com` | `Admin123!` | Pre-seeded admin account with full access |
| User | _(Create via sign-up)_ | _(User-defined)_ | Create a new user account through the registration flow |

### Login Method

1. Navigate to [https://cpsc319.jaskiratgill.ca](https://cpsc319.jaskiratgill.ca)
2. Enter email and password on the login page
3. Click "Sign In"

### Setup Steps

1. Open a browser and navigate to the deployed URL above
2. Log in with the admin credentials provided
3. Navigate to **Settings > Plugins** to verify S3 plugin connection (pre-configured)
4. Navigate to **Knowledge Bases** to view existing document collections

### Querying the Knowledge Base via OpenWebUI

> **Note:** The built-in Chat Interface in our application is not functional. This is expected — the chat interface was included solely for peer testing purposes and is **not** part of our project requirements. Our system is designed to work with external LLM frontends such as OpenWebUI, which connects to our system via MCP server integration.

OpenWebUI has been deployed and configured to work with our system as a connected MCP server. To query the knowledge base:

1. Navigate to [http://cpsc319.jaskiratgill.ca:3000/](http://cpsc319.jaskiratgill.ca:3000/) (note: **http**, not https)
2. Log in with the following credentials:
   - **Email:** `tester@gmail.com`
   - **Password:** `cpsc319test`
3. Start a new chat
4. Click **Integrations** → **Tools** and select **mymcp**
5. You can now ask questions regarding the knowledge base

### Constraints and Assumptions

- **Browser:** Chrome (latest) or Firefox (latest) recommended
- **Environment:** The deployed instance is pre-configured with S3 credentials and OpenWebUI connection settings
- **MCP Integration:** The MCP server is accessible at the deployed endpoint for third-party LLM tools (e.g., OpenWebUI). OpenWebUI is configured to connect to our system as an MCP server at `http://cpsc319.jaskiratgill.ca:3000/`
- **Sample Data:** The knowledge base is pre-populated with sample documents for testing

---

## Reproducibility & Environment

### Evaluated Version

| Field | Value |
|---|---|
| **Evaluated Commit** | [`36a3f70`](https://github.com/jaskirat-gill/OpenWebUI-Project/commit/36a3f707ca9f853374d5a014f374b718695edb0b) |
| **Branch** | `main` |
| **CI Run** | [Run #22839994420 — ✅ Success](https://github.com/jaskirat-gill/OpenWebUI-Project/actions/runs/22839994420) |
| **Deployed At** | [https://cpsc319.jaskiratgill.ca](https://cpsc319.jaskiratgill.ca) |

### Environment Variables

The deployed instance uses the following environment variables. A `.env.example` configuration template is available in the repository root.

| Variable | Service | Description | Required |
|---|---|---|---|
| `VITE_API_URL` | Frontend | Base URL of the Query Engine API | Yes |
| `VITE_OPENWEBUI_BASE_URL` | Frontend | OpenWebUI instance URL for chat integration | Yes |
| `VITE_OPENWEBUI_TOKEN` | Frontend | Auth token for OpenWebUI API | Yes |
| `VITE_OPENWEBUI_TIMEOUT_MS` | Frontend | Request timeout in milliseconds (default: 30000) | No |
| `DATABASE_URL` | Backend (all) | PostgreSQL connection string | Yes |
| `QDRANT_URL` | Query Engine | Qdrant vector database endpoint | Yes |
| `REDIS_URL` | Sync Service | Redis message queue endpoint | Yes |
| `S3_BUCKET_NAME` | Sync Service | AWS S3 bucket to sync from | Yes |
| `AWS_REGION` | Sync Service | AWS region (e.g., `us-east-1`) | Yes |
| `AWS_ACCESS_KEY_ID` | Sync Service | AWS access key | Yes |
| `AWS_SECRET_ACCESS_KEY` | Sync Service | AWS secret key | Yes |
| `SQS_QUEUE_URL` | Sync Service | SQS queue URL for event-driven sync | Yes |
| `SYNC_INTERVAL_SECONDS` | Sync Service | Reconciliation interval in seconds | No |

### Local Reproduction Steps

To reproduce the evaluated build locally:

1. Clone the repo and check out the evaluated commit:
   ```bash
   git clone https://github.com/jaskirat-gill/OpenWebUI-Project.git
   cd OpenWebUI-Project
   git checkout 36a3f707ca9f853374d5a014f374b718695edb0b
   ```
2. Copy the configuration template and fill in your credentials:
   ```bash
   cp .env.example .env
   # Edit .env with your AWS, OpenWebUI, and database credentials
   ```
3. Start all services with Docker Compose:
   ```bash
   docker compose up --build
   ```
4. Access the dashboard at `http://localhost:5173` and log in with `admin@example.com` / `Admin123!`
5. The database is automatically seeded with sample knowledge bases and documents on first run via `backend/database/init.sql`

### Dependency Stability

| Layer | Version Pinned |
|---|---|
| Python (backend) | 3.11 (pinned in Dockerfiles) |
| Node.js (frontend) | 20 (pinned in CI and Dockerfiles) |
| PostgreSQL | 15 (pinned in docker-compose.yml) |
| Qdrant | Latest stable (pinned image tag in docker-compose.yml) |
| All Python packages | Pinned via `requirements.txt` per service |
| All Node packages | Pinned via `package-lock.json` |

---

## Bugs and Peer Testing Results

### Bug Tracker

- **Bug Tracker:** [GitHub Issues](https://github.com/jaskirat-gill/OpenWebUI-Project/issues)
- **Peer Testing Results:** [GitHub Issues - Peer Testing Label](https://github.com/jaskirat-gill/OpenWebUI-Project/issues?q=label%3Apeer-testing)

### Open Bug Summary

| Bug ID | Title | Severity | Owner | Target Fix Date |
|---|---|---|---|---|
| [#69](https://github.com/jaskirat-gill/OpenWebUI-Project/issues/69) | Revision history data format is confusing | Minor | Crystal | Mar 15, 2026 |

_There are zero known Critical or Major bugs. The one open issue is a Minor UI/UX polish item that does not block any MVP workflow._

### Severity Definitions

- **Critical:** Data loss, security break, crashes, or MVP workflow blocked
- **Major:** MVP workflow frequently fails or produces incorrect output
- **Minor:** Non-core issues, edge cases with workarounds
- **Cosmetic:** Typos, minor UI issues

---

## CI/CD Pipeline

### Pipeline Links

| Resource | Link |
|---|---|
| **All CI runs** | [GitHub Actions](https://github.com/jaskirat-gill/OpenWebUI-Project/actions) |
| **Latest passing run (evaluated commit)** | [Run #22839994420 ✅](https://github.com/jaskirat-gill/OpenWebUI-Project/actions/runs/22839994420) |
| **Evaluated commit** | [`36a3f70` on `main`](https://github.com/jaskirat-gill/OpenWebUI-Project/commit/36a3f707ca9f853374d5a014f374b718695edb0b) |
| **Deployed output** | [https://cpsc319.jaskiratgill.ca](https://cpsc319.jaskiratgill.ca) |

### Pipeline Description

The CI/CD pipeline is implemented using GitHub Actions and triggers on every push to `main` and on all pull requests. The pipeline consists of five sequential stages:

1. **Frontend Checks** — Installs Node.js 20 dependencies, runs ESLint, and builds the React frontend with Vite. Build failure blocks all downstream stages.
2. **Backend Checks** — Runs in parallel across all 4 backend services (sync-service, query-engine, document-processing-engine, mcp-server). Installs Python 3.11 dependencies and validates syntax via `python -m compileall`.
3. **Docker Compose Build** — Builds all container images. On `main` branch pushes, images are pushed to GitHub Container Registry (GHCR) at `ghcr.io/jaskirat-gill/openwebui-*`.
4. **Smoke Test** — Spins up PostgreSQL, Redis, Qdrant, Query Engine, and Sync Service. Validates that all health endpoints respond with `"status":"healthy"` within 120 seconds. Prints compose logs and tears down on failure.
5. **Deploy to Production** (`main` only) — SSHs into the DigitalOcean Droplet, pulls latest images from GHCR, and runs `docker compose up -d` with production overrides.

```
PR / Push
    │
    ├─► [Frontend Checks]──────────────────────────────┐
    │                                                  │ (both pass)
    └─► [Backend Checks × 4 parallel]─────────────────►│
                                                       ▼
                                             [Docker Compose Build]
                                                        │
                                                        ▼
                                                 [Smoke Test]
                                                        │
                                              (main branch only)
                                                        ▼
                                          [Deploy to DigitalOcean]
```

---

## AI Disclosure

Our team used AI tools during development and documentation and did so responsibly, in accordance with the CPSC 319 AI Policy.

| Tool | How It Was Used |
|---|---|
| GitHub Copilot | Code completion and boilerplate generation during backend and frontend development |
| ChatGPT / Claude | Drafting and refining documentation, summarizing requirements, and generating skeleton code reviewed and modified by team members |

All AI-generated output was reviewed, understood, and verified by the team member responsible for that work. No AI tool was used to replace critical thinking, design decisions, or testing.
