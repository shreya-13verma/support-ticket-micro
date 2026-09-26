# Phase 2 Documentation: Support Documents & Knowledge Base Frontend (`support-doc-fe`)

## 1. Executive Summary
Phase 2 delivers the complete React + TypeScript + Tailwind CSS frontend interface for the Support Documents & Knowledge Base module. The frontend integrates directly with the `doc_service` REST API (port 8003) and connects seamlessly into the existing Support Desk ecosystem (`user_service` on 8001, `assign_service` on 8002).

## 2. Implemented Components & Features

### 2.1 Explorer View (`/docs`)
- **Interactive Search & Debounce:** Real-time search bar with 300ms debouncing across article titles, summaries, and contents.
- **Category Filter & Sidebar:** Category listing with article count badges and "All Articles" toggle.
- **Popular Tags Cloud:** Tag filter pills allowing single/multi-tag discovery.
- **Staff / Admin Controls:** Dedicated action bar displaying active role mode, Category Management modal launcher, and "New Article" creator button.
- **Sort & Status Controls:** Sorting by Newest, Most Viewed, Most Helpful, and Title (A-Z), alongside Status filtering (`all`, `published`, `draft`, `archived`) for Staff.
- **Featured Articles Showcase:** Highlight section showcasing pinned guides.
- **Responsive Card Grid:** Document cards with category tags, metadata, view counts, helpfulness ratings, and creation dates.

### 2.2 Reader View (`/docs/:idOrSlug`)
- **Markdown & Typography Engine:** High-contrast formatting rendering headers, bold/italic, code blocks, lists, blockquotes, and links.
- **Breadcrumbs:** Structured breadcrumb navigation (`Home > Knowledge Base > Category > Article Title`).
- **Interactive Feedback Widget:** Thumbs up / down helpfulness voting with optional improvement comment submission and duplicate-submission prevention state.
- **Editorial Action Bar:** In-place edit button, status dropdown transition (Publish / Archive / Draft) for Admin, and safe deletion confirmation.
- **Smart Recommendations:** Related articles matching category/tags and prompt to raise a support ticket if questions remain.

### 2.3 Article Editor Modal (`DocEditorModal.tsx`)
- Supports creation and updates with Title, auto-generated editable Slug, Category selector, interactive Tag pill picker with suggestions, Summary input, and Markdown body.
- **Live Markdown Preview:** Split-pane and tabbed preview modes (`Write` vs `Preview` vs `Split View`).
- **Validation & Status Management:** Client-side validation with error banners, supporting Save as Draft or direct Publish.

### 2.4 Category Governance Modal (`CategoryAdminModal.tsx`)
- Administrative interface to create, update, and delete knowledge base categories with display ordering and active state flags.

### 2.5 Cross-System Ticket Integration (`SuggestedDocsWidget.tsx`)
- Embedded in `CreateTicketPage.tsx` and `TicketDetailPage.tsx` to automatically suggest relevant knowledge base articles as users type their issue subject, enabling deflection and faster self-service resolution.

---

## 3. Test Results & Verification Matrix

### Vitest Unit & Component Test Suite
| Test File | Tests Run | Result | Duration |
|---|---|---|---|
| `markdown_renderer.test.tsx` | 5 | ✅ PASSED | 134ms |
| `doc_card.test.tsx` | 2 | ✅ PASSED | 197ms |
| `feedback_widget.test.tsx` | 3 | ✅ PASSED | 309ms |
| `doc_editor_modal.test.tsx` | 2 | ✅ PASSED | 316ms |
| `suggested_docs_widget.test.tsx` | 2 | ✅ PASSED | 487ms |
| **Total** | **14 / 14** | **100% PASS** | **1.98s** |

### Automated Playwright E2E Browser Test Suite (`tests_e2e_browser.js`)
- **TC-FE-001 (Public Explorer Navigation):** Visited `/docs` as unauthenticated user, verified hero header, search input, and category list.
- **TC-FE-002 (Admin Authentication & Mode):** Logged in as Admin, navigated to `/docs`, confirmed admin authoring bar.
- **TC-FE-003 (Category Management):** Opened `CategoryAdminModal`, created new category, confirmed live list update.
- **TC-FE-004 (Article Authoring & Markdown Preview):** Opened `DocEditorModal`, filled markdown with code blocks, tested Live Preview, and published article.
- **TC-FE-005 (Reader View & Feedback Rating):** Navigated to `/docs/:slug`, verified rendered typography, metadata, and submitted helpfulness rating with feedback comment.
- **TC-FE-006 (Search & Filter Query):** Performed keyword search on Explorer view and verified debounced card filtering.
- **TC-FE-007 (Ticket Suggestion Widget):** Navigated to `/tickets/new`, typed problem title, and verified auto-recommendation card appearance.
- **Console Health:** 0 unhandled console errors or broken network requests.

---

## 4. Loop Engineering Diagnostic Log
1. **Iteration 1 — Dependency Diagnostic:**
   - *Symptom:* Missing `greenlet` dependency in backend `doc_service` container when performing async database queries.
   - *Fix:* Added `greenlet>=3.0.3` to `doc_service/requirements.txt` and rebuilt container.
2. **Iteration 2 — Timestamp Timezone Shim:**
   - *Symptom:* Asyncpg rejected offset-aware `datetime.now(timezone.utc)` for PostgreSQL `TIMESTAMP WITHOUT TIME ZONE` columns.
   - *Fix:* Implemented `utc_now()` returning naive UTC datetime across all database models (`category.py`, `document.py`, `tag.py`, `feedback.py`).
3. **Iteration 3 — Search Tokenization:**
   - *Symptom:* Multi-word queries in `suggestDocuments` missed articles due to strict string matching.
   - *Fix:* Tokenized search terms into multi-clause `or_` conditions across title, summary, and content.
