# Support Ticket Raiser — Application Architecture & Operational Manual

---

## 1. System Architecture & Boundaries

The Support Ticket Raiser system is built as three strictly decoupled microservices communicating over HTTP REST, backed by separate databases, an asynchronous Celery task queue, and a React SPA.

### Microservice Isolation Rules
- **No Shared Database:** `user_service` connects exclusively to `user_db` (`5434`), `assign_service` connects to `assign_db` (`5433`), and `doc_service` connects to `doc_db` (`5435`).
- **No Foreign Keys Cross-Service:** References across domains (`created_by`, `assigned_to`, `author_id`, `notification.user_id`) are stored as standard integer IDs.
- **Service Authentication:** Inter-service requests to `/internal/*` routes are authenticated via the `X-Internal-API-Key` HTTP header.
- **Fast-Path Authentication:** `assign_service` and `doc_service` decode and verify JWT tokens locally using the shared secret. If local verification fails, they query `POST /internal/verify-token` on `user_service`.
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

---

## 5. Support Document Service (`doc_service`, `http://localhost:8003`)

The `doc_service` manages support documents, knowledge base articles, multi-criteria search, categorization, tags, and user helpfulness feedback ratings.

### Public & Role-Gated Endpoints

| Method | Endpoint | Description | Roles / Access | Status Codes |
|---|---|---|---|---|
| `GET` | `/health` | Service and database health check | Public | 200, 503 |
| `GET` | `/api/v1/categories` | List active categories (Admins see all) | Public / Role-aware | 200 |
| `GET` | `/api/v1/categories/{id}` | Get category by ID | Public | 200, 404 |
| `POST` | `/api/v1/categories` | Create category | Admin only | 201, 400, 403 |
| `PUT` | `/api/v1/categories/{id}` | Update category metadata/slug | Admin only | 200, 400, 403, 404 |
| `DELETE` | `/api/v1/categories/{id}` | Delete category (rejected if docs attached) | Admin only | 204, 403, 404, 409 |
| `GET` | `/api/v1/tags` | List all tags | Public | 200 |
| `POST` | `/api/v1/tags` | Create tag | Agent / Admin | 201, 400, 403 |
| `GET` | `/api/v1/docs` | List & search articles (Public sees published; Agent/Admin sees drafts) | Public / Role-aware | 200 |
| `GET` | `/api/v1/docs/{id_or_slug}` | Get single article by ID or slug (increments view count if published) | Public / Role-aware | 200, 404 |
| `POST` | `/api/v1/docs` | Create article (Agents default to `draft`; Admins can create `published`) | Agent / Admin | 201, 400, 403 |
| `PUT` | `/api/v1/docs/{id}` | Update article details | Author (drafts) / Admin | 200, 400, 403, 404 |
| `PATCH` | `/api/v1/docs/{id}/status` | Change status (`draft`, `published`, `archived`) | Admin only | 200, 400, 403, 404 |
| `DELETE` | `/api/v1/docs/{id}` | Delete article | Admin only | 204, 403, 404 |
| `POST` | `/api/v1/docs/{id}/view` | Explicitly increment view counter | Public | 200, 404 |
| `POST` | `/api/v1/docs/{id}/feedback` | Submit helpfulness rating (`is_helpful`, comment) | Public / User | 201, 400, 404 |
| `GET` | `/api/v1/docs/{id}/feedback/stats` | Retrieve feedback statistics & helpful ratio | Agent / Admin | 200, 403, 404 |

### Internal Inter-Service Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/internal/docs/suggest` | Query relevant articles by text query & category for agent ticket assistance | `X-Internal-API-Key` |
| `GET` | `/internal/docs/{id}` | Retrieve internal article metadata by ID | `X-Internal-API-Key` |

### Document Publication State Machine

```
   ┌───────────┐
   │   DRAFT   ├──────────────────┐
   └─────┬─────┘                  │
         │ (Admin Publish)        │
         ▼                        ▼
   ┌───────────┐           ┌─────────────┐
   │ PUBLISHED ├──────────►│  ARCHIVED   │
   └───────────┘           └─────────────┘
```

- **Draft:** Visible only to the authoring Agent and Admins.
- **Published:** Searchable and viewable by all customers and visitors.
- **Archived:** Hidden from public searches; retained for internal reference and audits.

---

## 6. Frontend Knowledge Base Architecture (`frontend/`)

The Knowledge Base UI is integrated into the core React SPA:

### Page & Component Hierarchy
```
App.tsx
├── Navbar.tsx (Knowledge Base link)
├── /docs -> DocsExplorerPage.tsx
│   ├── SearchBar (Debounced 300ms)
│   ├── StaffActionBar (Role-gated New Article / Category Management)
│   ├── FeaturedCarousel (Pinned guides highlight)
│   ├── CategoryList.tsx (Category filtering & badge counts)
│   ├── TagCloud.tsx (Pill tags multi-filter)
│   ├── DocCard.tsx (Card grid with view metrics & ratings)
│   ├── DocEditorModal.tsx (Authoring & editing with Live Preview)
│   └── CategoryAdminModal.tsx (Category creation & governance)
├── /docs/:idOrSlug -> DocReaderPage.tsx
│   ├── BreadcrumbNavigation
│   ├── EditorialToolbar (Edit, Status Transition, Delete, Share)
│   ├── MarkdownRenderer.tsx (Secure typography & code styling)
│   ├── FeedbackWidget.tsx (Helpfulness rating & improvement feedback)
│   └── RelatedDocsSidebar (Category & tag recommendations)
└── /tickets/new & /tickets/:id
    └── SuggestedDocsWidget.tsx (Deflection & automated resolution assistance)
```
