# Support Ticket Raiser — Application Architecture & Operational Manual

---

## 1. System Architecture & Boundaries

The Support Ticket Raiser system is built as two strictly decoupled microservices communicating over HTTP REST, backed by separate databases, an asynchronous Celery task queue, and a React SPA.

### Microservice Isolation Rules
- **No Shared Database:** `user_service` connects exclusively to `user_db` (`5432`), and `assign_service` connects to `assign_db` (`5433`).
- **No Foreign Keys Cross-Service:** References across domains (`created_by`, `assigned_to`, `author_id`, `notification.user_id`) are stored as standard integer IDs.
- **Service Authentication:** Inter-service requests to `/internal/*` routes are authenticated via the `X-Internal-API-Key` HTTP header.
- **Fast-Path Authentication:** `assign_service` decodes and verifies JWT tokens locally using the shared secret. If local verification fails, it queries `POST /internal/verify-token` on `user_service`.
- **Fault Tolerance:** If `user_service` is down:
  - Operations requiring live user verification (e.g. assigning a ticket to an agent) return `503 Service Unavailable`.
  - Read-only operations and comments continue operating uninterrupted.

---

## 2. API Reference

### User Service (`http://localhost:8001`)

#### Public Authentication & User Routes
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user account | No |
| `POST` | `/api/v1/auth/login` | Authenticate credentials & get JWT | No |
| `POST` | `/api/v1/auth/refresh` | Refresh existing JWT token | Bearer Token |
| `GET` | `/api/v1/users/me` | Fetch current logged-in user profile | Bearer Token |
| `GET` | `/api/v1/users/` | List all users in system | Admin only |
| `GET` | `/api/v1/users/{id}` | Get user by ID | Self or Admin |
| `PUT` | `/api/v1/users/{id}` | Update user name, role, or active status | Admin only |

#### Internal Service APIs
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/internal/verify-token` | Validate JWT payload remotely | `X-Internal-API-Key` |
| `GET` | `/internal/users/{id}` | Get user role & status for assignment | `X-Internal-API-Key` |

---

### Assign Service (`http://localhost:8002`)

#### Ticket Lifecycle & Operations
| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `POST` | `/api/v1/tickets/` | Create ticket with priority & SLA deadline | All |
| `GET` | `/api/v1/tickets/` | List tickets (User: own; Agent: assigned/open; Admin: all) | All |
| `GET` | `/api/v1/tickets/{id}` | Get full ticket details | Creator / Agent / Admin |
| `PUT` | `/api/v1/tickets/{id}/assign` | Assign ticket to active agent (validates with `user_service`) | Agent / Admin |
| `PUT` | `/api/v1/tickets/{id}/status` | Transition ticket status | Agent / Admin |
| `GET` | `/api/v1/tickets/{id}/history` | Retrieve immutable audit trail | Creator / Agent / Admin |

#### Comments & File Attachments
| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `POST` | `/api/v1/tickets/{id}/comments` | Post comment (supports agent internal notes) | All |
| `GET` | `/api/v1/tickets/{id}/comments` | List comments (internal notes hidden from users) | All |
| `POST` | `/api/v1/tickets/{id}/attachments`| Upload attachment (max 10MB, safe MIME types) | Creator / Agent / Admin |

#### SLA Engine & Notifications
| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/api/v1/sla/policies` | List SLA response/resolution policies | All |
| `POST` | `/api/v1/sla/policies` | Create or update SLA policy | Admin |
| `GET` | `/api/v1/notifications` | List in-app alerts for authenticated user | All |
| `PUT` | `/api/v1/notifications/{id}/read`| Mark notification as read | All |

#### Operational Analytics
| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/api/v1/reports/sla-compliance` | Total tickets, breach count, compliance % | Agent / Admin |
| `GET` | `/api/v1/reports/agent-performance`| Per-agent resolution counts & avg hours | Agent / Admin |

#### Live WebSocket
- `ws://localhost:8002/ws/tickets/{ticket_id}`: Real-time ticket updates and comment stream.

---

## 3. Ticket Status State Machine

```
   ┌─────────┐
   │  OPEN   │
   └────┬────┘
        │
   ┌────┴──────────────────────────┐
   ▼                               ▼
┌──────────────┐             ┌───────────┐
│ IN PROGRESS  │◄───────────►│  ON HOLD  │
└──────┬───────┘             └─────┬─────┘
       │                           │
       ▼                           ▼
┌──────────────┐             ┌───────────┐
│   RESOLVED   ├────────────►│  CLOSED   │ (Terminal)
└──────────────┘             └───────────┘
```
- Direct reopening of `closed` tickets is rejected (`400 Bad Request`).
- Resolving a ticket automatically sets `resolved_at` timestamp for velocity tracking.

---

## 4. SLA Breach Detection Workflow

1. Tickets are assigned a `due_at` timestamp upon creation based on configured SLA policies (e.g. Urgent = 4h, High = 12h, Medium = 24h, Low = 48h).
2. The `assign_beat` Celery scheduler runs `app.tasks.sla_tasks.check_sla_breaches` every 60 seconds.
3. Overdue tickets with `sla_breached == False` are flagged atomically.
4. Notifications are generated for the ticket creator and assigned agent.
5. An audit log entry (`SLA_BREACH`) is appended to the ticket history.
