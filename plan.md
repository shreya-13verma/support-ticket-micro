# PLAN.md — Support Documents & Knowledge Base Frontend (`support-doc-fe`)

## 1. Overview
- **Project / Feature Name:** Support Documents & Knowledge Base Frontend UI (`support-doc-fe`)
- **Problem Statement:** The existing Support Desk frontend allows users to raise and track tickets, agents to triage and reply, and admins to manage users and view SLA reports. However, it lacks a dedicated self-service Knowledge Base / Support Documentation interface. Customers cannot search or read troubleshooting guides, and agents/admins have no UI to create, edit, categorize, or publish knowledge articles directly against the `doc_service` REST API (port 8003).
- **Goal:** Build an intuitive, responsive, and robust React + TypeScript + Tailwind CSS Knowledge Base frontend module integrated into the Support Desk application. It features a rich **Explorer View**, a clean **Reader View** with helpfulness rating feedback and markdown rendering, an **Editor Modal / Page** for drafting and editing articles with live markdown preview, Category & Tag controls, and integration with ticket handling.
- **Non-goals:**
  - Modifying backend schemas or database tables in `doc_service` (the frontend connects directly to the existing `doc_service` REST API at `http://localhost:8003/api/v1`).
  - Replacing existing ticket management views or user authentication flows.
- **Success Criteria:**
  - Complete, seamless integration with `doc_service` backend API (`/api/v1/docs`, `/api/v1/categories`, `/api/v1/tags`, `/api/v1/docs/{id}/feedback`).
  - 100% frontend test pass rate (Vitest component/unit tests + Playwright E2E browser tests).
  - Clean RBAC handling: public/customer browsing and rating, Agent drafting and editing, Admin full publication and category governance.
  - Zero unhandled console errors or broken UI states.

---

## 2. Requirements

### Functional Requirements
- **FR-001 (Document Explorer View):**
  - Search bar with debounced query input matching title, summary, and content.
  - Category sidebar/filter tabs with document count badges.
  - Tag filter cloud allowing single/multi-tag selection.
  - Status filter dropdown (`all`, `published`, `draft`, `archived`) visible to Agent/Admin roles.
  - Sorting options (Newest, Oldest, Most Viewed, Most Helpful, Title A-Z).
  - Featured articles carousel / pinned cards highlight.
  - Responsive document card grid showing title, summary, category badge, tags, author, date, views, and helpful score.
  - Pagination controls (page selector, limit selector).
  - "New Article" CTA button for Agent/Admin navigating to Editor.
- **FR-002 (Document Reader View):**
  - Clean markdown reader rendering headers, lists, code blocks, tables, blockquotes, links, and formatting.
  - Breadcrumb navigation (`Home > Knowledge Base > Category > Article Title`).
  - Article metadata bar: Category, tags, author ID/name, publication date, last updated date, and total views.
  - Interactive Helpfulness Rating Widget ("Was this article helpful? [Yes] / [No]") with feedback comment submission and duplicate submission prevention.
  - Administrative Action Toolbar for Admin/Agent: "Edit Article", "Status Toggle (Publish / Archive / Draft)", "Delete Article" with confirmation modal.
  - Related Articles section recommending relevant guides based on category and tags.
  - Share link button with clipboard copy notification.
- **FR-003 (Document Editor Modal & View):**
  - Form fields: Title, auto-generated editable Slug, Category dropdown, Tag selector (pick existing tags or create new tags on the fly), Summary/Excerpt, and Content markdown area.
  - Split-pane / tabbed live markdown preview.
  - Status selector (`draft`, `published`, `archived`) and `is_featured` boolean toggle.
  - Form validation with inline error messages for required fields.
  - Save as Draft vs. Publish immediate actions.
  - Edit mode pre-populating existing article values and performing `PUT /api/v1/docs/{id}` updates.
- **FR-004 (Category & Tag Management Modal):**
  - Category manager for Admin to create, update, and delete categories with icon/color selection and display order.
  - Tag manager / autocomplete input inside editor for easy tagging.
- **FR-005 (Global Navigation & Ticket Cross-linking):**
  - Add "Knowledge Base" / "Docs" link to main `Navbar.tsx`.
  - Provide "Suggested Help Articles" drawer/card inside `CreateTicketPage.tsx` and `TicketDetailPage.tsx` querying `/internal/docs/suggest` or `/api/v1/docs?search=...` to resolve customer queries before ticket submission.
- **FR-006 (Role-Based Access Control & Route Guards):**
  - Unauthenticated visitors & Customers (`user` role) can browse, search, view published docs, and rate articles.
  - Support Agents (`agent` role) can view drafts, author new articles, and edit their drafts.
  - Administrators (`admin` role) have full create, edit, delete, category management, and publish/archive authority.

### User Stories & Complete Lifecycle Scenarios
- **US-001 (Customer — Self-Service Discovery & Reading):**
  - *As a customer,* I want to search knowledge base articles by keyword or category so that I can quickly troubleshoot problems without filing a support ticket.
  - **Scenario A (Happy Path Search & Read):** Given a customer on `/docs`, when they type "password reset" into the search bar, the card grid filters to relevant published articles in real-time. When clicked, the Reader View renders the markdown guide and increments the view counter.
  - **Scenario B (Helpfulness Feedback):** Given a customer reading an article, when they click "Yes, helpful", the feedback is submitted to `POST /api/v1/docs/{id}/feedback`, the helpful count increments, and a thank-you badge is shown.
  - **Scenario C (Unpublished Article Guard):** Given a customer attempting to navigate to `/docs/draft-article-slug`, the reader displays a 404/Access Denied notice.

- **US-002 (Agent — Article Authoring & Internal Knowledge Access):**
  - *As a support agent,* I want to draft troubleshooting guides directly from the web interface so that our support team can standardize resolutions.
  - **Scenario A (Draft Creation):** Given an Agent logged into Support Desk, when they click "New Article", the Editor modal opens. When they fill title, summary, markdown content, select "Billing" category, and click "Save as Draft", the document is saved and appears under the Agent's Drafts list.
  - **Scenario B (Agent Editing):** Given an existing draft, when the Agent opens the Editor and edits content with live markdown preview, changes are saved via `PUT /api/v1/docs/{id}`.

- **US-003 (Admin — Editorial & Category Governance):**
  - *As an administrator,* I want to manage categories, publish reviewed drafts, and archive outdated articles so that the knowledge base remains organized and high quality.
  - **Scenario A (Publishing Draft):** Given a draft article, when Admin clicks "Publish", the status transitions to `published` and is immediately visible to public users.
  - **Scenario B (Category Creation):** Given the Admin Category Modal, when Admin adds a new category "Network Troubleshooting", it immediately appears in the Explorer filter list.
  - **Scenario C (Safe Article Deletion):** Given an obsolete document, when Admin clicks "Delete", a confirmation dialog warns the user; upon confirmation, the article is deleted from `doc_service` and removed from the Explorer list.

### Non-Functional Requirements
- **Performance:** Initial Explorer page load < 300ms; search debounce 300ms; markdown rendering < 50ms for large documents.
- **Responsiveness:** Full responsive layout supporting mobile (375px), tablet (768px), and desktop (1280px+).
- **Accessibility & UX:** Keyboard navigable forms, high-contrast readable markdown typography, clear loading skeletons, toast notifications for async actions, and graceful empty states.
- **Security:** Strict JWT token attachment via Axios interceptor, XSS sanitization in markdown HTML rendering, and client-side route guards matching backend permissions.

---

## 3. Scope

### In Scope
- Frontend React components and pages in `frontend/src/`:
  - `pages/DocsExplorerPage.tsx`
  - `pages/DocReaderPage.tsx`
  - `components/docs/DocEditorModal.tsx`
  - `components/docs/DocCard.tsx`
  - `components/docs/CategoryList.tsx`
  - `components/docs/TagCloud.tsx`
  - `components/docs/FeedbackWidget.tsx`
  - `components/docs/CategoryAdminModal.tsx`
  - `components/docs/MarkdownRenderer.tsx`
  - `components/docs/SuggestedDocsWidget.tsx`
- API client extensions in `frontend/src/api/client.ts` (`docsClient`, `DOCS_API_BASE`).
- TypeScript interfaces in `frontend/src/types/docs.ts` and `frontend/src/types/index.ts`.
- Routing configuration in `frontend/src/App.tsx` (`/docs`, `/docs/:idOrSlug`).
- Integration into `Navbar.tsx`, `CreateTicketPage.tsx`, and `TicketDetailPage.tsx`.
- Comprehensive Vitest unit/component tests and Playwright E2E browser tests.

### Out of Scope
- Direct modifications to backend database models (backend `doc_service` is ready on port 8003).
- Real-time collaborative document editing (WebSockets for docs).

---

## 4. User / System Flows

```
                   ┌──────────────────────────────────────────────┐
                   │               User / Browser                 │
                   └──────────────────────┬───────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
         [ Browse & Search ]                             [ Author / Edit ]
        /docs (Explorer Page)                        /docs (Editor Modal / Page)
                  │                                               │
      ┌───────────┴───────────┐                       ┌───────────┴───────────┐
      ▼                       ▼                       ▼                       ▼
Filter Categories       Search Keyword          Live MD Preview          Save / Publish
      │                       │                       │                       │
      └───────────┬───────────┘                       └───────────┬───────────┘
                  │                                               │
                  ▼                                               ▼
        [ Click Document Card ]                         [ doc_service REST API ]
                  │                                     http://localhost:8003/api/v1
                  ▼                                               ▲
         /docs/:idOrSlug                                          │
       (Doc Reader Page) ─────────────────────────────────────────┘
         - Markdown Render
         - Feedback Rating
         - Admin Actions (Edit/Publish/Delete)
```

---

## 5. Directory Structure & Frontend Plan

### Explicit File Tree
```
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts                 # Added docsClient (port 8003)
│   │   └── docsApi.ts                # Dedicated API service layer for docs/categories/tags
│   ├── components/
│   │   ├── Navbar.tsx                # Added Knowledge Base navigation link
│   │   └── docs/
│   │       ├── DocCard.tsx           # Document card for Explorer grid
│   │       ├── DocEditorModal.tsx    # Document creation / edit modal with markdown preview
│   │       ├── CategoryList.tsx      # Category navigation list & filter
│   │       ├── TagCloud.tsx          # Tag pills and selector
│   │       ├── FeedbackWidget.tsx    # Thumbs up/down helpfulness widget
│   │       ├── CategoryAdminModal.tsx# Category management dialog for Admin
│   │       ├── MarkdownRenderer.tsx  # Secure markdown parser & styler
│   │       └── SuggestedDocsWidget.tsx# Suggested docs drawer for ticket creation/view
│   ├── pages/
│   │   ├── DocsExplorerPage.tsx      # Main Knowledge Base search & explorer view
│   │   ├── DocReaderPage.tsx         # Document article reader view with metadata & feedback
│   │   ├── CreateTicketPage.tsx      # Enhanced with suggested docs helper
│   │   └── TicketDetailPage.tsx      # Enhanced with relevant docs drawer
│   ├── types/
│   │   ├── index.ts                  # Re-export docs types
│   │   └── docs.ts                   # Document, Category, Tag, Feedback TypeScript interfaces
│   ├── App.tsx                       # Routes: /docs, /docs/:idOrSlug
│   └── tests/
│       ├── docs_explorer.test.tsx    # Vitest component test for Explorer
│       ├── doc_reader.test.tsx       # Vitest component test for Reader & Feedback
│       ├── doc_editor.test.tsx       # Vitest component test for Editor Modal
│       └── e2e_docs.spec.ts          # Playwright E2E browser test
├── package.json
└── vite.config.ts
```

---

## 6. Architecture & System Boundaries

- **Client-Side SPA:** Single Page Application powered by Vite + React 18 + React Router v6.
- **Service Integration:**
  - `user_service` (port 8001): Authentication, user identity, JWT tokens.
  - `assign_service` (port 8002): Tickets, comments, SLA policies.
  - `doc_service` (port 8003): Support documents, categories, tags, and document feedback.
- **Authentication Handshake:** JWT `access_token` stored in `localStorage` is injected into `Authorization: Bearer <token>` header on all requests via Axios interceptors in `client.ts`.

---

## 7. Tech Stack & Dependencies

- **Framework:** React 18, TypeScript 5.4, Vite 5.2
- **Routing:** `react-router-dom` v6.23
- **Styling:** Tailwind CSS 3.4, Lucide React icons
- **HTTP Client:** Axios 1.7
- **Markdown Rendering:** Lightweight custom / standard safe markdown parser with syntax highlighting
- **Testing:** Vitest 1.6, Testing Library (`@testing-library/react`, `@testing-library/jest-dom`), Playwright browser test runner

---

## 8. Data Model (Frontend TypeScript Models)

```typescript
export type DocStatus = 'draft' | 'published' | 'archived';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  display_order: number;
  is_active: boolean;
  doc_count?: number;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

export interface SupportDocument {
  id: number;
  title: string;
  slug: string;
  summary?: string | null;
  content: string;
  category_id: number;
  author_id: number;
  status: DocStatus;
  is_featured: boolean;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  tags: Tag[];
}

export interface DocumentListItem {
  id: number;
  title: string;
  slug: string;
  summary?: string | null;
  category_id: number;
  author_id: number;
  status: DocStatus;
  is_featured: boolean;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  tags: Tag[];
}

export interface DocumentListResponse {
  documents: DocumentListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
```

---

## 9. API Contract (Backend Endpoints Consumed)

- `GET /api/v1/docs` (Query: `search`, `category_id`, `category_slug`, `tag_slug`, `status`, `is_featured`, `sort_by`, `sort_dir`, `page`, `limit`)
- `GET /api/v1/docs/{id_or_slug}` (Fetch full article details, increments view count)
- `POST /api/v1/docs` (Body: `title`, `slug`, `summary`, `content`, `category_id`, `status`, `is_featured`, `tag_ids`, `tag_names`) — Agent/Admin
- `PUT /api/v1/docs/{id}` (Body: partial update) — Author/Admin
- `PATCH /api/v1/docs/{id}/status` (Body: `{ "status": "published" | "archived" | "draft" }`) — Admin
- `DELETE /api/v1/docs/{id}` — Admin
- `POST /api/v1/docs/{id}/feedback` (Body: `{ "is_helpful": boolean, "comment": string }`)
- `GET /api/v1/categories` (Public/Admin category list)
- `POST /api/v1/categories`, `PUT /api/v1/categories/{id}`, `DELETE /api/v1/categories/{id}` — Admin
- `GET /api/v1/tags`, `POST /api/v1/tags` — Agent/Admin

---

## 10. Background Tasks & Message Broker
- N/A for frontend client (backend view tracking and indexing handled asynchronously by `doc_service`).

---

## 11. Security & Authentication
- **Role-Gated Actions:**
  - Create / Edit Article button hidden for non-Agent/non-Admin users.
  - Publish / Archive status toggles and Delete actions restricted to Admin.
  - Category management modal accessible only by Admin.
- **Token Handling:** Centralized JWT storage in `localStorage` with automated 401 handling.
- **XSS Prevention:** Markdown HTML rendering strictly sanitizes raw HTML elements.

---

## 12. Caching & Performance
- In-memory category and tag caching during active browsing session.
- Debounced search queries (300ms) to avoid request flooding.
- Skeletons and optimistic UI updates for feedback voting.

---

## 13. Observability & Logging
- Console error suppression with user-friendly error banners.
- Clear toast feedback on save, edit, publish, and delete operations.

---

## 14. Error Handling & Resilience
- **Network Failures:** Toast notifications with retry buttons.
- **404 Not Found:** Beautiful "Article Not Found or Unpublished" placeholder with link back to Explorer.
- **Validation Errors:** Clear field-level red highlights for missing titles, content, or category selections.

---

## 15. Test Matrix

| Test Case ID | Component / Area | Description | Expected Result |
|---|---|---|---|
| **TC-FE-001** | Explorer View | Render document card grid with categories & tags | Documents displayed with badges, metadata, and summaries |
| **TC-FE-002** | Explorer Search | Filter articles via search bar | Debounced API call filters list accurately |
| **TC-FE-003** | Category Filtering | Click category pill / item | Explorer updates to show documents matching category |
| **TC-FE-004** | Reader View | Navigate to `/docs/:slug` | Markdown content rendered with typography and metadata |
| **TC-FE-005** | Feedback Widget | Click helpful "Yes" button | `POST /feedback` called, helpful count increments, thank you state shown |
| **TC-FE-006** | Editor Modal (Create) | Agent/Admin opens modal, fills form, clicks Save | `POST /docs` called, new document appears in Explorer |
| **TC-FE-007** | Editor Modal (Edit) | Admin edits existing article | `PUT /docs/:id` called, updated content reflected in Reader |
| **TC-FE-008** | Status Toggle | Admin toggles status to Published / Archived | Status patch succeeds, badge updates immediately |
| **TC-FE-009** | Category Admin Modal | Admin creates new category | `POST /categories` called, new category added to list |
| **TC-FE-010** | RBAC View Gating | Regular customer views Explorer/Reader | "New Article" and edit/delete buttons are hidden |
| **TC-FE-011** | E2E Full Journey | Playwright browser automated end-to-end flow | Complete browse -> search -> read -> rate -> create -> edit cycle passes |

---

## 16. Configuration & Environment Variables

- `VITE_DOCS_API_URL`: Backend document service URL (default: `http://localhost:8003/api/v1`)
- `VITE_USER_API_URL`: User authentication service URL (default: `http://localhost:8001/api/v1`)
- `VITE_ASSIGN_API_URL`: Ticket assignment service URL (default: `http://localhost:8002/api/v1`)

---

## 17. Deployment & Infrastructure
- Dockerized Nginx / Vite frontend container running on port 3000 (mapped to port 3001 in `docker-compose.yml`).
- Hot-reload development server running on `http://localhost:3000`.

---

## 18. Rollback Plan
- Git revert on feature branch `feature/support-docs-frontend`.

---

## 19. Performance Budget & SLA
- Bundle size increase < 50KB gzip.
- First Contentful Paint (FCP) < 1.0s.

---

## 20. Trade-offs & Alternatives Considered
- *Modal vs. Dedicated Editor Page:* Provided modal dialog with expandable full-screen toggle, enabling quick inline edits while maintaining deep-link editability.
- *WYSIWYG vs. Markdown Editor:* Chose markdown with split-screen preview for technical accuracy, code snippet support, and zero heavy WYSIWYG dependencies.

---

## 21. Assumptions & Constraints
- `doc_service` is operational on port 8003.
- JWT auth tokens issued by `user_service` contain role claims (`user`, `agent`, `admin`).

---

## 22. Open Questions
- None (All backend API contracts, database schemas, and frontend requirements are fully specified).

---

## 23. Implementation Phases

- **Phase 1: API Layer & Type Definitions**
  - Create `frontend/src/types/docs.ts` and export through `types/index.ts`.
  - Extend `frontend/src/api/client.ts` with `docsClient` (port 8003).
  - Create `frontend/src/api/docsApi.ts` for all document, category, tag, and feedback API calls.
- **Phase 2: Core Components (Markdown, Cards, Widgets, Modals)**
  - Implement `MarkdownRenderer.tsx` with high-quality styling.
  - Implement `DocCard.tsx` with status badges, category tags, and view metrics.
  - Implement `CategoryList.tsx` and `TagCloud.tsx`.
  - Implement `FeedbackWidget.tsx` with thumbs up/down voting and comment box.
  - Implement `CategoryAdminModal.tsx` for category management.
- **Phase 3: Document Editor Modal**
  - Implement `DocEditorModal.tsx` supporting title, slug generation, category picker, tag pills, summary, live markdown preview, and status controls.
  - Add form validation and error handling.
- **Phase 4: Explorer View & Reader View Pages**
  - Implement `pages/DocsExplorerPage.tsx` with search, category filtering, tag filtering, sorting, pagination, and featured articles.
  - Implement `pages/DocReaderPage.tsx` with breadcrumbs, full markdown body, metadata sidebar, feedback widget, and admin action controls.
- **Phase 5: Navigation & Ticket Integration**
  - Update `Navbar.tsx` to include the Knowledge Base link.
  - Implement `SuggestedDocsWidget.tsx` and embed in `CreateTicketPage.tsx` and `TicketDetailPage.tsx`.
  - Update `App.tsx` routing for `/docs` and `/docs/:idOrSlug`.
- **Phase 6: Comprehensive Testing & Automated Playwright E2E Verification**
  - Write Vitest unit & component tests.
  - Write and run Playwright E2E browser automation scripts verifying end-to-end user journeys.
- **Phase 7: Production Documentation & Review**
  - Generate `docs/PHASE_2_DOC_SERVICE_FRONTEND.md`.
  - Update root `README.md` and `docs/APPLICATION_DOCUMENTATION.md`.

---

## 24. Loop Engineering Configuration
- Iteration cycle: Build → Validate (Unit/API/Browser) → Diagnose → Refine (Max 5 attempts).

---

## 25. Post-Implementation Verification
- Smoke test all views in browser.
- Verify 100% test pass rate across Vitest and Playwright test suites.
- Verify zero browser console errors.

---

## 26. Definition of Done
- All functional requirements (FR-001 through FR-006) fully implemented.
- 100% test pass rate on frontend unit tests and E2E browser automation.
- Production documentation updated.

---

## 27. Appendix
- **Glossary:** KB (Knowledge Base), Markdown, Slug, RBAC, SLA.
- **Reference:** `doc_service` FastAPI OpenAPI specification.

---

## 28. Sign-off
- **Author:** Hermes Agent & Shreya
- **Status:** Pending Review / Human Approval
