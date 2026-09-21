# PHASE 5 — Comments, Attachments, Reports & WebSocket

## 1. What was implemented
- Implemented `Comment` data model and threaded endpoints (`POST /api/v1/tickets/{id}/comments`, `GET /api/v1/tickets/{id}/comments`) with support for agent-only internal notes.
- Implemented secure file attachment uploads (`POST /api/v1/tickets/{id}/attachments`):
  - Validates allowed MIME types (`image/*`, `application/pdf`, text/plain, etc.).
  - Blocks dangerous executable file extensions (`.exe`, `.sh`, `.bat`, etc.).
  - Caps maximum upload size to 10MB.
- Implemented operational analytics and reporting endpoints:
  - `GET /api/v1/reports/sla-compliance` (total tickets, breached tickets, compliance percentage).
  - `GET /api/v1/reports/agent-performance` (tickets assigned, resolved, and average resolution hours).
- Implemented real-time WebSocket connection manager and endpoint (`/ws/tickets/{id}`) for live status and comment broadcast delivery.
- Implemented ticket audit history inspection (`GET /api/v1/tickets/{id}/history`).

## 2. Loop Engineering Log
- **Iteration 1:** Standardized datetime type checking on `resolved_at` / `created_at` calculations in reports route.
- **Iteration 2:** Full test suite executed with all tests passing (100% green).

## 3. Tests Run & Results
- **TC-015 (Threaded Comments & Internal Notes):** Passed (Internal notes visible to agents only, omitted for end users).
- **TC-016 (Attachment Upload Allowed Format):** Passed (201 Created).
- **TC-017 (Attachment Upload Forbidden Extension):** Passed (400 Bad Request on .exe).
- **TC-019 (SLA Compliance & Agent Performance Reports):** Passed (200 OK with correct schema metrics).
