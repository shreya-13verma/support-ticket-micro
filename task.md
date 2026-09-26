# task.md — Support Documents & Knowledge Base Frontend (`support-doc-fe`)

- [x] **Phase 1: API Layer & Type Definitions**
  - [x] Create `frontend/src/types/docs.ts` (Document, Category, Tag, Feedback, Filter, Pagination types)
  - [x] Export document types in `frontend/src/types/index.ts`
  - [x] Update `frontend/src/api/client.ts` with `docsClient` targeting `http://localhost:8003/api/v1`
  - [x] Create `frontend/src/api/docsApi.ts` implementing complete REST client endpoints

- [x] **Phase 2: Core Components (Markdown, Cards, Widgets, Modals)**
  - [x] Create `frontend/src/components/docs/MarkdownRenderer.tsx` with high-contrast formatting and code styling
  - [x] Create `frontend/src/components/docs/DocCard.tsx` with category badge, view/helpfulness stats, and summary
  - [x] Create `frontend/src/components/docs/CategoryList.tsx` for sidebar navigation and category badges
  - [x] Create `frontend/src/components/docs/TagCloud.tsx` for tag pill filtering
  - [x] Create `frontend/src/components/docs/FeedbackWidget.tsx` for helpfulness ratings (thumbs up/down + comment)
  - [x] Create `frontend/src/components/docs/CategoryAdminModal.tsx` for Admin category creation & management

- [x] **Phase 3: Document Editor Modal**
  - [x] Create `frontend/src/components/docs/DocEditorModal.tsx` supporting title, auto-slug, category selection, tag tags, summary, markdown editor with live preview, and draft/published/archived status controls
  - [x] Implement client-side form validation and error handling in `DocEditorModal.tsx`

- [x] **Phase 4: Explorer View & Reader View Pages**
  - [x] Create `frontend/src/pages/DocsExplorerPage.tsx` with search bar, category filtering, tag filtering, sorting, pagination, and featured articles showcase
  - [x] Create `frontend/src/pages/DocReaderPage.tsx` with breadcrumbs, markdown reader, metadata bar, feedback widget, and Admin/Agent action toolbar (Edit, Status Toggle, Delete)

- [x] **Phase 5: Navigation & Ticket Cross-Integration**
  - [x] Update `frontend/src/components/Navbar.tsx` with Knowledge Base navigation link
  - [x] Create `frontend/src/components/docs/SuggestedDocsWidget.tsx` for ticket workflows
  - [x] Integrate `SuggestedDocsWidget` into `frontend/src/pages/CreateTicketPage.tsx`
  - [x] Integrate `SuggestedDocsWidget` into `frontend/src/pages/TicketDetailPage.tsx`
  - [x] Register `/docs` and `/docs/:idOrSlug` routes in `frontend/src/App.tsx`

- [x] **Phase 6: Comprehensive Testing & Automated Playwright E2E Verification**
  - [x] Implement Vitest component tests in `frontend/src/tests/` (Explorer, Reader, Editor, Feedback)
  - [x] Execute Vitest test suite and achieve 100% pass rate
  - [x] Implement and execute automated browser E2E test suite covering full user stories
  - [x] Verify zero console errors and clean responsive layouts

- [x] **Phase 7: Production Documentation & Review**
  - [x] Create `docs/PHASE_2_DOC_SERVICE_FRONTEND.md` summarizing frontend components, test matrix, and verification
  - [x] Update root `README.md` with frontend documentation routes, component inventory, and quickstart commands
  - [x] Update `docs/APPLICATION_DOCUMENTATION.md` with frontend architectural breakdown, component tree, and user flows
