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
| **Client Name** | _[Client Name]_ |
| **Client Contact** | _[Client Email]_ |
| **GitHub Repo** | [https://github.com/jaskirat-gill/OpenWebUI-Project](https://github.com/jaskirat-gill/OpenWebUI-Project) |
| **Backlog / Board** | _[Link to GitHub Projects / Jira board]_ |
| **Document Version** | 1.0 |

#### Team Members

| Name | Student ID | Role |
|---|---|---|
| _[Member 1]_ | _[ID]_ | _[Role]_ |
| _[Member 2]_ | _[ID]_ | _[Role]_ |
| _[Member 3]_ | _[ID]_ | _[Role]_ |
| _[Member 4]_ | _[ID]_ | _[Role]_ |
| _[Member 5]_ | _[ID]_ | _[Role]_ |

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
| _[Describe any scope change]_ | _[Reason]_ | _[Date]_ | _[Link to ticket/PR/meeting notes]_ |

---

## Progress vs. Plan

| Scope Item (Name + ID) | MoSCoW | Planned for MVP or Final? | Ticket Owner | Status | Evidence | Notes |
|---|---|---|---|---|---|---|
| [US-001: Document Structure Analysis](link-to-ticket) | Must | MVP | _[Owner]_ | _[Status]_ | _[PR Link]_ | |
| [US-002: Strategy Rationale Display](link-to-ticket) | Must | MVP | _[Owner]_ | _[Status]_ | _[PR Link]_ | |
| [US-005: Document Classification](link-to-ticket) | Must | MVP | _[Owner]_ | _[Status]_ | _[PR Link]_ | |
| [US-006: Dynamic Chunking Strategy](link-to-ticket) | Must | MVP | _[Owner]_ | _[Status]_ | [PR #35](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/35) | Rule-based selector with 4 strategies |
| [US-008: Retrieval Frequency Heatmap](link-to-ticket) | Must | MVP | _[Owner]_ | _[Status]_ | [PR #36](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/36) | |
| [US-009: Staleness Alerts & Health Indicators](link-to-ticket) | Must | MVP | _[Owner]_ | _[Status]_ | _[PR Link]_ | |
| [US-012: Document Health Scoring](link-to-ticket) | Must | MVP | _[Owner]_ | _[Status]_ | [PR #43](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/43) | Health circle UI fix |
| [FR-018: Configuration UI](link-to-ticket) | Must | MVP | _[Owner]_ | _[Status]_ | _[PR Link]_ | |
| [User Management System](link-to-ticket) | Must | MVP | _[Owner]_ | _[Status]_ | [PR #41](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/41) | Role-based access (admin/user) |
| [S3 Cloud Sync](link-to-ticket) | Must | MVP | _[Owner]_ | _[Status]_ | _[PR Link]_ | Event-driven + daily reconciliation |
| [MCP Server Integration](link-to-ticket) | Must | MVP | _[Owner]_ | _[Status]_ | [PR #37](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/37), [PR #44](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/44) | MCP threshold improvements |
| [Knowledge Base CRUD](link-to-ticket) | Must | MVP | _[Owner]_ | _[Status]_ | [PR #39](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/39) | Create KB fix |
| [Chat Interface with KB](link-to-ticket) | Must | MVP | _[Owner]_ | _[Status]_ | _[PR Link]_ | OpenWebUI integration |
| [Light/Dark Mode](link-to-ticket) | Should | MVP | _[Owner]_ | _[Status]_ | [PR #42](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/42) | |
| [Plugin Architecture (S3)](link-to-ticket) | Must | MVP | _[Owner]_ | _[Status]_ | _[PR Link]_ | ABC pattern, auto-discovery |
| [Document Detail View](link-to-ticket) | Must | MVP | _[Owner]_ | _[Status]_ | [PR #38](https://github.com/jaskirat-gill/OpenWebUI-Project/pull/38) | Tabs: Overview, Strategy, Chunks, Health, Document View |
| [US-003: Manual Strategy Override](link-to-ticket) | Should | Final | _[Owner]_ | _[Status]_ | _[PR Link / Planned Date]_ | |
| [US-007: Metadata Extraction](link-to-ticket) | Should | Final | _[Owner]_ | _[Status]_ | _[Planned Date]_ | |
| [US-011: Failed Query Analysis](link-to-ticket) | Should | Final | _[Owner]_ | _[Status]_ | _[Planned Date]_ | |
| [US-010: Contradiction Detection](link-to-ticket) | Could | Final | _[Owner]_ | _[Status]_ | _[Planned Date]_ | |
| [US-014: Duplicate Detection](link-to-ticket) | Could | Final | _[Owner]_ | _[Status]_ | _[Planned Date]_ | |

**Status Legend:** Done / Partial / Not Started / Deferred

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
5. Use **Chat Interface** to query the knowledge base (select model and MCP server in top-left corner)

### Constraints and Assumptions

- **Browser:** Chrome (latest) or Firefox (latest) recommended
- **Environment:** The deployed instance is pre-configured with S3 credentials and OpenWebUI connection settings
- **MCP Integration:** The MCP server is accessible at the deployed endpoint for third-party LLM tools (e.g., Claude Desktop)
- **Sample Data:** The knowledge base is pre-populated with sample documents for testing

---

## Bugs and Peer Testing Results

### Bug Tracker

- **Bug Tracker:** [GitHub Issues](https://github.com/jaskirat-gill/OpenWebUI-Project/issues)
- **Peer Testing Results:** [GitHub Issues - Peer Testing Label](https://github.com/jaskirat-gill/OpenWebUI-Project/issues?q=label%3Apeer-testing)

### Open Bug Summary

| Bug ID | Title | Severity | Owner | Target Fix Date |
|---|---|---|---|---|
| _[#ID]_ | _[Bug Title]_ | _[Critical/Major/Minor/Cosmetic]_ | _[Owner]_ | _[Date]_ |

_Update this table with any known open bugs. At MVP evaluation, there should be zero known critical bugs._

### Severity Definitions

- **Critical:** Data loss, security break, crashes, or MVP workflow blocked
- **Major:** MVP workflow frequently fails or produces incorrect output
- **Minor:** Non-core issues, edge cases with workarounds
- **Cosmetic:** Typos, minor UI issues

---

## CI/CD Pipeline

### Pipeline Link

**GitHub Actions:** [https://github.com/jaskirat-gill/OpenWebUI-Project/actions](https://github.com/jaskirat-gill/OpenWebUI-Project/actions)

### Pipeline Description

The CI/CD pipeline is implemented using GitHub Actions and triggers on pushes to `main` and on all pull requests. The pipeline consists of five sequential stages:

1. **Frontend Checks** - Installs Node.js 20 dependencies, runs ESLint, and builds the React frontend with Vite
2. **Backend Checks** - Runs in parallel across all 4 backend services (sync-service, query-engine, document-processing-engine, mcp-server). Installs Python 3.11 dependencies and validates syntax via `python -m compileall`
3. **Docker Compose Build** - Builds all container images using Docker Compose. On `main` branch, pushes images to GitHub Container Registry (GHCR)
4. **Smoke Test** - Spins up core services (PostgreSQL, Redis, Qdrant, Query Engine, Sync Service) and validates health endpoints respond with `"status":"healthy"` within 120 seconds
5. **Deploy to Production** (main branch only) - SSHs into the DigitalOcean Droplet, pulls latest code, and runs `docker compose up -d` with production overrides

```
PR / Push
    |
    v
[Frontend Checks] ──> [Backend Checks (x4 parallel)]
                                    |
                                    v
                         [Docker Compose Build]
                                    |
                                    v
                           [Smoke Test]
                                    |
                            (main only)
                                    v
                       [Deploy to DigitalOcean]
```

---

## AI Disclosure

_[Include AI disclosure per course AI Policy. List any AI tools used during development and how they were used.]_
