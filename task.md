# task.md — Support Documents & Knowledge Base Service (Backend)

- [x] **Phase 1: Project Scaffolding & Configuration**
  - [x] Initialize `doc_service/` directory structure (`app/`, `tests/`, `alembic/`)
  - [x] Create `doc_service/requirements.txt` with FastAPI, SQLAlchemy, asyncpg, aiosqlite, pydantic, python-jose, passlib, pytest, httpx
  - [x] Create `doc_service/app/config.py` and `doc_service/.env.example`
  - [x] Create `doc_service/app/database.py` with async SQLAlchemy engine and session dependency
  - [x] Implement `doc_service/app/utils/security.py` (JWT decoding, role-based dependencies, internal API key validator)
  - [x] Implement `doc_service/app/utils/slug.py` (slug generator with collision resolution)
  - [x] Implement `doc_service/app/utils/logging.py` (structured logging middleware)
  - [x] Create `doc_service/Dockerfile`

- [x] **Phase 2: Database Models & Migrations**
  - [x] Create `doc_service/app/models/category.py` (`Category` model)
  - [x] Create `doc_service/app/models/tag.py` (`Tag` model)
  - [x] Create `doc_service/app/models/document.py` (`Document` model and `document_tags` association table)
  - [x] Create `doc_service/app/models/feedback.py` (`DocumentFeedback` model)
  - [x] Initialize Alembic migration environment (`doc_service/alembic.ini`, `alembic/env.py`)
  - [x] Generate initial database migration script

- [x] **Phase 3: Schemas, Services & Business Logic**
  - [x] Create `doc_service/app/schemas/category.py` (Pydantic schemas for Category CRUD)
  - [x] Create `doc_service/app/schemas/tag.py` (Pydantic schemas for Tag CRUD)
  - [x] Create `doc_service/app/schemas/document.py` (Pydantic schemas for Document CRUD, search query params, list items)
  - [x] Create `doc_service/app/schemas/feedback.py` (Pydantic schemas for Feedback and stats)
  - [x] Implement `doc_service/app/services/category_service.py`
  - [x] Implement `doc_service/app/services/document_service.py` (CRUD, status transitions, search & filtering logic)
  - [x] Implement `doc_service/app/services/feedback_service.py` (atomic vote tracking & stats)

- [x] **Phase 4: API Routes & Controller Endpoints**
  - [x] Create `doc_service/app/routes/categories.py` (`GET`, `POST`, `PUT`, `DELETE /api/v1/categories`)
  - [x] Create `doc_service/app/routes/tags.py` (`GET`, `POST /api/v1/tags`)
  - [x] Create `doc_service/app/routes/documents.py` (`GET /api/v1/docs`, `GET /api/v1/docs/{id_or_slug}`, `POST /api/v1/docs`, `PUT /api/v1/docs/{id}`, `PATCH /api/v1/docs/{id}/status`, `DELETE /api/v1/docs/{id}`, `POST /api/v1/docs/{id}/view`)
  - [x] Create `doc_service/app/routes/feedback.py` (`POST /api/v1/docs/{id}/feedback`, `GET /api/v1/docs/{id}/feedback/stats`)
  - [x] Create `doc_service/app/routes/internal.py` (`GET /internal/docs/suggest`, `GET /internal/docs/{id}`)
  - [x] Wire all routes in `doc_service/app/main.py` with `/health`, CORS, and exception handlers

- [x] **Phase 5: Docker & Multi-Service Integration**
  - [x] Update root `docker-compose.yml` with `doc_db` (PostgreSQL) and `doc_service`
  - [x] Update `SYSTEM-PLAN.md` with `doc_service` service inventory, ports, and inter-service contract definitions

- [x] **Phase 6: Comprehensive Test Suite & Verification**
  - [x] Set up `doc_service/tests/conftest.py` with async test client and test database fixtures
  - [x] Implement `doc_service/tests/test_categories.py` (TC-003, TC-004, TC-005)
  - [x] Implement `doc_service/tests/test_tags.py` (TC-006)
  - [x] Implement `doc_service/tests/test_documents.py` (TC-001, TC-007, TC-008, TC-009, TC-010, TC-011, TC-012, TC-013, TC-014, TC-015)
  - [x] Implement `doc_service/tests/test_feedback.py` (TC-016)
  - [x] Implement `doc_service/tests/test_search.py` (TC-017)
  - [x] Implement `doc_service/tests/test_rbac.py` (TC-002, TC-004, TC-013, TC-014, TC-015)
  - [x] Implement `doc_service/tests/test_internal.py` (TC-018, TC-019)
  - [x] Run pytest test suite and achieve 100% pass rate with >85% coverage

- [x] **Phase 7: Production Documentation & Review**
  - [x] Create `docs/PHASE_1_DOC_SERVICE_BACKEND.md` summarizing implementation and test results
  - [x] Update root `README.md` with `doc_service` architecture, port mapping, and quickstart commands
  - [x] Update `docs/APPLICATION_DOCUMENTATION.md` with full API reference, data models, and RBAC matrix
