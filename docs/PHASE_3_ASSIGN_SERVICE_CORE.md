# PHASE 3 — `assign_service` Core Ticketing & Assignment

## 1. What was implemented
- Configured FastAPI application, async database engine, and session dependency for `assign_service`.
- Created `Ticket`, `Comment`, `Attachment`, `SLAPolicy`, `Notification`, and `AuditLog` models — zero JSON/JSONB fields, strictly typed attributes and foreign keys.
- Implemented fast-path local JWT validation with remote fallback to `user_service`.
- Implemented `user_client` (`httpx.AsyncClient`) communicating with `user_service` `/internal/*` routes using `X-Internal-API-Key`.
- Implemented core ticket routes:
  - `POST /api/v1/tickets/` (validations, SLA deadline computation, audit log creation)
  - `GET /api/v1/tickets/` (role-based visibility: User sees own, Agent sees assigned/open, Admin sees all)
  - `GET /api/v1/tickets/{id}` (permission-checked ticket retrieval)
  - `PUT /api/v1/tickets/{id}/assign` (agent identity verification with `user_service`; graceful 503 handling if down)
  - `PUT /api/v1/tickets/{id}/status` (lifecycle state machine enforcement: Open → In Progress → On Hold → Resolved → Closed)

## 2. Loop Engineering Log
- **Iteration 1:** `respx` mock asserted all routes called; added `assert_all_called=False` for degraded-read test scenario.
- **Iteration 2:** Full test suite executed with all tests passing (100% green).

## 3. Tests Run & Results
- **TC-007 (Valid Ticket Creation):** Passed (201 Created).
- **TC-008 (Missing Required Fields):** Passed (422 Unprocessable Entity).
- **TC-009 (Role-Based Visibility):** Passed (Customer isolated to own, Agent sees open queue).
- **TC-010 (Agent Assignment):** Passed (Agent validated with `user_service`, status moved to in_progress, audit log written).
- **TC-011 (Invalid Agent Assignment):** Passed (400 Bad Request).
- **TC-012 (User Service Down on Assignment):** Passed (503 Service Unavailable with clean message).
- **TC-013 (User Service Down Graceful Read):** Passed (200 OK — fast local JWT verification).
- **TC-014 (Invalid Status Transition):** Passed (400 Bad Request on terminal state modification).
