# HERMES-MANUAL.md
### (Send this file + your `prd.md` directly to Hermes. This file IS the instruction Hermes must follow, step by step, in order.)

---

## For You (the Human): How to Use This

1. Write your idea/spec into a file called `prd.md` (even a rough description is fine — Hermes will ask clarifying questions if something critical is missing).
2. Put `prd.md` and this file (`HERMES-MANUAL.md`) in your project folder.
3. Run `hermes` and paste:
   ```
   Read prd.md and HERMES-MANUAL.md in this folder.
   Follow HERMES-MANUAL.md exactly, in order, starting from Step 1.
   Do not skip the human review gate in Step 3.
   ```
4. Hermes will produce a `plan.md` **and a `task.md`** and **stop and wait for your approval** before writing any code. Review both, request changes if needed, approve when ready.
5. From there, Hermes implements phase by phase, checking off tasks in `task.md` as it completes and validates each one, documents each phase, handles testing, and (if you've granted it access) manages git/GitHub for you.

---

## Flow Diagram

```
                         ┌─────────────────────┐
                         │   Step 1: Read PRD   │
                         │   (prd.md)           │
                         └──────────┬───────────┘
                                    ▼
                         ┌─────────────────────┐
                         │  Step 2: Generate    │
                         │  plan.md (Appendix A)│
                         │  + Full User Stories │
                         │  + Loop Engineering  │
                         └──────────┬───────────┘
                                    ▼
                         ┌─────────────────────┐
                         │  Step 2.1: Generate  │
                         │  task.md (Appendix E)│
                         │  from plan.md §23    │
                         └──────────┬───────────┘
                                    ▼
                         ┌─────────────────────┐
                         │  Step 3: HUMAN       │
                         │  REVIEW GATE         │◄────┐
                         │  (plan.md + task.md, │     │ changes
                         │  blocking)           │     │
                         └──────────┬───────────┘     │ requested
                              approved │               │
                                    │  └───────────────┘
                                    ▼
                         ┌─────────────────────┐
                         │  Step 3.1: GitHub    │
                         │  Setup & Auth Gate   │
                         │  (repo, token, info) │
                         └──────────┬───────────┘
                                    ▼
                         ┌─────────────────────┐
                         │  Step 4: Implement   │
                         │  phase by phase      │◄────┐
                         │  (Loop Engineering:  │     │ fail
                         │  build→validate→fix, │─────┘ (max 5 tries)
                         │  check off task.md)  │
                         └──────────┬───────────┘
                                    │ pass
                                    ▼
                         ┌─────────────────────┐
                    ┌───►│  Step 5: Multi-Dev   │
                    │    │  Merge Handling      │
                    │    │  (if applicable)     │
                    │    └──────────┬───────────┘
                    │               ▼
                    │    ┌─────────────────────┐
                    │    │  Step 6: Phase &     │
                    │    │  App Documentation   │
                    │    │  (docs/PHASE_*.md,   │
                    │    │   README.md, etc.)   │
                    │    └──────────┬───────────┘
                    │               ▼
                    │    ┌─────────────────────┐
                    │    │  Step 7: Git/GitHub  │
                    │    │  branch → PR → CI    │
                    │    │  → merge             │
                    │    └──────────┬───────────┘
                    │               ▼
                    │    ┌─────────────────────┐
                    │    │  Step 8: Deploy +    │
                    │    │  Browser & User      │
                    │    │  Story Verification  │
                    │    └──────────┬───────────┘
                    │               ▼
                    │      more phases remaining?
                    │       yes │        │ no
                    └───────────┘        ▼
                                 ┌─────────────────────┐
                                 │      DONE            │
                                 └──────────┬───────────┘
                                            │
                              later: new feature / tech stack change
                                            ▼
                                 ┌─────────────────────┐
                                 │  Step 9: Update      │
                                 │  plan.md → re-approve│
                                 │  diff → implement →  │
                                 │  full regression →   │
                                 │  doc → PR → re-verify│
                                 └──────────┬───────────┘
                                            │
                                            └──► back into Step 4 loop
```

---

# INSTRUCTIONS FOR HERMES

## Step 1 — Read the Input

- Read `prd.md` fully before doing anything else.
- If `prd.md` is missing critical information needed to fill the `plan.md` template below (Step 2), list the specific open questions and ask the human — do not invent requirements, architecture, or technology choices that were never stated.

## Step 2 — Generate `plan.md`

Use the exact template in **Appendix A** below. Do not omit sections — if a section doesn't apply, write "N/A" and say why, rather than deleting it.

**Rules while drafting plan.md:**
- `plan.md` is a **specification + constraints + verification contract** — not just an implementation checklist. Every Functional Requirement (Section 2) must map to at least one Test Case (Section 15). Every Non-Functional Requirement must map to a concrete, checkable target (not "should be fast" — a number).
- **Mandatory User Stories & Complete Lifecycle Scenarios (Section 2.1):** Every feature introduced must have end-to-end user stories covering the complete user journey and all edge cases (e.g. creating, viewing, updating, listing, downloading, deleting, permission denials, and offline degradation). Features must never be partially designed (e.g. if file upload is added, file listing, viewing, downloading, size limits, format restrictions, and deletion must also be specified).
- Apply **Loop Engineering** (Appendix B) while drafting: propose the full draft → self-check consistency (does every FR and User Story have a test case? does the architecture match the tech decisions? do edge cases in Section 16 appear as test cases in Section 15?) → fix gaps → repeat until consistent.
- Fill Section 26 (Existing Codebase Analysis) by actually scanning the current repo if one exists — don't assume a greenfield project.
- If the project includes a UI, Section 5's **Frontend Plan** subsection is mandatory, not optional — do not leave it blank or assume it's covered by the backend architecture. Section 14/15 must then include both Backend and Frontend test coverage (unit, integration, API/E2E, security/accessibility, performance/responsive, failure/error states) — a backend-only test plan is incomplete for any project with a UI.
- Section 5's **Project Directory Structure** subsection is mandatory for every project (greenfield or existing). Lay out the actual folder/file tree Hermes will create or is working within (down to the key files — entry points, config, routes/controllers, models, components, tests, docs), not just a description in prose. For an existing codebase, this must reflect Section 26's findings, not a generic template.
- Section 8 (Data Model) has a **strict constraint on JSON columns/fields**: Hermes must **not** introduce a JSON/JSONB (or equivalent schemaless blob) column or data type anywhere in the data model unless `prd.md` explicitly calls for one. Default to normalized, explicitly-typed columns/fields for every entity. If a JSON field would genuinely be the right fit, do not add it silently — list it as an Open Question (Section 22) and ask the human before including it in the schema.
- Section 28 (Acceptance Criteria) must be independently checkable by a human without reading the code (e.g., "user can log in and see their dashboard within 2s" — not "login works").

## Step 2.1 — Generate `task.md`

Immediately after `plan.md` is drafted (and before presenting either file at the Step 3 review gate), Hermes must also generate `task.md` — a flat, checkable task list derived from `plan.md` Section 23 (Implementation Plan).

**Rules for `task.md`:**
- One checkbox per concrete, completable task, grouped under its phase (matching Section 23's phases exactly).
- Each task must be small enough to be unambiguously either done or not done — not "build backend" but the individual steps that make it up (e.g., "create User model", "implement POST /login endpoint", "write TC-001 test").
- Derive tasks so that, taken together, they cover every Functional Requirement, every User Story Scenario, every Test Case (Section 15), and every Definition of Done item (Section 24) — nothing in the plan should exist with no corresponding task.
- Use GitHub-flavored checkboxes (`- [ ]` / `- [x]`) so progress is visible directly in the rendered file.
- Present `task.md` alongside `plan.md` at the Step 3 Human Review Gate — both are reviewed and approved together, and both are revised together if changes are requested.
- Use the exact structure in **Appendix E**.

**Keeping `task.md` current (applies from Step 4 onward):**
- The moment a task is completed and its validation passes (per the Loop Engineering cycle), Hermes marks it `- [x]` in `task.md` before moving to the next task. Do not batch updates until the end of a phase.
- If Step 9 (new feature) or a tech-stack change adds work, append the new tasks under a new or existing phase heading in `task.md` — do not create a second task file.
- `task.md` is a live progress record, not a one-time artifact — it should always reflect the true current state of implementation.

## Step 3 — Human Review Gate (MANDATORY, BLOCKING)

- **STOP. Do not write, generate, or scaffold any implementation code yet.**
- Present the full `plan.md` **and** the accompanying `task.md` to the human together.
- Explicitly ask: *"Please review plan.md and task.md. Reply 'approved' to proceed, or list changes needed."*
- If changes are requested: revise the relevant sections of `plan.md` and the corresponding tasks in `task.md`, re-present both, and ask again.
- Repeat until you receive an explicit approval. **No phase of Step 4 begins without this.**

---

## Step 3.1 — GitHub Setup & Authentication Gate (MANDATORY)

Immediately after receiving approval in Step 3 and before scaffolding any implementation code:
1. **Request GitHub Target & Credentials:**
   Prompt the human:
   ```
   Please provide the target GitHub repository (<owner>/<repo>) and ensure
   your fine-grained GITHUB_TOKEN is exported as an environment variable in your session.
   ```
2. **Repository Existence & Metadata Setup:**
   - Verify if the repository exists via GitHub API (`GET /repos/<owner>/<repo>`).
   - If not found, create it via GitHub API (`POST /user/repos`).
   - Populate the repository **Description** (`PATCH /repos/<owner>/<repo>`) with a clear summary of the project.
   - Set relevant repository **Topics** (`PUT /repos/<owner>/<repo>/topics`) representing the application's technologies and domain.
3. **Local Git Setup:**
   - Initialize git, configure user name/email, create a standard `.gitignore`, and set `origin` to the target repository URL using token authentication.

---

## Step 4 — Implementation, Phase by Phase

- Follow the phases listed in plan.md Section 23 (Implementation Plan), in order.
- For each phase, apply the **Loop Engineering cycle** (Appendix B):
  1. Build the phase's scope.
  2. Validate — run every test type relevant to that phase (unit, integration, API, security, performance, edge cases, and end-to-end user story walkthroughs).
  3. If anything fails: read the exact failure, fix it, re-run the same check.
  4. Repeat up to 5 times. If still failing, stop and report the specific blocker to the human instead of guessing further.
- A phase is only "done" when its relevant tests pass **and** its slice of the Section 24 Definition of Done is met.
- As each individual task in that phase passes validation, mark it `- [x]` in `task.md` right away (see Step 2.1) — do not wait until the whole phase finishes to update it.
- Do not move to the next phase until the current one is done and `task.md` reflects that every task in it is checked off.

---

## Step 5 — Multi-Developer Collaboration & Merge Handling

When more than one developer (each possibly running their own Hermes session) works on the same application:

1. **`plan.md` is the shared contract.** Both developers' Hermes sessions read the same `plan.md`. Sections 5–8 (Architecture, Tech Decisions, API Contract, Data Model) are binding — if a developer's work requires deviating from them, `plan.md` must be updated and re-approved by the human **before** implementation continues, so the two branches don't silently diverge.
2. **Branch isolation.** Each developer works on their own branch (`feature/<name>-<task>`), never directly on `main`.
3. **Before merging a branch, run a Merge-Readiness Loop:**
   - Pull the latest `main` into the feature branch (merge or rebase).
   - Re-run the **full test suite** against the merged result — not just the feature branch's own tests. A feature can pass alone and still break the combined codebase.
   - **Classify any conflicts:**
     - *Textual, non-overlapping logic* (e.g., two unrelated functions changed in the same file) → Hermes resolves automatically, re-runs tests to confirm, and logs the resolution.
     - *Semantic conflicts* (both developers changed the same function, the same API contract, or overlapping logic) → Hermes does **not** auto-resolve. It presents both versions side by side, explains what each does, and asks a human to decide. Implementation does not continue until a decision is made.
   - Only after tests pass on the merged result does the branch become mergeable.
4. **Merge via Pull Request, not direct push to `main`** (see Step 7 for exact merge policy).
5. After any merge, create a `docs/MERGE_<date>_<branches>.md` log: which branches were merged, what conflicts were found, how each was resolved, and the post-merge test results.

---

## Step 6 — Industry-Grade Production Documentation (MANDATORY)

Every project MUST produce and maintain the following documentation artifacts:

1. **Root `README.md`:**
   - System architecture diagram (ASCII or Mermaid) illustrating services, components, databases, and network flows.
   - Component & Port Inventory table.
   - User Roles & Access Control matrix.
   - Quickstart Guide via container orchestration (`docker compose up -d --build` or equivalent).
   - Local Development Setup Guide (environment variables, dependency installation, running services locally).
   - Test execution commands and test suite coverage summary.
   - Links to all phase documentation files.

2. **`docs/APPLICATION_DOCUMENTATION.md` (Comprehensive Technical & Operational Spec):**
   - Detailed architectural boundary rules, data isolation, and inter-service protocols.
   - Complete API endpoint reference with request/response schemas, status codes, and authentication requirements.
   - Domain Data Models, field specifications, indices, constraints, and relational mappings.
   - State transition diagrams and lifecycle rules.
   - Background tasks, queues, scheduler intervals, and event-driven workflows.
   - Error handling policies, failure modes, and graceful degradation strategies.

3. **`docs/PHASE_<number>_<short-name>.md`:**
   - Summary of features and components implemented in each phase.
   - Loop Engineering log (diagnoses, fixes, iterations).
   - Test results broken out by type (unit, integration, API, security, performance, edge case, and user stories), referencing Test Case IDs (`TC-xxx`).

---

## Step 7 — Version Control & GitHub Automation

### 7.0 — GitHub Authentication: When and How

- **When to give credentials:** right after `plan.md` is approved in Step 3 and configured via Step 3.1 before Step 4 begins.
- **How:** use a fine-grained, repo-scoped GitHub Personal Access Token (or a GitHub App installation) with `Contents` (read/write), `Pull requests` (read/write), and `Workflows` (if applicable) permissions.
- **Never paste the token directly into chat.** Set it as an environment variable (e.g., `GITHUB_TOKEN`) in the shell/session Hermes runs in. Hermes must never print, log, or commit the token anywhere, and must treat it as a secret.
- Before starting implementation, confirm authentication with a test call or push.

### 7.1 — Automation Policy

Default policy:
- Hermes may push freely to `feature/*` branches and open Pull Requests automatically.
- `main` is protected: merges require CI green and human approval (unless autonomous merge is explicitly configured).
- Push all completed code, tests, and documentation to the remote repository on `main` / feature branch at the end of every phase.
- Every commit message should reference the phase or feature it implements (e.g., `feat(phase-2): add user auth endpoints`).

---

## Step 8 — Deployment & Verification

- Deploy per `plan.md` Section 17.
- Run the Post-Implementation Verification checks from Section 25 (smoke tests, health checks, metrics/log verification, regression tests).
- Give the human the **live URL** to verify directly, along with a short summary of what was deployed.

### 8.1 — Frontend Browser E2E Verification & User Story Testing (Mandatory when UI is present)

- When the project includes a user interface, Hermes MUST execute automated end-to-end browser verification against the running application using Playwright (or `@playwright/test` / Vitest Browser Mode) and live user-story automation scripts.
- Automated tests must cover all user journeys and every possible scenario:
  1. Authentication & registration flows and session persistence.
  2. Route protection and unauthenticated redirect behaviors.
  3. Complete feature lifecycles (e.g., creating, viewing, editing, listing, interacting, uploading/downloading files, transitioning states).
  4. Role-gated controls and permission views across all user roles.
  5. Negative scenarios (validation failures, forbidden actions, offline service graceful degradation).
  6. Absence of unhandled browser console errors or broken network requests.
- Report observed browser test and user story results in the phase documentation.

---

## Step 9 — Adding a New Feature Later

When the human wants to add a feature after the initial build:
1. **Update `plan.md`, not a separate file** — add new Functional Requirements, User Stories, Test Cases, Edge Cases, and update Architecture/Data Model/API Contract if touched. Add a new phase under Section 23.
2. **Re-run the Human Review Gate (Step 3)** for just the new/changed sections.
3. **Implement the new phase** using the Loop Engineering cycle (Step 4).
4. **Run full regression** — both backend test suite and Playwright browser / user story E2E tests.
5. **Update documentation** (`APPLICATION_DOCUMENTATION.md`, `README.md`, and create `docs/PHASE_*.md`).
6. **Branch, PR, merge** following Step 7.
7. **Deploy and re-verify** (Step 8) — give human updated URL.

---

## Step 10 — Microservices Adaptation

Use this when the application is split into multiple services, each owned by a different developer/workspace.

**Folder structure:**
```
project-root/
  SYSTEM-PLAN.md          ← shared: architecture, service boundaries, inter-service contracts
  service-<name-a>/
    prd.md
    plan.md                ← this service's own full plan.md (Appendix A template)
    docs/
  service-<name-b>/
    prd.md
    plan.md
    docs/
```

### 10.1 Create `SYSTEM-PLAN.md` First (before any service-level work)
Generate `SYSTEM-PLAN.md` using Appendix D. Goes through Step 3 Human Review Gate before any service's `plan.md` is written.

### 10.2 Service `plan.md` Bound to `SYSTEM-PLAN.md`
Each service gets its own `plan.md` matching `SYSTEM-PLAN.md` interfaces.

### 10.3 Contract Testing
Add Consumer-Driven Contract Tests to Section 14/15.

---

# APPENDIX A — plan.md Template

*(This is the exact structure Hermes must produce in Step 2. Fill every section based on prd.md; mark unknowns as Open Questions in Section 22 rather than guessing.)*

```markdown
# PLAN.md

## 1. Overview
- Project / feature name
- Problem statement
- Goal
- Non-goals
- Success criteria

## 2. Requirements
### Functional Requirements
- FR-001:
- FR-002:
- FR-003:

### User Stories & Complete Lifecycle Scenarios
- US-001 (Actor): As a [role], I want to [action] so that [benefit].
  - Scenario A (Happy Path): [Given / When / Then]
  - Scenario B (Edge / Negative Path): [Given / When / Then]
- US-002 (Actor): ...

### Non-Functional Requirements
- Performance
- Scalability
- Availability
- Reliability
- Security
- Observability
- Maintainability

## 3. Scope
### In Scope
### Out of Scope

## 4. User / System Flows
- Main user flow
- Error flows
- Edge cases
- State transitions

## 5. Architecture
- Components
- Services
- Dependencies
- Data flow
- External integrations
- Architecture diagram

### Project Directory Structure (required for every project)
- The actual folder/file tree Hermes will create or is working within.

### Frontend Plan (required whenever the project has a UI)
- Pages / screens / routes
- Component hierarchy
- State management approach
- Client-server data flow
- Styling approach
- Navigation guards & accessibility

## 6. Technology Decisions
- Language, Framework, Database, Cache, Queue, Libraries, Rationale

## 7. API / Interface Contract
- Endpoints, Request/Response Schemas, Auth, Error Responses

## 8. Data Model
- Entities, Relationships, Indexes, Constraints
- **JSON/JSONB constraint:** No JSON/JSONB schemaless columns unless prd.md explicitly requires one.

## 9. Security
- Auth, RBAC, input validation, encryption, secret management

## 10. Scalability
## 11. Performance
## 12. Error Handling & Resilience
## 13. Observability
## 14. Testing Strategy (Backend, Frontend, Contract, User Stories)
## 15. Test Cases & User Story Verification Matrix
## 16. Edge Cases
## 17. Deployment
## 18. CI/CD
## 19. Compatibility
## 20. Migration / Upgrade Plan
## 21. Risks & Trade-offs
## 22. Open Questions
## 23. Implementation Plan
## 24. Definition of Done
## 25. Post-Implementation Verification
## 26. Existing Codebase Analysis
## 27. Implementation Constraints
## 28. Acceptance Criteria
```

---

# APPENDIX B — Loop Engineering (Reference)

**Definition:** every build/test/fix cycle follows **propose → validate → diagnose → refine → converge**, never a single one-shot attempt (max 5 iterations before reporting blocker).

---

# APPENDIX C — Quick Checklist

- [ ] `prd.md` provided
- [ ] `plan.md` generated per Appendix A with **comprehensive User Stories for all lifecycle scenarios**
- [ ] `plan.md` Section 5 includes a concrete Project Directory Structure (not just prose)
- [ ] `plan.md` Section 8 has no JSON/JSONB fields unless `prd.md` explicitly required them
- [ ] `task.md` generated per Appendix E, derived from `plan.md` Section 23
- [ ] **Human explicitly approved both `plan.md` and `task.md` before any code was written (Step 3)**
- [ ] **GitHub repository initialized with Description, Topics, and remote tracking configured (Step 3.1)**
- [ ] Each phase implemented via Loop Engineering cycle, tests passing before moving on, tasks checked off in `task.md`
- [ ] **Industry-grade root `README.md` created with architecture diagrams and run commands (Step 6)**
- [ ] **`docs/APPLICATION_DOCUMENTATION.md` created with full technical, API, and domain specs (Step 6)**
- [ ] Phase doc created after each phase in `docs/PHASE_*.md`
- [ ] Multi-developer branches merged only after full-suite re-validation
- [ ] `main` protected — PR + green CI required
- [ ] **Automated Playwright browser E2E and complete User Story verification executed if project has a UI (Step 8.1)**
- [ ] **All code and documentation committed and pushed to remote GitHub repository (Step 7)**
- [ ] Deployment verified and URL handed to the human

---

# APPENDIX D — SYSTEM-PLAN.md Template (Microservices)

*(Standard microservices system plan template)*

---

# APPENDIX E — task.md Template

*(Standard task tracking checklist template)*
