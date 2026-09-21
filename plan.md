# PLAN.md — Support Ticket Raiser

## 1. Overview
- **Project Name:** Support Ticket Raiser
- **Problem Statement:** Small support desks need a clean, reliable, multi-role ticketing solution with strict decoupled architecture between identity/authentication and ticket lifecycle/SLA/reporting management.
- **Goal:** Deliver two independent FastAPI microservices (`user_service` and `assign_service`) and a modern React + TypeScript + Tailwind frontend for ticket raising, assignment, tracking, SLA alerting, and analytics.
- **Non-goals:** Multi-tenant architecture, Kubernetes deployment, ML-based auto-assignment, external API gateway service.
- **Success Criteria:**
  - p95 latency < 500ms
  - >80% test coverage per service
  - Full end-to-end user workflows functional across all 3 roles (User, Agent, Admin)
  - Zero cross-service database access or foreign keys.

## 2. Requirements

### Functional Requirements
- **FR-001:** User Registration & Login with JWT issuance and password hashing (`user_service`).
- **FR-002:** Role-Based Access Control (`User`, `Agent`, `Admin`) enforced across endpoints.
- **FR-003:** Ticket Creation with title, description, category, priority, and attachments (`assign_service`).
- **FR-004:** Ticket Assignment (manual & round-robin) with validation against `user_service` (`assign_service`).
- **FR-005:** Status Lifecycle enforcement (Open → In Progress → On Hold → Resolved → Closed) (`assign_service`).
- **FR-006:** Threaded Comments and discussion on tickets (`assign_service`).
- **FR-007:** SLA Policy configuration per priority and automated breach detection (`assign_service`).
- **FR-008:** In-app and simulated email notifications on ticket lifecycle events (`assign_service`).
- **FR-009:** Full Audit Logging for all state transitions and modifications (`assign_service`).
- **FR-010:** Operational & Performance Analytics: volume, resolution time, SLA compliance, agent performance (`assign_service`).
- **FR-011:** Internal Service-to-Service API with API Key authentication (`user_service`).
- **FR-012:** Live Ticket Updates via WebSocket connection (`assign_service`).

### Non-Functional Requirements
- **Performance:** p95 latency < 500ms across all endpoints under 10–20 concurrent users.
- **Scalability:** `assign_service` and `user_service` independently scalable horizontally.
- **Availability:** 99.5% service uptime target.
- **Reliability:** Graceful degradation — `assign_service` serves read operations when `user_service` is unreachable; returns clean 503 on identity-dependent operations.
- **Security:** Passwords hashed with bcrypt (native), JWT validation local-first with shared secret, internal routes protected with `X-Internal-API-Key`, no secrets leaked in logs.
- **Observability:** Structured JSON logs with request IDs, health checks (`/health`), and Sentry integration hooks.
- **Maintainability:** Completely separate microservice directories, schemas, databases, and test suites.

## 3. Scope
### In Scope
- `user_service` (Auth, User CRUD, Role management, Internal verification).
- `assign_service` (Ticket CRUD, Assignee validation, Comments, Attachments, Celery SLA worker, Notifications, Reports, WebSocket).
- `frontend` (React + TypeScript + Tailwind SPA: Auth, Ticket Dashboard, Detail view with comments & live updates, Admin panel, Reports view).
- Docker Compose configuration for local multi-service orchestration.
- Pytest test suites per service + cross-service integration/E2E tests.

### Out of Scope
- Production cloud infrastructure (AWS/GCP/Kubernetes).
- Third-party email SMTP delivery (mocked/logged in dev).
- S3 cloud bucket storage (local volume file storage for attachments).

## 4. User / System Flows
- **User Flow:** User registers/logs in → creates a ticket with category & priority → views own tickets → adds comments → receives notification when resolved.
- **Agent Flow:** Agent logs in → views queue of assigned/unassigned tickets → claims/updates ticket status → posts comments → marks resolved.
- **Admin Flow:** Admin logs in → manages user roles → configures SLA thresholds → views analytics reports (volume, SLA compliance, agent performance).
- **Service Communication Flow:** Client sends assignment request to `assign_service` → `assign_service` calls `user_service` `/internal/users/{id}` → if agent valid, update ticket and log audit trail; if `user_service` down, return 503.

## 5. Architecture
- Two decoupled FastAPI microservices running in independent Docker containers with separate PostgreSQL databases (`user_db` and `assign_db`).
- Celery worker and Redis broker attached to `assign_service` for async jobs (SLA monitoring, notification dispatch).
- React Single Page Application communicating directly with the backend services via HTTP and WebSocket.

```
[ Frontend (React+TS) ]
      │               \
 (Auth/Users)     (Tickets/SLA/Reports/WS)
      │                 \
      ▼                  ▼
[ user_service ] ◄─── [ assign_service ] ────► [ Redis ] ────► [ Celery Worker ]
      │ (Port 8001)           │ (Port 8002)
      ▼                       ▼
 [ user_db ]             [ assign_db ]
```

### Project Directory Structure
```
/home/shreya/ticketing-system/
├── docker-compose.yml                     (new)
├── SYSTEM-PLAN.md                         (new)
├── plan.md                                (new)
├── task.md                                (new)
├── prd.md
├── HERMES-MANUAL.md
├── docs/                                  (new)
├── user_service/                          (new)
│   ├── Dockerfile                         (new)
│   ├── requirements.txt                   (new)
│   ├── .env.example                       (new)
│   ├── alembic.ini                        (new)
│   ├── alembic/                           (new)
│   │   ├── env.py                         (new)
│   │   └── versions/                      (new)
│   ├── app/                               (new)
│   │   ├── __init__.py                    (new)
│   │   ├── main.py                        (new)
│   │   ├── config.py                      (new)
│   │   ├── database.py                    (new)
│   │   ├── models/                        (new)
│   │   │   ├── __init__.py                (new)
│   │   │   └── user.py                    (new)
│   │   ├── schemas/                       (new)
│   │   │   ├── __init__.py                (new)
│   │   │   └── user.py                    (new)
│   │   ├── routes/                        (new)
│   │   │   ├── __init__.py                (new)
│   │   │   ├── auth.py                    (new)
│   │   │   ├── users.py                   (new)
│   │   │   └── internal.py                (new)
│   │   ├── services/                      (new)
│   │   │   ├── __init__.py                (new)
│   │   │   └── auth_service.py            (new)
│   │   └── utils/                         (new)
│   │       ├── __init__.py                (new)
│   │       └── security.py                (new)
│   └── tests/                             (new)
│       ├── __init__.py                    (new)
│       ├── conftest.py                    (new)
│       ├── test_auth.py                   (new)
│       ├── test_users.py                  (new)
│       └── test_internal.py               (new)
├── assign_service/                        (new)
│   ├── Dockerfile                         (new)
│   ├── requirements.txt                   (new)
│   ├── .env.example                       (new)
│   ├── alembic.ini                        (new)
│   ├── alembic/                           (new)
│   │   ├── env.py                         (new)
│   │   └── versions/                      (new)
│   ├── app/                               (new)
│   │   ├── __init__.py                    (new)
│   │   ├── main.py                        (new)
│   │   ├── config.py                      (new)
│   │   ├── database.py                    (new)
│   │   ├── models/                        (new)
│   │   │   ├── __init__.py                (new)
│   │   │   ├── ticket.py                  (new)
│   │   │   ├── comment.py                 (new)
│   │   │   ├── attachment.py              (new)
│   │   │   ├── sla.py                     (new)
│   │   │   ├── notification.py            (new)
│   │   │   └── audit.py                   (new)
│   │   ├── schemas/                       (new)
│   │   │   ├── __init__.py                (new)
│   │   │   ├── ticket.py                  (new)
│   │   │   ├── comment.py                 (new)
│   │   │   ├── attachment.py              (new)
│   │   │   ├── sla.py                     (new)
│   │   │   ├── notification.py            (new)
│   │   │   └── report.py                  (new)
│   │   ├── routes/                        (new)
│   │   │   ├── __init__.py                (new)
│   │   │   ├── tickets.py                 (new)
│   │   │   ├── comments.py                (new)
│   │   │   ├── attachments.py             (new)
│   │   │   ├── sla.py                     (new)
│   │   │   ├── notifications.py           (new)
│   │   │   ├── reports.py                 (new)
│   │   │   └── websocket.py               (new)
│   │   ├── services/                      (new)
│   │   │   ├── __init__.py                (new)
│   │   │   ├── ticket_service.py          (new)
│   │   │   ├── user_client.py             (new)
│   │   │   ├── sla_service.py             (new)
│   │   │   ├── notification_service.py    (new)
│   │   │   └── audit_service.py           (new)
│   │   ├── tasks/                         (new)
│   │   │   ├── __init__.py                (new)
│   │   │   ├── celery_app.py              (new)
│   │   │   └── sla_tasks.py               (new)
│   │   └── utils/                         (new)
│   │       ├── __init__.py                (new)
│   │       ├── security.py                (new)
│   │       └── websocket_manager.py       (new)
│   └── tests/                             (new)
│       ├── __init__.py                    (new)
│       ├── conftest.py                    (new)
│       ├── test_tickets.py                (new)
│       ├── test_assignment.py             (new)
│       ├── test_comments.py               (new)
│       ├── test_attachments.py            (new)
│       ├── test_sla.py                    (new)
│       ├── test_reports.py                (new)
│       └── test_user_client.py            (new)
└── frontend/                              (new)
    ├── package.json                       (new)
    ├── tsconfig.json                      (new)
    ├── vite.config.ts                     (new)
    ├── index.html                         (new)
    ├── src/                               (new)
    │   ├── main.tsx                       (new)
    │   ├── App.tsx                        (new)
    │   ├── index.css                      (new)
    │   ├── api/                           (new)
    │   │   ├── client.ts                  (new)
    │   │   ├── auth.ts                    (new)
    │   │   ├── tickets.ts                 (new)
    │   │   └── reports.ts                 (new)
    │   ├── components/                    (new)
    │   │   ├── Navbar.tsx                 (new)
    │   │   ├── ProtectedRoute.tsx         (new)
    │   │   ├── TicketCard.tsx             (new)
    │   │   ├── StatusBadge.tsx            (new)
    │   │   └── PriorityBadge.tsx          (new)
    │   ├── pages/                         (new)
    │   │   ├── LoginPage.tsx              (new)
    │   │   ├── RegisterPage.tsx           (new)
    │   │   ├── DashboardPage.tsx          (new)
    │   │   ├── TicketDetailPage.tsx       (new)
    │   │   ├── CreateTicketPage.tsx       (new)
    │   │   ├── AdminPage.tsx              (new)
    │   │   └── ReportsPage.tsx            (new)
    │   ├── context/                       (new)
    │   │   ├── AuthContext.tsx            (new)
    │   │   └── WebSocketContext.tsx       (new)
    │   └── types/                         (new)
    │       └── index.ts                   (new)
    └── tests/                             (new)
        ├── auth.test.tsx                  (new)
        └── ticket.test.tsx                (new)
```

### Frontend Plan
- **Pages & Routes:**
  - `/login`, `/register`: Authentication screens
  - `/`: Main dashboard (filtered by user role)
  - `/tickets/new`: Ticket creation form
  - `/tickets/:id`: Ticket detail view, comments thread, status selector, file attachments, and live updates
  - `/admin`: Role management & SLA policy settings
  - `/reports`: Metrics dashboards (volume, SLA breaches, agent resolution times via charts)
- **Component Hierarchy:**
  - Layout (`Navbar`, `Sidebar`, `NotificationDropdown`)
  - Shared UI (`StatusBadge`, `PriorityBadge`, `Modal`, `Button`, `Input`, `LoadingSpinner`)
  - Domain Components (`TicketList`, `TicketDetail`, `CommentList`, `CommentForm`, `AttachmentList`, `SLATimer`)
- **State Management & Client-Server Flow:** React Context for Auth & Global state + standard typed Axios/fetch client handling token refreshes, loading spinners, and error alerts.
- **Styling:** Tailwind CSS with responsive layout (mobile drawer, desktop side navigation).

## 6. Technology Decisions
- **Backend Framework:** FastAPI (Python 3.12) for high-performance async REST & WebSocket endpoints.
- **Database & ORM:** PostgreSQL 16 with SQLAlchemy 2.0 (asyncpg) + Alembic migrations.
- **Authentication & Crypto:** OAuth2 Bearer with JWT tokens (`python-jose`) and `bcrypt` password hashing.
- **Task Queue & Cache:** Redis 7 + Celery for SLA monitoring tasks and background notifications.
- **Frontend Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Chart.js / Recharts.
- **Testing Tools:** `pytest`, `pytest-asyncio`, `httpx`, `respx` for mock backend integration; Vitest / React Testing Library for frontend.

## 7. API / Interface Contract

### user_service Endpoints (Port 8001)
- `POST /api/v1/auth/register` -> Register new user (`email`, `password`, `name`, optional `role`) -> 201
- `POST /api/v1/auth/login` -> Authenticate credentials -> 200 `{access_token, token_type, user}`
- `POST /api/v1/auth/refresh` -> Refresh token -> 200 `{access_token}`
- `GET /api/v1/users/` -> List all users (Admin only) -> 200 `List[UserOut]`
- `GET /api/v1/users/{id}` -> Get user by ID -> 200 `UserOut`
- `PUT /api/v1/users/{id}` -> Update user / role (Admin only) -> 200 `UserOut`
- `POST /internal/verify-token` -> Internal token verification -> 200 `{"valid": bool, "user_id": int, "email": str, "role": str}`
- `GET /internal/users/{id}` -> Internal user verification -> 200 `{"id": int, "email": str, "name": str, "role": str, "is_active": bool}`

### assign_service Endpoints (Port 8002)
- `POST /api/v1/tickets/` -> Create ticket -> 201 `TicketOut`
- `GET /api/v1/tickets/` -> List tickets (filtered by role: User sees own, Agent sees assigned/open, Admin sees all) -> 200 `List[TicketOut]`
- `GET /api/v1/tickets/{id}` -> Get ticket detail -> 200 `TicketDetailOut`
- `PUT /api/v1/tickets/{id}/assign` -> Assign ticket -> 200 `TicketOut` (Validates agent with `user_service`; 503 if unreachable)
- `PUT /api/v1/tickets/{id}/status` -> Transition ticket status -> 200 `TicketOut` (400 if invalid transition)
- `POST /api/v1/tickets/{id}/comments` -> Add comment -> 201 `CommentOut`
- `GET /api/v1/tickets/{id}/comments` -> List comments -> 200 `List[CommentOut]`
- `POST /api/v1/tickets/{id}/attachments` -> Upload file -> 201 `AttachmentOut`
- `GET /api/v1/tickets/{id}/history` -> Audit log entries -> 200 `List[AuditLogOut]`
- `GET /api/v1/sla/policies` & `POST /api/v1/sla/policies` -> Manage SLA thresholds -> 200/201
- `GET /api/v1/reports/sla-compliance` -> SLA stats -> 200
- `GET /api/v1/reports/agent-performance` -> Resolution metrics -> 200
- `WS /ws/tickets/{id}` -> Real-time ticket updates & comment broadcasts.

## 8. Data Model
*Strict Constraint: No JSON/JSONB or schemaless blob columns.*

### user_service Models (`user_db`)
- **`users`**:
  - `id`: Integer (Primary Key, autoincrement)
  - `email`: String(255) (Unique, indexed, not null)
  - `hashed_password`: String(255) (not null)
  - `name`: String(255) (not null)
  - `role`: String(50) (Enum: `'user'`, `'agent'`, `'admin'`, default `'user'`)
  - `is_active`: Boolean (default True, not null)
  - `created_at`: DateTime(timezone=True) (not null)
  - `updated_at`: DateTime(timezone=True) (not null)

### assign_service Models (`assign_db`)
- **`tickets`**:
  - `id`: Integer (Primary Key, autoincrement)
  - `title`: String(255) (not null)
  - `description`: Text (not null)
  - `category`: String(100) (not null)
  - `priority`: String(50) (Enum: `'low'`, `'medium'`, `'high'`, `'urgent'`, not null)
  - `status`: String(50) (Enum: `'open'`, `'in_progress'`, `'on_hold'`, `'resolved'`, `'closed'`, default `'open'`, not null)
  - `created_by`: Integer (plain user ID, indexed, not null)
  - `assigned_to`: Integer (plain user ID, indexed, nullable)
  - `due_at`: DateTime(timezone=True) (nullable)
  - `resolved_at`: DateTime(timezone=True) (nullable)
  - `sla_breached`: Boolean (default False, not null)
  - `created_at`: DateTime(timezone=True) (not null)
  - `updated_at`: DateTime(timezone=True) (not null)
- **`comments`**:
  - `id`: Integer (Primary Key, autoincrement)
  - `ticket_id`: Integer (Foreign Key -> `tickets.id`, not null)
  - `author_id`: Integer (plain user ID, not null)
  - `author_name`: String(255) (not null)
  - `content`: Text (not null)
  - `is_internal`: Boolean (default False, not null)
  - `created_at`: DateTime(timezone=True) (not null)
- **`attachments`**:
  - `id`: Integer (Primary Key, autoincrement)
  - `ticket_id`: Integer (Foreign Key -> `tickets.id`, not null)
  - `uploaded_by`: Integer (plain user ID, not null)
  - `filename`: String(255) (not null)
  - `file_path`: String(512) (not null)
  - `file_size`: Integer (not null)
  - `content_type`: String(100) (not null)
  - `created_at`: DateTime(timezone=True) (not null)
- **`sla_policies`**:
  - `id`: Integer (Primary Key, autoincrement)
  - `priority`: String(50) (Unique, not null)
  - `response_time_hours`: Integer (not null)
  - `resolution_time_hours`: Integer (not null)
- **`notifications`**:
  - `id`: Integer (Primary Key, autoincrement)
  - `user_id`: Integer (plain user ID, indexed, not null)
  - `ticket_id`: Integer (Foreign Key -> `tickets.id`, not null)
  - `title`: String(255) (not null)
  - `message`: Text (not null)
  - `is_read`: Boolean (default False, not null)
  - `created_at`: DateTime(timezone=True) (not null)
- **`audit_logs`**:
  - `id`: Integer (Primary Key, autoincrement)
  - `ticket_id`: Integer (Foreign Key -> `tickets.id`, not null)
  - `actor_id`: Integer (plain user ID, not null)
  - `action`: String(100) (not null)
  - `old_value`: String(255) (nullable)
  - `new_value`: String(255) (nullable)
  - `created_at`: DateTime(timezone=True) (not null)

## 9. Security
- **Authentication:** Standard JWT (HMAC-SHA256) with expiration and role payload.
- **Authorization:** Granular FastAPI dependency checks per endpoint (`require_role("admin")`, `require_role(["agent", "admin"])`).
- **Internal Protection:** Dedicated `X-Internal-API-Key` header verified by middleware/dependencies.
- **Data Protection:** Passwords securely hashed with `bcrypt`. Local storage file size and MIME-type restrictions on file uploads.
- **Input Validation:** Strict Pydantic v2 schemas validating email formats, password complexity, string bounds, and enum invariants.

## 10. Scalability
- Independent scaling of `assign_service` replicas behind a load balancer.
- Stateless FastAPI workers reading JWT tokens without database lookup on every request.
- Redis handles asynchronous queue processing and Pub/Sub distribution for WebSocket messages.

## 11. Performance
- **Target Latency:** p95 < 500ms across all endpoints.
- **Database Optimization:** Indices on `tickets.created_by`, `tickets.assigned_to`, `tickets.status`, `users.email`.
- **Async I/O:** `asyncpg` async database sessions preventing connection thread starvation.

## 12. Error Handling & Resilience
- **Inter-service Failure:** If `user_service` is down when assigning a ticket, `assign_service` catches the `httpx.RequestError` or 5xx and returns `503 Service Unavailable` with a descriptive message.
- **Validation Errors:** Unprocessable entity inputs return `422` with parameter details.
- **Lifecycle Invariants:** Invalid ticket state transitions return `400 Bad Request`.

## 13. Observability
- Health endpoints at `/health` for both microservices.
- Structured logs including HTTP method, path, response status, duration, and `request_id`.
- Celery task monitoring and execution logs.

## 14. Testing Strategy

### Backend
- **Unit Tests:** Password hashing, token generation, state transition validation, Pydantic schema validation.
- **Integration Tests:** Database transactions with SQLite / PostgreSQL test DB, Celery background tasks.
- **API Tests:** Full endpoint tests using FastAPI `AsyncClient` / `TestClient` covering valid calls, invalid payloads, and auth edge cases.
- **Consumer-Driven Contract Tests:**
  - `assign_service` contract test mocking `user_service` via `respx`.
  - Verification of `/internal/users/{id}` schema and status codes.
- **Resilience / Failure Tests:** Simulated outage of `user_service` asserting that `assign_service` returns HTTP 503 on assignment while continuing to serve read requests.

### Frontend
- **Unit & Integration Tests:** Form rendering, client validation, auth token storage, route redirection for unauthenticated sessions.

## 15. Test Cases
| ID | Scenario | Expected Result | Type | Layer |
|---|---|---|---|---|
| TC-001 | User registration with valid data | 201 Created and user record returned | API | Backend (user_service) |
| TC-002 | User registration with duplicate email | 409 Conflict | API | Backend (user_service) |
| TC-003 | User login with valid credentials | 200 OK with access token | API | Backend (user_service) |
| TC-004 | User login with invalid password | 401 Unauthorized | API | Backend (user_service) |
| TC-005 | Non-admin attempts to list users | 403 Forbidden | Security | Backend (user_service) |
| TC-006 | Internal route accessed without API key | 403 Forbidden | Security | Backend (user_service) |
| TC-007 | Ticket creation with valid payload | 201 Created with status 'open' | API | Backend (assign_service) |
| TC-008 | Ticket creation with missing required fields | 422 Unprocessable Entity | API | Backend (assign_service) |
| TC-009 | Role-based ticket visibility check | User sees own; Agent sees assigned/open; Admin sees all | Security | Backend (assign_service) |
| TC-010 | Ticket assignment to valid active agent | 200 OK, audit log created, status updated | Integration | Backend (assign_service) |
| TC-011 | Ticket assignment to non-agent user ID | 400 Bad Request (Invalid agent) | Integration | Backend (assign_service) |
| TC-012 | Ticket assignment when user_service is down | 503 Service Unavailable | Failure | Backend (assign_service) |
| TC-013 | Read tickets when user_service is down | 200 OK (Graceful degradation) | Failure | Backend (assign_service) |
| TC-014 | Invalid ticket status transition (e.g. Closed -> Open) | 400 Bad Request | Unit/API | Backend (assign_service) |
| TC-015 | Threaded comment creation on ticket | 201 Created with author info | API | Backend (assign_service) |
| TC-016 | Upload attachment with allowed MIME type | 201 Created with file metadata | API | Backend (assign_service) |
| TC-017 | Upload attachment with forbidden extension/MIME | 400 Bad Request | Security | Backend (assign_service) |
| TC-018 | SLA breach detection triggers notification | Breached flag set to true, notification recorded | Integration | Backend (assign_service) |
| TC-019 | Reports SLA compliance calculation | Accurate percentage and count returned | API | Backend (assign_service) |
| TC-020 | Unauthenticated user navigates to dashboard | Redirected to /login | E2E | Frontend |
| TC-021 | User submits new ticket form | Success message, redirected to ticket view | Integration | Frontend |
| TC-022 | WebSocket receives live status update | Ticket status badge updates in UI without reload | Integration | Frontend |

## 16. Edge Cases
- **Invalid Transitions:** Reject direct skips (e.g. `open` -> `resolved` without assignment/progress if policy demands).
- **User Service Offline:** Clean 503 error handling without stack trace leaks.
- **Large/Disallowed Files:** File uploads capped at 10MB; executable file extensions rejected.
- **Simultaneous Assignments:** Optimistic locking / atomic update queries preventing race conditions.

## 17. Deployment
- **Local Multi-Service Compose:** `docker-compose.yml` spinning up `user_db`, `user_service`, `assign_db`, `assign_service`, `redis`, `celery_worker`, `celery_beat`, and `frontend`.
- **Environment Variables:** Documented in `.env.example` across services.

## 18. CI/CD
- GitHub Actions pipeline running `flake8`/`ruff`, `mypy` typechecks, `pytest` for both services, and frontend build/lint checks.

## 19. Compatibility
- Linux / macOS / Windows Docker environments.
- Modern Evergreen Browsers (Chrome, Firefox, Safari, Edge).
- Python 3.12, Node.js 20+.

## 20. Migration / Upgrade Plan
- Independent Alembic migration chains in each microservice (`user_service/alembic` and `assign_service/alembic`).

## 21. Risks & Trade-offs
| Risk | Impact | Probability | Mitigation |
|---|---|---|---|
| `user_service` downtime | High | Low | Local JWT validation + graceful 503 degradation on assignment |
| Microservice network latency | Medium | Low | Fast local token decoding, sub-second timeout on inter-service HTTP |
| File storage growth | Low | Medium | Enforced file size caps (10MB) and content-type validation |

## 22. Open Questions
- None. Requirements, models, and boundaries are clear.

## 23. Implementation Plan
- **Phase 1:** Project scaffolding, Docker Compose setup, environment templates, and CI test runner skeleton.
- **Phase 2:** `user_service` implementation (Auth, RBAC, User CRUD, Internal routes) + full test suite.
- **Phase 3:** `assign_service` core implementation (Tickets CRUD, Assignment with `user_service` integration, 503 failure handling) + test suite.
- **Phase 4:** SLA engine, Celery/Redis periodic tasks, notification service, and audit logging.
- **Phase 5:** Comments, attachments handling, reporting endpoints, and WebSocket live updates.
- **Phase 6:** Frontend implementation (Auth context, Dashboard, Ticket detail/creation, Admin panel, Reports charts, WebSocket integration).
- **Phase 7:** End-to-End integration verification, security scans (Bandit), performance/load verification, and final documentation.

## 24. Definition of Done
- [ ] Requirements implemented (FR-001 to FR-012)
- [ ] All unit, integration, contract, and E2E tests passing
- [ ] No shared database or cross-service foreign keys
- [ ] Clean 503 handling when `user_service` is offline
- [ ] Docker Compose builds and launches all containers cleanly
- [ ] Documentation (`docs/PHASE_*.md`) complete per phase

## 25. Post-Implementation Verification
- Automated health checks on all service endpoints.
- Integration test running through user registration, ticket creation, assignment, comment posting, SLA check, and reporting.

## 26. Existing Codebase Analysis
- **Existing System:** Greenfield repository. No legacy code to maintain.

## 27. Implementation Constraints
- Strict two-microservice decoupled architecture.
- No shared database tables or foreign keys.
- FastAPI only for backend services.
- Passwords hashed using bcrypt directly (prevent passlib 72-byte issues).
- No JSON/JSONB fields in relational schemas.

## 28. Acceptance Criteria
- **AC-001:** User can register and log in with JWT issued.
- **AC-002:** User can raise a ticket and view only tickets they created.
- **AC-003:** Agent can view assigned tickets and transition ticket status through valid lifecycle states.
- **AC-004:** Ticket assignment verifies agent validity with `user_service`; returns 503 if `user_service` is unreachable.
- **AC-005:** Admin can configure SLA policies and view compliance/agent performance reports.
- **AC-006:** All state transitions generate immutable audit log records.
