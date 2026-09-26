# Support Ticket Raiser

A production-grade support ticket raising and tracking system built with a decoupled microservices architecture and a modern React frontend.

---

## Architecture Overview

```
[ Frontend (React 18 + TS + Tailwind) :3000 ]
      │                                │                                \
 (Auth & User Management)    (Support Docs & Knowledge Base)     (Tickets, SLA, Reports & WS)
      │                                │                                  \
      ▼                                ▼                                   ▼
[ user_service (FastAPI) :8001 ]  [ doc_service (FastAPI) :8003 ] ◄─── [ assign_service (FastAPI) :8002 ]
      │                                │                                   │          \
      ▼                                ▼                                   ▼           ▼
[ user_db (PostgreSQL) ]        [ doc_db (PostgreSQL) ]              [ assign_db ]  [ Redis :6379 ]
      :5434                            :5435                               :5433       │
                                                                                       ▼
                                                                             [ Celery Worker & Beat ]
```

### Key Architectural Tenets
1. **Decoupled Microservices:** `user_service` (identity/auth/RBAC), `assign_service` (ticketing/SLA/analytics), and `doc_service` (knowledge base articles/search/feedback) operate completely independently.
2. **Zero Shared Databases:** Each service owns its dedicated PostgreSQL database (`user_db`, `assign_db`, `doc_db`). Cross-service references (`created_by`, `assigned_to`, `author_id`) are stored as plain IDs—no cross-database foreign keys.
3. **Resilience & Graceful Degradation:** Local-first JWT validation (fast path) with remote verification fallback, and inter-service endpoints protected with `X-Internal-API-Key`.
4. **Normalized Schemas:** Zero JSON/JSONB blob columns; strictly typed relational entities.
5. **Background SLA Engine:** Celery + Redis automated periodic tasks scan active tickets every minute for SLA breach detection and trigger instant in-app alerts.

---

## Services & Ports

| Component | Technology | Host Port | Purpose |
|---|---|---|---|
| `frontend` | React 18, TypeScript, Vite, Tailwind | `3000` | Single Page Application |
| `user_service` | FastAPI, Python 3.12, SQLAlchemy 2.0 async | `8001` | Auth, JWT, RBAC, User Profiles |
| `user_db` | PostgreSQL 16 Alpine | `5434` | Identity & User database |
| `assign_service` | FastAPI, Python 3.12, SQLAlchemy 2.0 async | `8002` | Tickets, Assignments, Comments, Files, SLA, Analytics |
| `assign_db` | PostgreSQL 16 Alpine | `5433` | Ticketing database |
| `doc_service` | FastAPI, Python 3.12, SQLAlchemy 2.0 async | `8003` | Support Documents, Knowledge Base, Search, Ratings |
| `doc_db` | PostgreSQL 16 Alpine | `5435` | Support Documents & Knowledge Base database |
| `redis` | Redis 7 Alpine | `6379` | Celery task broker & pub/sub |
| `assign_worker` | Celery | - | Background task execution |
| `assign_beat` | Celery Beat | - | Periodic 60s SLA breach scheduler |

---

## Roles & Access Control

| Role | Permissions & Capabilities |
|---|---|
| **User (Customer)** | Create tickets, view own tickets, post comments, upload attachments, search & view published support docs, submit helpfulness ratings. |
| **Agent** | View assigned & unassigned queue, update ticket status, assign tickets, post comments, draft support docs, view feedback metrics. |
| **Admin** | Manage user roles, configure SLA thresholds per priority, view analytics reports, full editorial control over knowledge base (publish, archive, delete, categories, tags). |

---

## Running with Docker Compose

### Prerequisites
- Docker Engine 24+ & Docker Compose v2+

### Quickstart
```bash
# 1. Start all containers in the background
docker compose up -d --build

# 2. Inspect running services
docker compose ps

# 3. View live logs
docker compose logs -f
```

Access points:
- **Frontend Web UI:** `http://localhost:3000`
- **User Service Docs (Swagger):** `http://localhost:8001/docs`
- **Assign Service Docs (Swagger):** `http://localhost:8002/docs`
- **Doc Service Docs (Swagger):** `http://localhost:8003/docs`

---

## Running Locally for Development

### 1. Python Microservices (Virtual Environment)
```bash
# Create virtual environment and install dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r user_service/requirements.txt -r assign_service/requirements.txt -r doc_service/requirements.txt

# Run User Service (Port 8001)
cd user_service
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# Run Assign Service (Port 8002)
cd assign_service
uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload

# Run Doc Service (Port 8003)
cd doc_service
uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload
```

### 2. Frontend (Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## Running Test Suites

All microservices include automated unit, integration, and security test suites using `pytest`:

```bash
# Run user_service tests
PYTHONPATH=user_service pytest user_service/tests -v

# Run assign_service tests
PYTHONPATH=assign_service pytest assign_service/tests -v

# Run doc_service tests
cd doc_service && pytest --cov=app tests/ -v
```

---

## Documentation & Phase Reports
Detailed phase implementation logs, test matrices, and verification outputs are located in the `docs/` directory:
- `docs/PHASE_1_DOC_SERVICE_BACKEND.md` (Support Documents & Knowledge Base Microservice)
- `docs/APPLICATION_DOCUMENTATION.md`
