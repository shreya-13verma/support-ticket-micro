# SYSTEM-PLAN.md — Support Ticket Raiser

## 1. System Overview
- **What the system does:** A multi-role support ticket raising, tracking, and management platform for a support desk (10–20 concurrent users/agents). It decouples user identity/authentication and access management from ticket lifecycle, assignment, SLA enforcement, and operational reporting.
- **Why it's split into microservices:** Decoupling core identity/auth concerns (`user_service`) from ticket domain logic, SLA processing, and analytics (`assign_service`) ensures security boundaries, independent scalability, and domain separation.

## 2. Service Inventory
| Service Name | Purpose | Port (Host:Container) | Database | Directory |
|---|---|---|---|---|
| `user_service` | Identity, authentication (JWT), RBAC (`User`, `Agent`, `Admin`), user profile management, internal token/user verification | 8001:8001 | PostgreSQL (`user_db`) | `user_service/` |
| `assign_service` | Ticket management, agent assignment, lifecycle states, threaded comments, attachments, SLA monitoring & alerts, notifications, audit logs, reports | 8002:8002 | PostgreSQL (`assign_db`), Redis (`redis:6379`) | `assign_service/` |
| `doc_service` | Support documents, knowledge base articles, categorization, tagging, full-text search, user feedback ratings | 8003:8003 | PostgreSQL (`doc_db`) | `doc_service/` |
| `frontend` | React + TypeScript + Tailwind CSS Single Page Application | 3000:3000 | N/A | `frontend/` |

## 3. Service Boundaries & Data Ownership
- **`user_service` owns:** `users` table, credentials, role definitions, account state (active/inactive).
- **`assign_service` owns:** `tickets`, `comments`, `attachments`, `sla_policies`, `sla_breaches`, `notifications`, `audit_logs`.
- **`doc_service` owns:** `documents`, `categories`, `tags`, `document_tags`, `document_feedback`.
- **Strict Boundary Rules:**
  - **No Shared Database:** `assign_service` and `doc_service` never access `user_db` directly.
  - **No Cross-Service Foreign Keys:** Cross-service references (`created_by`, `assigned_to`, `author_id`, `document.author_id`) are stored as plain integer IDs.
  - **Anonymization / Deletion:** User deletion in `user_service` prompts `assign_service` to anonymize or handle orphaned IDs cleanly.

## 4. Communication Patterns
- **Synchronous REST Calls:** `assign_service` calls `user_service` via `httpx.AsyncClient` for:
  - Agent validation during ticket assignment (`GET /internal/users/{id}`)
  - Token verification fallback if needed (`POST /internal/verify-token`)
- **Asynchronous Tasks:** `assign_service` uses Celery + Redis for scheduled SLA checks, overdue ticket alerts, and background notifications.

## 5. Inter-Service API Contracts
| Provider Service | Consumer Service | Endpoint | Schema / Payload | Auth Policy |
|---|---|---|---|---|
| `user_service` | `assign_service` | `GET /internal/users/{id}` | Returns: `{"id": int, "email": str, "name": str, "role": str, "is_active": bool}` | `X-Internal-API-Key` header |
| `user_service` | `assign_service` | `POST /internal/verify-token` | Body: `{"token": str}`<br/>Returns: `{"valid": bool, "user_id": int, "email": str, "role": str}` | `X-Internal-API-Key` header |
| `user_service` | `doc_service` | `POST /internal/verify-token` | Body: `{"token": str}`<br/>Returns: `{"valid": bool, "user_id": int, "email": str, "role": str}` | `X-Internal-API-Key` header |
| `doc_service` | `assign_service` | `GET /internal/docs/suggest?q={query}&category_id={id}` | Query params: `q`, `category_id`, `limit`<br/>Returns: `DocumentSuggestionResponse` | `X-Internal-API-Key` header |
| `doc_service` | `assign_service` | `GET /internal/docs/{id}` | Returns: `DocumentResponse` | `X-Internal-API-Key` header |

## 6. Authentication & Authorization Between Services
- **Service-to-Service:** Protected by `X-Internal-API-Key: <SECRET_KEY>`. External requests without this valid key are rejected with `403 Forbidden`.
- **User Propagation:** `user_service` signs JWTs containing user ID, email, and role. `assign_service` verifies JWTs locally using a shared secret key (fast path), with fallback to `/internal/verify-token`.

## 7. Shared Standards
- **Standardized Error Format:** JSON envelope `{"detail": "..."}` or Pydantic validation error lists (`422`).
- **Standard HTTP Headers:** `X-Request-ID` propagated across inter-service calls.
- **API Versioning:** Public endpoints prefixed with `/api/v1/`.

## 8. Deployment Topology
- Orchestrated via `docker-compose.yml`:
  - `user_db` (Postgres 16)
  - `user_service` (FastAPI / Uvicorn, port 8001)
  - `assign_db` (Postgres 16)
  - `redis` (Redis 7)
  - `assign_service` (FastAPI / Uvicorn, port 8002)
  - `assign_worker` & `assign_beat` (Celery background worker & scheduler)
  - `frontend` (React + Vite, port 3000)

## 9. Failure & Degradation Across Services
- **Graceful Degradation:** If `user_service` is offline or fails:
  - Operations requiring live user lookups (e.g. ticket assignment) return `503 Service Unavailable` with `{"detail": "User service temporarily unavailable"}`.
  - Read-only operations, local JWT verification, ticket listing, and comment creation continue to operate normally.

## 10. Contract Change Process
- Any change to internal schemas or shared JWT structures requires versioning and prior update to `SYSTEM-PLAN.md`.

## 11. Open Questions
- None. Microservice boundaries and inter-service contracts are clearly isolated.
