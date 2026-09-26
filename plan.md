# PLAN.md — Support Documents & Knowledge Base Service (Backend)

## 1. Overview
- **Project / Feature Name:** Support Documents & Knowledge Base Backend Service (`doc_service`)
- **Problem Statement:** The existing Support Desk system manages identity/users (`user_service`) and tickets/SLAs (`assign_service`), but lacks a dedicated, scalable knowledge base / support documentation service. Customers need self-service answers to resolve queries quickly, agents need standardized knowledge assets to assist during ticket resolution, and administrators need full authoring and publication lifecycle controls.
- **Goal:** Deliver a high-performance, fully decoupled FastAPI microservice (`doc_service`) providing REST APIs for creating, editing, categorizing, tagging, searching, rating, and managing support documents and knowledge base articles with strict RBAC, comprehensive test coverage (>85%), and seamless integration with existing microservices.
- **Non-goals:**
  - Frontend / UI components (frontend UI will be built separately by another developer using this API).
  - Direct database coupling with `user_db` or `assign_db` (strict microservice boundary maintained).
  - External multi-tenant document isolation beyond system RBAC roles.
- **Success Criteria:**
  - API p95 response latency < 200ms for read/search queries under 20 concurrent users.
  - Test coverage > 85% across unit, integration, and API test suites.
  - Complete lifecycle support for articles (Draft → Review → Published → Archived → Deleted) and document feedback/ratings.
  - Zero cross-service database access or foreign keys; stateless JWT validation using shared secret and `X-Internal-API-Key` internal endpoints.

---

## 2. Requirements

### Functional Requirements
- **FR-001 (Article CRUD & Lifecycle):** Create, read, update, delete, and list support documents with fields: title, slug (unique), content (markdown/text), summary/excerpt, category_id, status (`draft`, `published`, `archived`), is_featured (boolean), author_id, view_count, helpful_count, not_helpful_count, created_at, and updated_at.
- **FR-002 (Category & Tag Management):** Hierarchical or flat document categorization (`categories`: id, name, slug, description, display_order) and normalized tag management (`tags`: id, name, slug; `document_tags` join table).
- **FR-003 (Search & Filter Engine):** Fast search across article titles, content, excerpts, and tags with filters for `category_id`, `tag`, `status`, `author_id`, `is_featured`, and sorting by `created_at`, `views`, `helpfulness`, and `title`, with offset/limit pagination.
- **FR-004 (Role-Based Access Control):**
  - **User (Customer):** Can browse, search, view published articles, and submit helpfulness feedback. Cannot view draft/archived articles or modify content.
  - **Agent:** Can view published and draft articles, author new articles (created in `draft` or `published` based on policy), edit draft articles they authored, and search internal knowledge assets.
  - **Admin:** Full administrative permissions — create, update, delete, publish, archive any article, manage categories, and manage tags.
- **FR-005 (Document Feedback & Rating Lifecycle):** Authenticated and guest/visitor feedback endpoint (`POST /api/v1/docs/{id}/feedback`) allowing users to record `is_helpful: bool` with optional comment, preventing duplicate vote spam via user_id / client tracking, and maintaining aggregate `helpful_count` and `not_helpful_count`.
- **FR-006 (View Tracking & Analytics):** Increment view count (`POST /api/v1/docs/{id}/view` or automatic view registration on `GET /api/v1/docs/{slug}`) with de-duplication window.
- **FR-007 (Internal Inter-Service API):** Secure internal API endpoints protected by `X-Internal-API-Key` allowing `assign_service` to query relevant support docs based on ticket keywords or category for agent assistance.

### User Stories & Complete Lifecycle Scenarios
- **US-001 (End-User / Customer — Knowledge Discovery):**
  - *As a customer,* I want to search and read published support documentation so that I can resolve my issues without raising a ticket.
  - **Scenario A (Happy Path):** Given a published document on "Resetting 2FA", when the customer searches for "2FA reset", then the API returns the matching document with summary, tags, and category, and viewing the document increments its view count.
  - **Scenario B (Unpublished Access Prevention):** Given a document in `draft` or `archived` status, when a customer attempts to access it by slug or ID, then the API returns `404 Not Found` (or `403 Forbidden`).
  - **Scenario C (Feedback Submission):** Given a customer reads a published document, when they submit feedback (`is_helpful=true`), then `helpful_count` increases by 1 and the feedback is recorded.

- **US-002 (Support Agent — Article Authoring & Internal Search):**
  - *As a support agent,* I want to draft troubleshooting guides and search existing internal docs so that customer solutions are standardized.
  - **Scenario A (Drafting Article):** Given an authenticated Agent, when they create a document with title, content, category, and tags, then the document is saved with `status="draft"` and `author_id` set to the agent.
  - **Scenario B (Agent Editing):** Given an Agent-authored draft, when the agent updates the content, then changes are persisted and updated_at is refreshed.
  - **Scenario C (Internal Search):** Given an Agent searching documents, when filtering with `status=draft`, then draft articles authored by the agent or published guides are returned.

- **US-003 (Admin — Full Editorial & Category Governance):**
  - *As a system admin,* I want to manage categories, tags, and publish/archive/delete articles so that the knowledge base remains accurate, organized, and up to date.
  - **Scenario A (Publishing & Archiving Lifecycle):** Given a draft document, when an Admin updates `status="published"`, then it becomes immediately visible to public queries. When later updated to `archived`, it is hidden from customer queries.
  - **Scenario B (Category Hierarchy & Deletion Safety):** Given an Admin creates categories, when an Admin attempts to delete a category that contains active documents, then the API rejects the deletion with `409 Conflict` until documents are re-assigned or force-deleted.
  - **Scenario C (Tag Reorganization):** Given an Admin updates or cleans up unused tags, changes reflect across document associations without data corruption.

- **US-004 (Inter-Service Consumer — Ticket Resolution Assistance):**
  - *As the `assign_service` / Agent Workflow,* I want to query relevant support articles using ticket category and keywords via internal API so that agents can suggest articles directly in ticket replies.
  - **Scenario A (Internal Suggestion Query):** Given a request from `assign_service` with `X-Internal-API-Key` and query "billing error", then `doc_service` returns top 5 relevant published articles.
  - **Scenario B (Invalid Key):** Given a request lacking a valid `X-Internal-API-Key`, then `doc_service` rejects the call with `403 Forbidden`.

### Non-Functional Requirements
- **Performance:** p95 read/search response time < 200ms; p95 write response time < 300ms under 20 concurrent connections.
- **Scalability:** Stateless service container architecture; database indexes on `slug`, `category_id`, `status`, `is_featured`, and full-text index on `title` and `content`.
- **Availability:** 99.5% uptime target with graceful degradation when optional dependencies fail.
- **Reliability:** Idempotent slug generation; transactional database operations for document, tag, and feedback associations.
- **Security:**
  - Standardized JWT authentication validating tokens issued by `user_service` via shared `SECRET_KEY` and `ALGORITHM=HS256`.
  - Strict RBAC enforcing permissions based on JWT `role` (`User`, `Agent`, `Admin`).
  - Internal endpoints strictly protected by `X-Internal-API-Key`.
  - Input validation and sanitization against XSS in document markdown/content.
- **Observability:** Structured JSON logs, unique `X-Request-ID` tracing, `/health` and `/ready` endpoints verifying database connectivity.
- **Maintainability:** Clean layered architecture (`app/models`, `app/schemas`, `app/routes`, `app/services`, `app/utils`, `tests/`) consistent with `user_service` and `assign_service`.

---

## 3. Scope

### In Scope
- Creation of the standalone `doc_service` microservice folder and architecture.
- REST API endpoints for:
  - Documents / Articles (CRUD, listing, filtering, search, slug lookup, status transition).
  - Categories (CRUD, listing, ordering).
  - Tags (Listing, search, creation).
  - Document Feedback & Ratings (`helpful` / `not_helpful`).
  - Internal Service-to-Service queries for document recommendations (`/internal/docs/suggest`, `/internal/docs/{id}`).
- Database models, migrations, and seed scripts in `doc_service`.
- Local JWT verification utilities and role permission dependencies.
- Dockerfile and `docker-compose.yml` update adding `doc_service` and `doc_db` (port 8003 & 5435).
- Comprehensive Pytest test suite (Unit, Service, Integration, API, RBAC security, and Edge Cases).

### Out of Scope
- Frontend UI / React components (frontend is strictly developed separately by another developer).
- File/Attachment binary hosting within `doc_service` (documents reference URLs or markdown media).
- Cloud Elasticsearch/OpenSearch clusters (native PostgreSQL full-text search & Trigram indexing used for target scale).

---

## 4. User / System Flows

```
[ Customer / Agent / Admin / assign_service ]
                     │
                     ▼
         ┌───────────────────────┐
         │ FastAPI (doc_service) │
         └───────────┬───────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
 [ Public/User Routes ]   [ Internal Routes ]
   - Auth: JWT (Bearer)     - Auth: X-Internal-API-Key
   - RBAC Verification      - Service-to-service
   - CRUD & Search          - Contextual suggestions
         │                       │
         └───────────┬───────────┘
                     ▼
             [ doc_service DB ]
             - documents
             - categories
             - tags & doc_tags
             - document_feedback
```

- **Article Read Flow:** Client requests `GET /api/v1/docs/{slug}` → `doc_service` validates JWT if present → if visitor/User, verifies `status == 'published'` → increments view count → returns document payload with category and tags.
- **Article Creation Flow:** Agent/Admin requests `POST /api/v1/docs` with payload → validates schema & slug uniqueness → associates category & tags in transaction → saves document → returns created document entity (`201 Created`).
- **Feedback Submission Flow:** User requests `POST /api/v1/docs/{id}/feedback` with `is_helpful` → checks document exists and is published → records feedback record and updates aggregate counts atomically → returns updated feedback stats (`200 OK`).

---

## 5. Architecture

### Components & Services
- **`doc_service` (FastAPI / Python 3.12+):** Independent REST service running on port 8003.
- **`doc_db` (PostgreSQL 16):** Dedicated relational database running on port 5435 (container 5432).
- **Authentication Gateway:** Local JWT verification using shared `SECRET_KEY` + `ALGORITHM=HS256`, decoding `user_id`, `email`, and `role`.
- **Internal Integration:** Internal router listening on `/internal/docs/*` with `X-Internal-API-Key` authorization.

### Project Directory Structure
```
/home/shreya/support-ticket-support-doc/
├── doc_service/                             (new microservice)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── category.py
│   │   │   ├── tag.py
│   │   │   ├── document.py
│   │   │   └── feedback.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── category.py
│   │   │   ├── tag.py
│   │   │   ├── document.py
│   │   │   └── feedback.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── categories.py
│   │   │   ├── tags.py
│   │   │   ├── documents.py
│   │   │   ├── feedback.py
│   │   │   └── internal.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── document_service.py
│   │   │   ├── category_service.py
│   │   │   └── feedback_service.py
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── security.py
│   │       ├── slug.py
│   │       └── logging.py
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py
│       ├── test_categories.py
│       ├── test_tags.py
│       ├── test_documents.py
│       ├── test_feedback.py
│       ├── test_search.py
│       ├── test_rbac.py
│       └── test_internal.py
├── docker-compose.yml                       (updated to add doc_service & doc_db)
├── SYSTEM-PLAN.md                           (updated to register doc_service inventory)
├── plan.md                                  (this document)
├── task.md                                  (live progress checklist)
└── docs/
    └── PHASE_1_DOC_SERVICE_BACKEND.md
```

### Frontend Plan
- **N/A — Backend Only Feature:** Per `prd-support-docs.md`, the scope is strictly Backend REST API. The frontend UI will be built separately by another developer using these APIs.

---

## 6. Technology Decisions
- **Language & Framework:** Python 3.12+ with FastAPI (Async, Pydantic v2, high performance).
- **ORM & Database:** SQLAlchemy 2.0 (async with `asyncpg` for PostgreSQL production, `aiosqlite` for lightweight unit tests).
- **Database Migrations:** Alembic for robust schema evolution.
- **Authentication:** `python-jose` / `PyJWT` with `passlib[bcrypt]` compatibility matching `user_service`.
- **Search Engine:** PostgreSQL native text search / ILIKE with indexed trigrams and vector weighting, ensuring zero external search cluster overhead for the 10–20 concurrent user footprint.

---

## 7. API / Interface Contract

### Authentication & Authorization Headers
- Public User/Agent/Admin endpoints: `Authorization: Bearer <JWT_TOKEN>` (optional for public published document view, required for authoring/feedback/admin).
- Internal service-to-service endpoints: `X-Internal-API-Key: <SECRET_KEY>`

### Endpoints Overview

| Method | Endpoint | Description | Auth / Role | Status Codes |
|---|---|---|---|---|
| `GET` | `/health` | Health and DB connectivity check | Public | 200, 503 |
| `GET` | `/api/v1/categories` | List all active categories | Public | 200 |
| `POST` | `/api/v1/categories` | Create a category | Admin | 201, 400, 401, 403 |
| `PUT` | `/api/v1/categories/{id}` | Update category name/slug/order | Admin | 200, 400, 404, 403 |
| `DELETE` | `/api/v1/categories/{id}` | Delete category (safeguarded) | Admin | 204, 404, 409, 403 |
| `GET` | `/api/v1/tags` | List and filter tags | Public | 200 |
| `POST` | `/api/v1/tags` | Create tag | Agent, Admin | 201, 400, 401, 403 |
| `GET` | `/api/v1/docs` | List/search articles with filters & pagination | Public (Filtered by role) | 200 |
| `GET` | `/api/v1/docs/{id_or_slug}` | Retrieve single article by ID or slug | Public / Role-aware | 200, 404 |
| `POST` | `/api/v1/docs` | Create new article | Agent, Admin | 201, 400, 401, 403 |
| `PUT` | `/api/v1/docs/{id}` | Update article details | Author, Admin | 200, 400, 403, 404 |
| `PATCH` | `/api/v1/docs/{id}/status` | Transition status (`draft`, `published`, `archived`) | Admin (or Author for draft) | 200, 400, 403, 404 |
| `DELETE` | `/api/v1/docs/{id}` | Delete article | Admin | 204, 403, 404 |
| `POST` | `/api/v1/docs/{id}/feedback` | Submit helpfulness rating / comment | Public / User | 200, 201, 400, 404 |
| `GET` | `/api/v1/docs/{id}/feedback/stats` | Retrieve feedback metrics for article | Agent, Admin | 200, 403, 404 |
| `POST` | `/api/v1/docs/{id}/view` | Increment view counter | Public | 200, 404 |
| `GET` | `/internal/docs/suggest` | Query relevant articles by text/category | `X-Internal-API-Key` | 200, 403 |
| `GET` | `/internal/docs/{id}` | Retrieve internal article metadata | `X-Internal-API-Key` | 200, 403, 404 |

---

## 8. Data Model

*Strict Schema Rule: Explicitly-typed, normalized tables with NO JSON/JSONB columns.*

### 1. `categories`
- `id`: Integer, Primary Key, Autoincrement
- `name`: String(100), Not Null
- `slug`: String(120), Unique, Not Null, Index
- `description`: String(255), Nullable
- `display_order`: Integer, Default 0
- `is_active`: Boolean, Default True, Index
- `created_at`: DateTime (UTC), Not Null
- `updated_at`: DateTime (UTC), Not Null

### 2. `tags`
- `id`: Integer, Primary Key, Autoincrement
- `name`: String(50), Unique, Not Null, Index
- `slug`: String(60), Unique, Not Null, Index
- `created_at`: DateTime (UTC), Not Null

### 3. `documents`
- `id`: Integer, Primary Key, Autoincrement
- `title`: String(200), Not Null
- `slug`: String(250), Unique, Not Null, Index
- `summary`: String(500), Nullable
- `content`: Text, Not Null
- `category_id`: Integer, ForeignKey(`categories.id`), Index, Not Null
- `author_id`: Integer, Index, Not Null (Reference to `user_service.users.id`)
- `status`: String(20), Not Null, Default `'draft'`, Index (`draft`, `published`, `archived`)
- `is_featured`: Boolean, Default False, Index
- `view_count`: Integer, Default 0, Not Null
- `helpful_count`: Integer, Default 0, Not Null
- `not_helpful_count`: Integer, Default 0, Not Null
- `created_at`: DateTime (UTC), Not Null, Index
- `updated_at`: DateTime (UTC), Not Null

### 4. `document_tags` (Join Table)
- `document_id`: Integer, ForeignKey(`documents.id`, ondelete="CASCADE"), Primary Key
- `tag_id`: Integer, ForeignKey(`tags.id`, ondelete="CASCADE"), Primary Key

### 5. `document_feedback`
- `id`: Integer, Primary Key, Autoincrement
- `document_id`: Integer, ForeignKey(`documents.id`, ondelete="CASCADE"), Index, Not Null
- `user_id`: Integer, Index, Nullable (Reference to `user_service.users.id` if authenticated)
- `user_ip_hash`: String(64), Nullable, Index (For anonymous vote de-duplication)
- `is_helpful`: Boolean, Not Null
- `comment`: String(1000), Nullable
- `created_at`: DateTime (UTC), Not Null

---

## 9. Security
- **JWT Verification:** `doc_service` decodes JWT tokens locally using the shared `SECRET_KEY` and algorithm `HS256`. Token carries `sub` (user ID), `email`, and `role`.
- **Role Enforcement (RBAC):**
  - Dependency functions: `get_current_user`, `require_role(["Admin"])`, `require_role(["Agent", "Admin"])`, `get_optional_user`.
- **Inter-Service Security:** Internal routes validate `X-Internal-API-Key` header matching `INTERNAL_API_KEY`.
- **Input Sanitization & Constraints:**
  - Pydantic v2 schemas enforce length bounds, strip hazardous control characters, and validate slugs.
  - SQL injection mitigated via SQLAlchemy parameterization.
- **CORS Configuration:** Configurable origins (`http://localhost:3000`, `http://localhost:5173`).

---

## 10. Scalability
- Completely stateless backend design allowing multiple replica containers behind a reverse proxy/load balancer.
- Read-heavy queries optimized via composite indexes (`(status, is_featured)`, `(category_id, status)`).

---

## 11. Performance
- Target p95 latency < 200ms for article fetches and searches.
- Asynchronous database access via SQLAlchemy 2.0 async engine and `asyncpg` connection pooling.
- Paginated search results with configurable limit (default: 20, max: 100).

---

## 12. Error Handling & Resilience
- Standardized error envelope: `{"detail": "Error description"}` matching existing services.
- Validation errors formatted with HTTP 422 standard structure.
- Clean handling of database disconnections with 503 response and auto-reconnect.
- Safe slug collision handling (appends incrementing numeric suffix if title slug exists).

---

## 13. Observability
- Logging with timestamps, request path, HTTP status, and `X-Request-ID`.
- Health check endpoint `/health` verifying service uptime and database responsiveness.

---

## 14. Testing Strategy (Backend)
- **Unit & Schema Tests:** Pydantic model validation, slug generation utilities, JWT decoder tests.
- **Service Layer Tests:** Document state machine transitions, feedback aggregation math, category deletion checks.
- **API & Route Tests:** End-to-end HTTP tests using `httpx.AsyncClient` with SQLite in-memory / test database.
- **RBAC Security Tests:** Verify permissions for unauthenticated users, standard `User`, `Agent`, and `Admin` across all restricted endpoints.
- **Inter-Service Contract Tests:** Validate `/internal/docs/*` authentication with valid/invalid `X-Internal-API-Key`.
- **Edge Case Tests:** Duplicate slugs, search with special regex characters, deleting non-empty categories, vote spamming.

---

## 15. Test Cases & User Story Verification Matrix

| Test Case ID | Category | Scope / Target | Expected Outcome |
|---|---|---|---|
| **TC-001** | Unit | Slug Generation Utility | Converts "How to Reset Password?" to `how-to-reset-password`, handles duplicate collisions |
| **TC-002** | Unit | JWT Security & Role Parsing | Successfully parses valid JWT; rejects expired or tampered token with 401 |
| **TC-003** | API | `POST /api/v1/categories` (Admin) | Creates category returning 201 Created |
| **TC-004** | API | `POST /api/v1/categories` (User/Agent) | Non-admin forbidden, returns 403 Forbidden |
| **TC-005** | API | `DELETE /api/v1/categories/{id}` with articles | Rejects deletion with 409 Conflict |
| **TC-006** | API | `POST /api/v1/tags` | Creates unique tag; duplicate tag name returns 400 |
| **TC-007** | API | `POST /api/v1/docs` (Agent) | Creates document in `draft` status, returns 201 |
| **TC-008** | API | `POST /api/v1/docs` (Admin) | Creates document in `published` or `draft`, returns 201 |
| **TC-009** | API | `GET /api/v1/docs` (Public/Customer) | Returns ONLY `published` articles; drafts/archived omitted |
| **TC-010** | API | `GET /api/v1/docs` (Admin/Agent) | With status filter, returns drafts and archived articles |
| **TC-011** | API | `GET /api/v1/docs/{slug}` (Customer) | Returns published article and increments view count |
| **TC-012** | API | `GET /api/v1/docs/{draft_slug}` (Customer) | Returns 404 Not Found |
| **TC-013** | API | `PUT /api/v1/docs/{id}` (Author vs Non-Author) | Author/Admin can update; other Agent receives 403 |
| **TC-014** | API | `PATCH /api/v1/docs/{id}/status` | Admin can transition status; User receives 403 |
| **TC-015** | API | `DELETE /api/v1/docs/{id}` | Admin deletes article (204 No Content); User/Agent receives 403 |
| **TC-016** | API | `POST /api/v1/docs/{id}/feedback` | Submits feedback; updates helpful/not_helpful count atomically |
| **TC-017** | API | `GET /api/v1/docs` Search & Filtering | Full-text query, category filter, tag filter, and sort order work correctly |
| **TC-018** | API | `GET /internal/docs/suggest` (Valid Key) | Returns matching articles for `assign_service` suggestions |
| **TC-019** | API | `GET /internal/docs/suggest` (Invalid Key) | Rejects request with 403 Forbidden |
| **TC-020** | Health | `GET /health` | Returns `{"status": "ok", "database": "connected"}` |

---

## 16. Edge Cases
- **Duplicate Slugs:** Automatic numeric disambiguation (e.g. `guide-1`, `guide-2`).
- **Empty / Huge Queries:** Sanitized search strings, bounded max page limit (100).
- **Category Deletion with Active Docs:** Blocked with informative 409 conflict.
- **Concurrent Feedback Submissions:** Atomic increment queries prevent race condition loss.
- **Orphaned Author Handling:** If an author is deleted from `user_service`, `author_id` in `doc_service` remains preserved as integer ID without throwing cascading errors.

---

## 17. Deployment
- Docker container definition in `doc_service/Dockerfile`.
- Integrated into root `docker-compose.yml` with `doc_service` (port 8003) and `doc_db` (Postgres 16, port 5435:5432).

---

## 18. CI/CD
- Automated pytest execution for `doc_service` covering all test cases.

---

## 19. Compatibility
- Fully compatible with existing `user_service` JWT schema and `assign_service` inter-service communications.

---

## 20. Migration / Upgrade Plan
- Database initialized with Alembic migrations and optional seed command to create initial default categories ("General", "Billing", "Technical Support", "Getting Started") and sample guides.

---

## 21. Risks & Trade-offs
- **Search Complexity vs Performance:** Using PostgreSQL ILIKE / Full-Text search is chosen over Elasticsearch to minimize operational overhead for small support desk scale while delivering sub-200ms latency.

---

## 22. Open Questions
- None. Requirements, schemas, and RBAC boundaries are fully specified.

---

## 23. Implementation Plan

- **Phase 1: Project Scaffolding & Configuration**
  - Create `doc_service/` directory layout (`app/`, `tests/`, `alembic/`).
  - Configure `requirements.txt`, `config.py`, `database.py`, `.env.example`, and Dockerfile.
  - Implement security utilities (JWT verification, role guards, `X-Internal-API-Key` validator) and slug utilities.

- **Phase 2: Database Models & Migrations**
  - Implement SQLAlchemy models: `Category`, `Tag`, `Document`, `DocumentTag`, `DocumentFeedback`.
  - Set up Alembic environment and generate initial database migration.

- **Phase 3: Schemas, Services & Business Logic**
  - Implement Pydantic v2 request/response schemas.
  - Implement `CategoryService`, `TagService`, `DocumentService`, `FeedbackService` with search, filtering, and atomic counter updates.

- **Phase 4: API Routes & Controller Endpoints**
  - Implement `/health`, `/api/v1/categories`, `/api/v1/tags`, `/api/v1/docs`, `/api/v1/docs/{id}/feedback`.
  - Implement `/internal/docs/*` service-to-service endpoints.
  - Mount routers in `app/main.py` with CORS, error handlers, and request logging middleware.

- **Phase 5: Docker & Multi-Service Integration**
  - Update `docker-compose.yml` to include `doc_db` and `doc_service`.
  - Update `SYSTEM-PLAN.md` with `doc_service` service inventory and contract definitions.

- **Phase 6: Comprehensive Test Suite & Verification**
  - Create pytest test suite (`test_categories.py`, `test_tags.py`, `test_documents.py`, `test_feedback.py`, `test_search.py`, `test_rbac.py`, `test_internal.py`).
  - Execute full test suite, verify 100% test pass rate and >85% code coverage.

- **Phase 7: Production Documentation & Review**
  - Generate `docs/PHASE_1_DOC_SERVICE_BACKEND.md`.
  - Update `README.md` and `docs/APPLICATION_DOCUMENTATION.md` with `doc_service` architecture, API references, and run commands.

---

## 24. Definition of Done
- All 20 Test Cases in Section 15 implemented and passing.
- `doc_service` container builds and runs cleanly via Docker Compose.
- All endpoints conform to API contract in Section 7.
- Zero cross-service database coupling.
- Complete documentation generated (`docs/PHASE_1_DOC_SERVICE_BACKEND.md`, `README.md`, `docs/APPLICATION_DOCUMENTATION.md`).

---

## 25. Post-Implementation Verification
- Run full pytest test suite in `doc_service`.
- Perform live HTTP verification calls against running `doc_service` instance.
- Verify health check `/health` returns 200 OK.

---

## 26. Existing Codebase Analysis
- Existing repo contains:
  - `user_service`: Port 8001, owns `users` table, issues JWT with `user_id`, `email`, `role`.
  - `assign_service`: Port 8002, owns `tickets`, `comments`, `attachments`, `sla_policies`, Celery worker.
  - `frontend`: React + TS SPA on port 3000 (UI for support docs will be developed separately).
- `doc_service` will follow identical architectural conventions (FastAPI, async SQLAlchemy, Pydantic v2, pytest, Docker).

---

## 27. Implementation Constraints
- Backend only (no frontend code modified or created).
- Normalized data model (no JSON/JSONB columns).
- Strict workspace boundary (all work within `/home/shreya/support-ticket-micro`).

---

## 28. Acceptance Criteria
- [ ] `GET /health` on port 8003 returns `{"status": "ok"}` and database connectivity confirmed.
- [ ] Admin and Agent users can author and manage support articles via `/api/v1/docs`.
- [ ] Public users can search and view published articles with p95 < 200ms.
- [ ] Helpful/Not Helpful feedback rating updates counts accurately.
- [ ] Internal service calls to `/internal/docs/*` authenticate with `X-Internal-API-Key`.
- [ ] Pytest suite achieves 100% passing tests across all test cases.
