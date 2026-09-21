# Support Ticket Raiser

A production-grade support ticket raising and tracking system built with a decoupled 2-tier microservices architecture and a modern React frontend.

---

## Architecture Overview

```
[ Frontend (React 18 + TS + Tailwind) :3000 ]
      │                                \
 (Auth & User Management)          (Tickets, Comments, SLA, Reports & WS)
      │                                  \
      ▼                                   ▼
[ user_service (FastAPI) :8001 ] ◄─── [ assign_service (FastAPI) :8002 ]
      │                                   │          \
      ▼                                   ▼           ▼
[ user_db (PostgreSQL) :5432 ]      [ assign_db ]  [ Redis :6379 ]
                                          :5433       │
                                                      ▼
                                            [ Celery Worker & Beat ]
```

### Key Architectural Tenets
1. **Decoupled Microservices:** `user_service` (identity/auth/RBAC) and `assign_service` (ticketing/SLA/analytics) operate independently.
2. **Zero Shared Databases:** Each service owns its dedicated PostgreSQL database. Cross-service references (`created_by`, `assigned_to`) are stored as plain IDs—no cross-database foreign keys.
3. **Resilience & Graceful Degradation:** `assign_service` uses local-first JWT validation (fast path) and returns a clean `503 Service Unavailable` if `user_service` is offline during assignment, while continuing to serve read operations seamlessly.
4. **Normalized Schemas:** Zero JSON/JSONB blob columns; strictly typed relational entities.
5. **Background SLA Engine:** Celery + Redis automated periodic tasks scan active tickets every minute for SLA breach detection and trigger instant in-app alerts.

---

## Services & Ports

| Component | Technology | Host Port | Purpose |
|---|---|---|---|
| `frontend` | React 18, TypeScript, Vite, Tailwind | `3000` | Single Page Application |
| `user_service` | FastAPI, Python 3.12, SQLAlchemy 2.0 async | `8001` | Auth, JWT, RBAC, User Profiles |
| `user_db` | PostgreSQL 16 Alpine | `5432` | Identity & User database |
| `assign_service` | FastAPI, Python 3.12, SQLAlchemy 2.0 async | `8002` | Tickets, Assignments, Comments, Files, SLA, Analytics |
| `assign_db` | PostgreSQL 16 Alpine | `5433` | Ticketing database |
| `redis` | Redis 7 Alpine | `6379` | Celery task broker & pub/sub |
| `assign_worker` | Celery | - | Background task execution |
| `assign_beat` | Celery Beat | - | Periodic 60s SLA breach scheduler |

---

## Roles & Access Control

| Role | Permissions & Capabilities |
|---|---|
| **User (Customer)** | Create tickets, view own tickets, post comments, upload attachments. |
| **Agent** | View assigned & unassigned queue, update ticket status, assign tickets, post internal private notes, view SLA reports. |
| **Admin** | Manage user roles, configure SLA thresholds per priority, view all tickets and operational analytics. |

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

---

## Running Locally for Development

### 1. Python Microservices (Virtual Environment)
```bash
# Create virtual environment and install dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r user_service/requirements.txt -r assign_service/requirements.txt

# Run User Service (Port 8001)
cd user_service
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# Run Assign Service (Port 8002)
cd assign_service
uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```

### 2. Frontend (Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## Running Test Suites

Both microservices include automated unit, integration, and security test suites using `pytest`:

```bash
# Run user_service tests
PYTHONPATH=user_service pytest user_service/tests -v

# Run assign_service tests
PYTHONPATH=assign_service pytest assign_service/tests -v

# Run static security analysis (Bandit)
bandit -r user_service/app assign_service/app -ll

# Run frontend build check
cd frontend && npm run build
```

---

## Documentation & Phase Reports
Detailed phase implementation logs, test matrices, and verification outputs are located in the `docs/` directory:
- `docs/PHASE_1_SCAFFOLDING.md`
- `docs/PHASE_2_USER_SERVICE.md`
- `docs/PHASE_3_ASSIGN_SERVICE_CORE.md`
- `docs/PHASE_4_SLA_AUDIT.md`
- `docs/PHASE_5_COMMENTS_REPORTS_WS.md`
- `docs/PHASE_6_FRONTEND.md`
- `docs/PHASE_7_FINAL_VERIFICATION.md`
