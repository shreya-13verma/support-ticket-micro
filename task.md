# TASK.md

Progress tracker for Support Ticket Raiser, derived from plan.md Section 23.
Legend: [ ] not started · [x] done

## Phase 1 — Project Scaffolding & Multi-Service Setup
- [x] Task: Set up project root structure, git configuration, and docs directory
- [x] Task: Create `docker-compose.yml` with `user_db`, `user_service`, `assign_db`, `assign_service`, `redis`, `celery_worker`, `celery_beat`, and `frontend`
- [x] Task: Create `.env.example` templates and base requirements files for both services

## Phase 2 — `user_service` Implementation
- [x] Task: Configure FastAPI app, async database connection, and Alembic migrations for `user_service`
- [x] Task: Implement `User` model, schemas (Pydantic v2), and bcrypt password hashing utilities (FR-001)
- [x] Task: Implement auth endpoints: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh` (FR-001, TC-001, TC-002, TC-003, TC-004)
- [x] Task: Implement user management routes: `GET /api/v1/users/`, `GET /api/v1/users/{id}`, `PUT /api/v1/users/{id}` with RBAC (FR-002, TC-005)
- [x] Task: Implement internal routes: `POST /internal/verify-token`, `GET /internal/users/{id}` with `X-Internal-API-Key` verification (FR-011, TC-006)
- [x] Task: Write and run full `user_service` test suite (unit, API, security, edge cases) and create `docs/PHASE_2_USER_SERVICE.md`

## Phase 3 — `assign_service` Core Ticketing & Assignment
- [x] Task: Configure FastAPI app, async database connection, and Alembic migrations for `assign_service`
- [x] Task: Implement `Ticket` model and Pydantic schemas (FR-003, FR-005)
- [x] Task: Implement JWT local validation dependency with fallback to `user_service`
- [x] Task: Implement `user_service` HTTP client (`httpx.AsyncClient`) with timeout, retries, and clean 503 error handling (TC-012, TC-013)
- [x] Task: Implement ticket endpoints: `POST /api/v1/tickets/`, `GET /api/v1/tickets/`, `GET /api/v1/tickets/{id}` with role-based visibility (FR-003, TC-007, TC-008, TC-009)
- [x] Task: Implement assignment endpoint `PUT /api/v1/tickets/{id}/assign` validating agent with `user_service` (FR-004, TC-010, TC-011, TC-012)
- [x] Task: Implement status transition endpoint `PUT /api/v1/tickets/{id}/status` enforcing valid lifecycle flow (FR-005, TC-014)
- [x] Task: Write and run `assign_service` core test suite and create `docs/PHASE_3_ASSIGN_SERVICE_CORE.md`

## Phase 4 — SLA Engine, Notifications & Audit Trail
- [x] Task: Implement `SLAPolicy`, `Notification`, and `AuditLog` models & schemas in `assign_service` (FR-007, FR-008, FR-009)
- [x] Task: Implement audit logging service recording all ticket changes (FR-009)
- [x] Task: Implement SLA calculation logic, policy CRUD endpoints, and Celery periodic breach detection task (FR-007, TC-018)
- [x] Task: Implement in-app notification endpoints and async notification dispatch service (FR-008)
- [x] Task: Write and run SLA, notification, and audit test suite and create `docs/PHASE_4_SLA_AUDIT.md`

## Phase 5 — Comments, Attachments, Reports & WebSocket
- [x] Task: Implement `Comment` model, schemas, and threaded endpoints `POST /api/v1/tickets/{id}/comments`, `GET /api/v1/tickets/{id}/comments` (FR-006, TC-015)
- [x] Task: Implement `Attachment` model, file upload endpoint with MIME & size restrictions (TC-016, TC-017)
- [x] Task: Implement reporting analytics endpoints: `/api/v1/reports/sla-compliance` and `/api/v1/reports/agent-performance` (FR-010, TC-019)
- [x] Task: Implement WebSocket endpoint `/ws/tickets/{id}` with connection manager for live broadcasts (FR-012, TC-022)
- [x] Task: Write and run Phase 5 test suite and create `docs/PHASE_5_COMMENTS_REPORTS_WS.md`

## Phase 6 — Frontend Web Application
- [x] Task: Scaffold React + TypeScript + Vite + Tailwind CSS app
- [x] Task: Implement Auth Context, token storage, and login/register pages (TC-020)
- [x] Task: Implement protected routing and layout with navigation & role awareness
- [x] Task: Implement Ticket Dashboard with filtering, search, and status badges
- [x] Task: Implement Ticket Creation Form and Ticket Detail Page with threaded comments and attachment list (TC-021)
- [x] Task: Implement Admin Panel (user role management & SLA policies) and Reports View (charts)
- [x] Task: Implement WebSocket live update listener for real-time ticket refreshes (TC-022)
- [x] Task: Write frontend tests and create `docs/PHASE_6_FRONTEND.md`

## Phase 7 — Cross-Service E2E, Security Scan & Final Verification
- [x] Task: Run multi-container Docker Compose build and verify end-to-end integration flows
- [x] Task: Run security scan (Bandit on both backend microservices)
- [x] Task: Run performance check / smoke tests under simulated load
- [x] Task: Finalize documentation in `docs/PHASE_7_FINAL_VERIFICATION.md`
