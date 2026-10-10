# Bask Health — Intake Studio Master Checklist

**Status:** Phase 1 architecture documented; implementation pending (2026-10-10)  
**Source:** Candidate brief and supplied reference screenshots (October 2026)  
**Purpose:** Track implementation, architecture decisions, edge cases, tests, deployment, and submission evidence.  
**Legend:** `[ ]` not started · `[x]` completed · `[!]` decision or clarification required

> The Figma screens are loose references, not pixel-perfect specifications. Design a coherent desktop admin editor and responsive patient flow. Do not mistake the mockup's seven questions or illustrated submissions for complete acceptance criteria.


## Live progress dashboard (update every implementation iteration)

**Status vocabulary:**
- `DONE`: Implemented and verified with evidence.
- `PARTIAL`: Partly implemented or tested.
- `IN PROGRESS`: Currently being implemented.
- `PENDING`: Not started or blocked.

| Workstream | Status | Evidence / File Paths / Next Condition |
|---|---|---|
| Requirements analysis and reference interpretation | DONE | Acceptance criteria decomposed into `CHECKLIST.md` and `PHASE_1_ARCHITECTURE.md`. |
| Phase 1: architecture proposal and ADRs | DONE | Documented in `docs/architecture/README.md`, `docs/architecture/ADRS.md` (ADR-001 through ADR-012). |
| Phase 1: schema, security, edge-case design | DONE | Documented in `docs/architecture/ERD.md`, `docs/architecture/API_CONTRACTS.md`, `docs/architecture/THREAT_MODEL.md`, `docs/architecture/EDGE_CASES.md`, `docs/architecture/DEFENSE_IN_DEPTH.md`. |
| Next.js 16 source scaffold / strict TS / Polaris | DONE | `package.json` (`next@^16.4.0`), `tsconfig.json` (strict, 0 errors via `npm run typecheck`), `eslint.config.mjs` (0 errors via `npm run lint`). |
| Domain contracts & pure validation rules | DONE | `src/features/forms/domain/` and `src/features/patients/domain/`; verified via 26 passing unit tests. |
| 100-field fixture & performance trace | DONE | `tests/fixtures/100-field-fixture.ts`; verified via `tests/unit/domain/100-field-benchmark.test.ts` (<5ms latency). |
| PostgreSQL schema and migrations | DONE | Drizzle schema (`src/lib/db/schema.ts`), SQL DDL (`db/migrations/0001_initial_schema.sql`), migration runner with advisory locking and SHA-256 checksums (`scripts/migrate.mjs`, `src/lib/db/migrate.ts`); verified applied on live hosted Supabase PostgreSQL (`vjstbqhzfnwrkksgavfv`). |
| Admin authentication & workspace RBAC | PARTIAL | Backend service & claims verification DONE (`src/lib/auth/admin.ts`, `src/lib/supabase/server.ts`). Reviewer Login UI (`/admin/login`), login API (`/api/auth/login`, `/api/auth/logout`, `/api/auth/me`), and route redirect guards implemented (Phase 2A). Full production user onboarding PENDING. |
| Admin draft CRUD & concurrency lifecycle | PARTIAL | Backend CAS service DONE. HTTP API routes (`/api/admin/forms`, `/api/admin/forms/[formId]`), Form Builder 3-pane UI, Field Navigator with Polaris Icons, Question Inspector, Form Canvas, and Autosave Engine with HTTP 409 Conflict Modal implemented and compiled (Phase 2A). E2E browser verification PENDING. |
| Publish immutable versions & triggers | PARTIAL | Backend publish service & DB triggers DONE (`trg_protect_published_versions`). Publish API route (`/api/admin/forms/[formId]/publish`) and Publish Modal with clinical validation summary implemented (Phase 2A). Patient intake route PENDING Phase 3. |
| Patient session persistence & submission | PARTIAL | Backend session & submission services DONE (`src/features/patients/server/session-service.ts`, `src/features/patients/server/submission-service.ts`, verified via Tests 8-14). Patient HTTP routes & mobile UI PENDING Phase 3. |
| Responses administration | PARTIAL | Backend response service DONE (`src/features/forms/server/response-service.ts`, verified via Test 15). HTTP response routes & admin responses UI PENDING Phase 2/3. |
| Automated database integration & E2E tests | PARTIAL | 52 tests passing: 37 unit/benchmark tests + 15 real PostgreSQL concurrency integration tests (`tests/integration/postgres-integration.test.ts`). Playwright browser E2E pending Phase 2 UI. |
| CI/CD & Deployment workflows | PARTIAL | Gated migration workflow (`.github/workflows/db-migrate.yml`), CI gate (`.github/workflows/ci.yml`) with hardened permissions, Vercel preview/production isolation plan (`docs/DEPLOYMENT.md`). Awaiting reviewer Vercel connection. |
| Reviewer deliverables & audit logs | PARTIAL | Architecture artifacts, checklist, and `docs/PROGRESS.md` maintained; demo video pending Phase 2/3. |

**Files:** `CHECKLIST.md` (master), `PHASE_1_ARCHITECTURE.md`, `PHASE_1_LOCAL_AI_PROMPT.md`, `docs/PROGRESS.md`, `docs/architecture/*`.

**Next milestone:** Phase 2A Administrative Editor UI Foundation, Draft Management, and Polaris Icons.

---

## Active Security Invariants & Open Audit Findings (Phase 1B Review)

The following four security findings from the Phase 1B audit remain **OPEN** and must be actively enforced across all Phase 2 and Phase 3 implementations:

- [!] **SEC-01 (HIGH): Application DB Connection Bypasses Supabase RLS**  
  *Context:* Drizzle queries execute under the PostgreSQL `postgres` role (`rolbypassrls = true`, table owner). Supabase default-deny RLS is only evaluated on browser-side PostgREST requests.  
  *Mandatory Invariant:* Every Route Handler and Server Action in Phase 2 & Phase 3 must explicitly invoke `requireAdmin()` and `requireWorkspaceMembership()` or `requireFormWorkspaceAccess()`. Do not assume Drizzle queries automatically enforce tenant isolation.
- [!] **SEC-02 (MEDIUM): Patient Cookie Namespace Collision Across Concurrent Forms**  
  *Context:* If a patient opens two different forms concurrently in the same browser, a static cookie name (e.g. `bask_session_token`) would overwrite the other session.  
  *Mandatory Invariant:* Patient HTTP handlers in Phase 3 must namespace capability cookies per form slug (e.g. `bask_session_${publicSlug}`) with `Path=/` or `Path=/api/patient`, `HttpOnly`, `Secure`, `SameSite=Strict`.
- [!] **SEC-03 (LOW): HTTP Route Boundary CSRF & Origin Verification**  
  *Context:* Backend domain logic executes safely, but browser-facing HTTP mutation endpoints (`POST`, `PUT`, `DELETE`) require cross-site forgery protection.  
  *Mandatory Invariant:* All mutating Route Handlers in Phase 2 & Phase 3 must validate `request.headers.get('origin')` against the request host and reject untrusted cross-origin mutations.
- [!] **SEC-04 (MEDIUM): Admin Login & Session Flow (UI/API boundary)**  
  *Context:* Server-verified authentication (`getServerVerifiedUser()` via `auth.getClaims()`) is implemented, but the admin login HTTP Route Handler, session cookie exchange, and protected route redirect UX remain pending.  
  *Mandatory Invariant:* Implement secure login Route Handler using Supabase Auth with rate limiting, secure cookies, and Next.js 16 `proxy.ts` edge session refresh before deploying administrative routes.

---

## 0. Requirements and scope decisions

- [ ] Use **Next.js 16 App Router**, **TypeScript**, **Tailwind CSS**, and **Polaris icons**.
- [ ] Enforce strict TypeScript; no `any` or `@ts-ignore` in application code.
- [ ] Design original UI/UX: desktop admin, mobile-first patient, responsive empty/loading/error/success states.
- [ ] Use a **real hosted database**, deployed app on **Vercel**, and private admin access.
- [ ] Use the small sample intake and **100-field fixture** as illustrative seeds and performance benchmarks.
- [ ] Clarify whether “graphify” and “pony tail” refer to specific tools/frameworks; **neither is stipulated by the brief**. Avoid adding technology solely based on an ambiguous name.
- [ ] Document architecture and important decisions, including intentionally excluded features.

### Scope boundary

**Required:** drafts, editor, preview, publish/versioning, patient fill/resume/submit, conditional logic, admin responses, dual-mode theming with presets and Shuffle, persistence, authentication/access rules, tests, performance proof, deployment and deliverables.

**Not required:** full signup/account recovery, mobile admin editor, nested conditions/general rules engine, Redis, GraphQL, HIPAA certification, custom field-level encryption, live collaborative editing in the Google Docs sense.

**Additional design challenge:** Two admins editing the same draft. The brief does not explicitly demand live collaboration, but robust conflict handling is a sensible architecture decision.

## 1. Architecture decisions (agree before coding)

- [ ] Adopt a single **Next.js 16 application** with admin routes, versioned public patient routes, and server-only data access.
- [ ] Select hosted **Supabase PostgreSQL** as the source of truth; **skip Redis initially**. Confirm Supabase free-tier limits and Vercel integration before shipping.
- [ ] Decide DB access pattern: server-side Postgres adapter/ORM (e.g. Drizzle + migration tooling) **or** Supabase client with strict RLS; avoid mixing authorization models accidentally.
- [ ] Use Supabase Auth for admin login or implement a secure single reviewer identity; enforce **authorization on every server operation**, not only middleware/client navigation.
- [ ] Model admin memberships/roles for multi-admin support if multiple editors are allowed.
- [ ] Keep write operations on the server (Route Handlers or Server Actions); provide transactional database functions/RPC for atomic mutations as necessary.
- [ ] Share pure validation/condition logic between preview and patient UX; **always revalidate on the server**.
- [ ] Create a canonical **FormDefinition** schema with stable `questionId` and `optionId` (not indexes or mutable labels).
- [ ] Choose a versioned persistence model: mutable draft, **immutable published snapshots** of questions + theme.
- [ ] Use JSONB form definitions for quick full-draft atomic updates, or normalized draft questions; document tradeoffs. Recommended: JSONB editor aggregate + immutable published JSONB snapshot + relational sessions/submissions.
- [ ] Use DB constraints and **transactions** for submission idempotency, optimistic concurrency, and publish races.
- [ ] Configure environment validation, migrations, seed scripts, error capture without PII, and deployment pipeline.

### Proposed logical data model

- [ ] `users` / `admin_memberships`: authenticated user, workspace, role, active status.
- [ ] `forms`: id, workspace_id, name, current_draft_id/current_version, created_at, updated_at, deleted_at (if soft delete).
- [ ] `drafts`: id, form_id, title, `definition_json`, `theme_json`, `revision` (monotonic), updated_by, updated_at; unpublished drafts may be deleted.
- [ ] `published_versions`: id, form_id, version_number, immutable `definition_snapshot`, immutable `theme_snapshot`, created_at, published_by, public_slug/token. Unique `(form_id, version_number)`.
- [ ] `patient_sessions`: id, published_version_id, status (`in_progress`/`completed`), answer_json, last_seen_at, created_at, completed_at, access-token hash (or separate resume credentials), and optional non-secret display reference.
- [ ] `submissions`: id, session_id **UNIQUE**, published_version_id, canonical answer_json, submitted_at; immutable after creation.
- [ ] Optional `audit_events`: admin operation, entity id, actor id, time, non-sensitive metadata; never log answers or resume tokens.
- [ ] Add foreign keys, indexes, delete policies, and least-privilege grants. Prevent cascading deletion of submitted historical data.

### Recommended folder boundaries

```text
src/
  app/
    (admin)/admin/forms/...            # draft list, builder, theme, responses
    (public)/intake/[versionSlug]/...  # intake start/resume/complete
    api/...                             # narrowly scoped endpoints if needed
  components/admin/
  components/patient/
  components/ui/
  features/forms/domain/               # pure schema, visibility, validation
  features/forms/server/               # auth, persistence, publishing
  features/sessions/server/            # resume credentials, submission
  features/themes/                     # token generation and WCAG checks
  lib/db/  lib/auth/  lib/security/
tests/unit/  tests/integration/  tests/e2e/
```

## 2. Authentication and authorization

- [ ] **Yes, authentication is required**: private reviewer/admin login; full signup/reset flows are explicitly not required.
- [ ] Protect admin routes, server endpoints/actions, database access, and response reads.
- [ ] Scope every admin query/mutation to authorized workspace/form.
- [ ] Ensure unauthenticated users cannot draft, publish, change theme, list responses, or read private submissions.
- [ ] Public published-form read grants no admin privileges.
- [ ] Patient resume requires a high-entropy, session-specific credential; store only a hash server-side.
- [ ] Prefer **HttpOnly, Secure, SameSite** cookie for same-browser resumes; provide a deliberate cross-browser mechanism, e.g. one-time resume link/code delivered to the original patient through a **verified** channel, or a user-held secret. Do not claim another-browser resume works through cookies alone.
- [ ] Ensure resume URLs never carry **answers**; if a resume token appears in a URL, minimize leakage (Referrer-Policy, no analytics, token rotation/redemption, scrub history), and document risk. Prefer code entry / token exchange.
- [ ] Rate-limit guessing, credential redemption, and public writes; no cross-session access via sequential IDs.
- [ ] Do not expose Supabase service-role keys in client bundles. Keep admin authorization independent of cosmetic UI hiding.
- [ ] Test direct API requests and cross-user/workspace/session privilege escalation.

## 3. Draft list / lifecycle

- [ ] Create a new unpublished draft.
- [ ] List/search/open existing drafts; show title, modified time, save state and publish status.
- [ ] Rename unpublished drafts.
- [ ] Delete unpublished drafts with confirmation and reasonable recovery policy.
- [ ] Define how a previously published form gets a new editable draft without mutating prior versions.
- [ ] Restore draft after refresh from most recent **successfully committed** DB state.
- [ ] Empty, loading, permission-denied, network-failure and removed-draft states.

## 4. Builder and question editing

- [ ] Add, select, edit, duplicate, delete and reorder questions.
- [ ] Provide **keyboard-accessible Move up / Move down** as alternative to drag-and-drop.
- [ ] Field types: short text, long text, number, single-select, multi-select, checkbox.
- [ ] Persist label, helper text, required toggle, placeholder where meaningful.
- [ ] Text fields: min/max length (where chosen), required whitespace-trim validation.
- [ ] Numbers: optional min/max bounds, integer-only setting, finite-number check.
- [ ] Single/multi-select: >=2 distinctly labeled options with **stable option IDs**, no duplicate normalized labels, no blank options.
- [ ] Checkbox: required means it must be checked.
- [ ] Duplicate regenerates question/option IDs; decide whether conditions on duplicated questions are copied only if still valid.
- [ ] Supports large labels and long help text, narrow windows, overflow management, scrolling and unsaved changes.
- [ ] Preview uses actual field widgets, client validation and condition evaluation without writing production responses.
- [ ] Persist draft edits and theme settings across reloads; incomplete drafts are allowed.

## 5. Conditional visibility and dependency integrity

- [ ] Limit each field to **one** condition: upstream earlier, required, **unconditional single-select** question equals a selected option ID.
- [ ] Do not allow nested conditions or arbitrary boolean expressions.
- [ ] Refer to parent question and choice by stable IDs; **renaming** a label/option does not break a rule.
- [ ] Reordering parent after dependent marks condition invalid; editor flags it and publication is blocked.
- [ ] Deleting parent/option marks dependency invalid; provide a clear “Fix condition” action.
- [ ] Making parent optional, conditional, or changing its type invalidates dependents.
- [ ] Reordering/replacing/deleting must never silently retarget a condition to another option.
- [ ] When a parent answer no longer matches, remove **all newly hidden answers** in UI and DB, including server-side sanitization.
- [ ] Re-showing a previously hidden field starts blank; unrelated visible values survive.
- [ ] Validate all dependency integrity during **publish** (not just during editing).
- [ ] Validate conditions against the published snapshot when **saving progress and submitting**.

## 6. Autosave and concurrent admin editing

- [ ] Implement debounced autosave with explicit states: `editing`, `saving`, `saved`, `failed`, `conflict`, `offline`.
- [ ] Keep local dirty edits intact when a save fails; offer Retry, not destructive reload.
- [ ] Every write uses **expected revision**, e.g. `UPDATE drafts ... WHERE id=? AND revision=? RETURNING revision`.
- [ ] On a successful write, increment revision atomically; acknowledge only the revision and contents actually committed.
- [ ] Prevent older requests/responses from marking newer edits as saved; use client sequence numbers and/or serialized saves plus server revision checks.
- [ ] Two admins saving against the same revision: exactly one wins; other receives **409 conflict**.
- [ ] Show conflict UI: compare latest server state to local edits; choose reload, manual merge, or copy unsaved edits before resolution. **Do not silently last-write-wins.**
- [ ] Consider a small “Someone else is editing” presence indicator as an enhancement, **not** a substitute for concurrency control.
- [ ] Publishing is transactional and pinned to an expected draft revision; if the revision changes, fail with a clear “Draft changed; review and retry”.
- [ ] Version numbers allocated in a transaction/under DB lock to avoid duplicate version N during simultaneous publish.
- [ ] If publish succeeds but network response is lost, retry detects existing publication for that operation (idempotency key) rather than generating unintended extra versions.
- [ ] Deletion vs editing/publishing race handled explicitly (not ghost drafts or resurrected data).

## 7. Publication and historical stability

- [ ] Draft may be invalid/incomplete and still save.
- [ ] Publish blocks on missing labels, duplicate choices, invalid ranges, broken conditions, and any unsupported configuration.
- [ ] Show navigable error summary with links/focus to offending question.
- [ ] Publish creates immutable snapshot of field IDs, question text, choice labels, settings, order, visibility logic **and light/dark theme tokens**.
- [ ] Each version gets its **own public URL**. Republishing creates another version; never overwrite snapshots.
- [ ] Existing patient sessions bind to exactly one `published_version_id` for their lifetime.
- [ ] Response detail displays labels/options and theme/version provenance **as of original publication**, not the latest draft.
- [ ] Prevent accidental snapshot edits/deletes via code and DB permissions/constraints.
- [ ] Test editing and republishing while old-version sessions are still active.

## 8. Patient flow, progress, and resume

- [ ] Fast mobile-first public page for an exact published version; no admin navigation or secret data.
- [ ] Render questions in defined order, skipping hidden fields; progress shows understandable answered/visible status (decide semantics when conditions change).
- [ ] Back/Continue behavior preserves valid answers and shows inline accessible error messages.
- [ ] Patient can leave and resume **database-backed** incomplete progress (including securely from another browser).
- [ ] Decide patient consent/session-creation UX and expiry policy.
- [ ] Persist incomplete progress safely: allow missing required answers while unfinished; reject malformed/unknown values.
- [ ] Save progress only against the session's pinned version.
- [ ] On switching parent Yes -> No, delete dependent answer in persisted session immediately/atomically with parent change.
- [ ] Show network failure/offline status, retry, expired/invalid resume credential, and interrupted completion recovery.
- [ ] Prevent two patient tabs from stale writes overwriting newer answers (session revision/CAS or merge protocol); document UX.
- [ ] Completion screen should be idempotently retrievable after refresh/retry.

## 9. Server-side validation and exact-once submission

- [ ] Validate with authoritative published schema, never trust client-supplied question definitions or visibility.
- [ ] Reject or drop unknown question IDs; unknown choice IDs and malformed values must not become responses.
- [ ] Required short/long text must contain non-whitespace characters; enforce length consistently.
- [ ] Reject `NaN`, infinity, bad number formats, out-of-range numbers and fractional values for integer-only fields.
- [ ] Single-select must match known option; multi-select must have unique known choices and >=1 valid choice if required.
- [ ] Required checkbox must be `true`.
- [ ] Hidden answers are **removed on the server** from both progress and submission payload; never persisted as submitted answers.
- [ ] Final submission checks every **visible** required question and condition consistency.
- [ ] Use a DB transaction locking the session row, and `UNIQUE(submissions.session_id)` to guarantee one response per session.
- [ ] Submission first attempt marks session completed and inserts response atomically; a retry returns the **same submission ID and success state**.
- [ ] Concurrent duplicate submits converge to one result; unexpected conflict cannot mutate the first answer.
- [ ] Once completed, progress/save/answer mutations are rejected (or return immutable completion), not silently applied.
- [ ] Test lost response, double click, parallel requests, slow requests and invalid client bypass attempts.

## 10. Responses administration
 
- [ ] Admin-only submissions list, with paging and optional search/filter/date/version: Backend service `listFormSubmissions` DONE (`src/features/forms/server/response-service.ts`), HTTP route & Admin UI PENDING.
- [ ] Distinguish draft, published version, in-progress sessions, submitted responses: Backend schema and status queries DONE, UI presentation PENDING.
- [ ] Submission detail: submitted at, stable public version, original question and option labels, answers, skipped/hidden representation: Backend service `getSubmissionDetail` DONE (`src/features/forms/server/response-service.ts`), UI detail view PENDING.
- [x] Display old-version submissions accurately after rename/reorder/delete in a new draft: Immutably preserved via `trg_protect_submissions` and `published_version_id` foreign key (verified in Integration Test 13).
- [x] Empty/loading/error states and no cross-tenant/access leaks: Multi-tenant workspace RBAC enforced on response reads (verified in Integration Test 15).
- [ ] Don't expose sensitive answers through browser analytics or unguarded exports: Backend query sanitization DONE; client analytics audit PENDING UI implementation.

## 11. Themes, presets, contrast and Shuffle

- [ ] Centralize semantic tokens: backgrounds, surfaces, text, muted text, border, primary, primary text, selected state, error, focus, success, etc.
- [ ] At least **three named palettes** (e.g. Ocean, Forest, Plum), each with matching light and dark variants.
- [ ] Admin selects preset and can **Shuffle** to produce a *fresh* usable palette (not rotate presets).
- [ ] Programmatically validate generated palette pair contrast: WCAG AA **4.5:1 normal text**, **3:1 large text**; also review focus/interactive non-text contrast.
- [ ] Regenerate or adjust colors until validated; use deterministic seeded tests to sample many Shuffle results.
- [ ] Admin controls palette and publishes both display modes; patients may switch **only light/dark**.
- [ ] Patient cannot choose preset, shuffle, or edit color tokens.
- [ ] Persist draft theme DB-side across refresh; snapshot published theme with version.
- [ ] Verify contrast for disabled, errors, buttons, selected options, inputs, links, focus, loading and completion states.
- [ ] Apply tokens consistently across admin preview and patient UI; maintain accessible contrast with long labels.
- [ ] Respect reduced-motion preferences.

## 12. UI/UX and accessibility

- [ ] Original visual language with consistent typography, space, affordances and micro-interactions.
- [ ] Desktop admin builder with field navigator, preview and inspector; consider narrower desktop/tablet layouts.
- [ ] Responsive mobile patient flow, touch targets, sticky/accessible navigation.
- [ ] Valid `<label>` associations, fieldsets/legends for groups, semantic buttons and form controls.
- [ ] All core operations keyboard accessible; visible focus; correct tab order and no keyboard traps.
- [ ] Validation error summary, field-specific feedback, `aria-describedby` and announced status where appropriate.
- [ ] Meaningful loading, skeleton, empty, conflict, denied, offline, retry, publish and completion states.
- [ ] Avoid disruptive animations; account for `prefers-reduced-motion`.
- [ ] Test zoom, long translated/expanded content, narrow widths, screen reader landmarks and focus restoration.

## 13. Testing strategy (start early)

### Unit tests (Vitest)
 
- [x] Field validators: types, required text, lengths, numeric bounds/integer, checkboxes and select membership (verified in `tests/unit/domain/patient-validation.test.ts`).
- [x] Condition evaluation, earlier-parent invariant and stable ID behavior across labels/ordering (verified in `tests/unit/domain/patient-visibility.test.ts` and `form-validation.test.ts`).
- [x] Hidden-answer pruning and re-show-empty behavior (verified in `tests/unit/domain/patient-visibility.test.ts`).
- [x] Publish-time validation and error targeting (verified in `tests/unit/domain/form-validation.test.ts`).
- [x] Recovery code entropy, normalization, HMAC hashing, and constant-time check (verified in `tests/unit/security/credentials.test.ts`).
- [x] 100-field performance trace (<5ms publish and pruning latency; verified in `tests/unit/domain/100-field-benchmark.test.ts`).
- [ ] Theme contrast computation and randomized Shuffle property/sample tests (pending Phase 2 theme sprint).

### DB/API integration tests (real test Postgres preferred)

- [x] Authentication and workspace isolation: unauthorized read/write/publish/response access (verified via Tests 7 & 15 in `tests/integration/postgres-integration.test.ts`).
- [x] Autosave revision conflicts and old-response handling (verified via Tests 1 & 2).
- [x] Two-editor simultaneous update; conflict never loses local changes silently (verified via Test 1).
- [x] Simultaneous publish and edit; same-revision publish and multiple publishes (verified via Tests 3 & 4).
- [x] Immutable published snapshot after later editing/republishing (verified via Tests 5 & 6).
- [x] Cross-session resume credential misuse and session fixation/guessing defenses (verified via Tests 8 & 9).
- [x] Progress update removes hidden answer on server even if malicious client submits it (verified via Test 10).
- [x] Invalid client bypass cannot submit (verified via Test 14).
- [x] Parallel duplicate submission and lost-response retry yield one DB row and unchanged answers (verified via Tests 11 & 12).
- [x] Completed session is immutable; old published version remains usable (verified via Tests 5, 6, 11, 13).

### Playwright E2E tests (desktop admin + mobile patient)

- [ ] Reviewer/admin login and protected route redirect.
- [ ] Create -> rename -> add/edit/reorder/duplicate -> preview -> autosave -> reload.
- [ ] Invalid draft may save but publication blocked with actionable errors.
- [ ] Fix conditions -> publish v1 -> open public URL on mobile viewport.
- [ ] Fill conditional Yes -> details -> Back -> No; verify details gone, then Yes -> details blank.
- [ ] Save progress, close/reopen and resume; repeat through chosen cross-browser redemption mechanism.
- [ ] Submit, refresh, double-click/retry and inspect admin response detail.
- [ ] Modify draft -> publish v2; confirm v1 URL/session/old response unchanged.
- [ ] Theme preset, Shuffle, persistence, publish, patient light/dark only.
- [ ] Simulate network failure during autosave, then recover without losing edits.
- [ ] Simulate editing conflict in two browser contexts.
- [ ] Accessibility smoke assertions, keyboard reorder, narrow mobile viewport and long question content.
- [ ] Deterministic fixture reset for repeatable tests; no production patient data in CI.

## 14. 100-field performance evidence

- [ ] Seed supplied or equivalent 100-field fixture; capture realistic conditional/options structure.
- [ ] Identify representative device/browser and throttling conditions (e.g. Chrome, laptop model, CPU throttle, build mode).
- [ ] Capture **one performance trace** of typing, selecting questions, editing settings and changing visibility.
- [ ] Record measurable metrics: React commit/render profiles, interaction latency (INP-style), long tasks and/or trace timelines.
- [ ] Investigate editor update propagation; selectively memoize field rows, isolate input state, virtualize only if necessary.
- [ ] Compare before/after with same environment, or explain a justified no-optimization decision supported by trace.
- [ ] Include screenshot/trace artifact path and written rationale in README.

## 15. Deployment, security and operations

- [ ] Set up production Vercel project and hosted Supabase Postgres/Auth.
- [ ] Store production secrets only in Vercel/Supabase private environment configuration; `.env.example` has names only.
- [ ] HTTPS front end and TLS-encrypted DB connections; document Supabase-managed encryption at rest and transport guarantees.
- [ ] Run schema migrations against hosted database with backup/recovery plan.
- [ ] Ensure secure cookies/session handling, CSRF protection where applicable, auth and RLS/DB access checks.
- [ ] Add restrictive caching headers for sensitive admin/session data; avoid shared-cache leaks.
- [ ] Never log PII/answers/resume tokens in application logs, analytics, monitoring or error reports.
- [ ] Guard error handlers so sensitive request payloads do not leak into telemetry.
- [ ] Consider basic public endpoint rate limiting and abuse controls **without requiring Redis** (DB-backed or hosting protections).
- [ ] Document what must change for real patient data: regulatory/compliance review, verified BAA where needed, encryption strategy, key management/rotation, auditable access, retention/deletion, incident response.
- [ ] Test production deployed flows; validate migrations, auth, role isolation, Vercel environment and public URLs.

## 16. Notable edge-case matrix

| Area | Edge case | Expected result |
|---|---|---|
| Draft autosave | A request returns after a newer save | Do not mark newer content saved or replace local edits |
| Draft autosave | Server rejects write/network disconnect | Retain local changes, report failed state, retry |
| Two admins | Both update revision 7 | One commits revision 8; other gets conflict and explicit resolution |
| Two admins | One deletes while other edits | Second gets gone/conflict; no resurrection |
| Publish | Draft edited between validate and publish | Transaction checks expected revision; publish consistent snapshot or fails |
| Publish | Two admins publish simultaneously | Unique versions; no partially published snapshot or accidental duplicates |
| Reorder | Conditional child moved before parent | Flag rule error; block publish |
| Delete | Referenced parent or option removed | Flag invalid dependency; no silent retargeting |
| Rename | Parent/option label renamed | IDs preserve link; published labels remain historically stable |
| Answer changes | Yes -> No -> Yes | Dependent answer removed and returns blank; unrelated answers intact |
| Malicious save | Hidden value included in payload | Server strips it before persisting |
| Malicious submit | Unknown option, whitespace text, decimal integer | Final validation rejects invalid payload |
| Resume | Browser A tries browser B's session ID | Denied without valid secret/verified redemption |
| Resume | Two tabs edit same session | Detect revision conflict or controlled merge, never overwrite silently |
| Version | Publish v2 while v1 patient mid-way | Patient remains pinned to v1; response displays v1 labels |
| Submit | Double click, concurrent calls, timeout after commit | Same success/submission ID, exactly one immutable response |
| Complete | Save progress after successful submission | Rejected/no mutation of canonical answer |
| Theme | Shuffle produces unreadable button/error/focus | Reject/adjust palette before accepting |
| Security | Public user calls admin mutation API directly | Server rejects even if UI route is hidden |
| Delete | Delete form with existing submissions | Preserve published versions and responses per retention policy |

## 17. Deliverables and review checklist

- [ ] **Live Vercel URL** with working hosted backend/database.
- [ ] At least one **published patient intake URL**.
- [ ] Provide private working reviewer credentials by secure channel (not public README).
- [ ] Create **private repository named `FirstNameBaskHealth`** (replace `FirstName` with actual intended first name).
- [ ] Invite GitHub users: `inveve`, `p13lgst-bask`, `abdelaziz11`, `mauri-bask-health`, `MarwanBask`, `khaled-bask`, `luizbask`, `tsellobenok-bask`, `juanbask`.
- [ ] `README.md`: local setup, seed data, environment names, migration/test commands, technical & design decisions, hosting, performance trace and measurement, security/privacy note, tradeoffs, unfinished work.
- [ ] Demo video **<=5 minutes**: create/edit, preview, publish, mobile conditional completion, responses, **one deliberate failure and recovery**.
- [ ] Collect **task-specific AI prompts and responses from every tool/session**, redact unrelated personal data and credentials.
- [ ] Identify one AI-generated suggestion changed/rejected, explain why, and show how outcome was verified.
- [ ] Verify fresh install + fresh database seed + tests + deployed public/admin smoke test before submitting.

## 18. Suggested implementation sequence / gates

- [ ] **Phase 0 — Architecture:** agree data schema, auth boundaries, snapshot semantics, concurrency strategy, resume trust model and chosen DB access style.
- [ ] **Phase 1 — Foundation:** Next.js, Tailwind, Polaris icons, Supabase, migrations, auth, CI, test harness, seed scripts.
- [ ] **Phase 2 — Domain first:** Zod/types (or equivalent), validators, conditional engine, publish validation; write unit tests.
- [ ] **Phase 3 — Admin drafts:** list/create/rename/delete; editor UI; keyboard reorder; autosave + revision conflicts and tests.
- [ ] **Phase 4 — Publication:** immutable snapshot + transactional version allocation + stable public URLs; integration tests.
- [ ] **Phase 5 — Patient:** progress, secure resume, server-side pruning/validation, exact-once submission; integration and E2E tests.
- [ ] **Phase 6 — Responses:** protected list/detail, historically accurate labels and version references.
- [ ] **Phase 7 — Themes & polish:** presets, Shuffle/contrast generator, dark/light, accessibility/responsive UX, failure/recovery.
- [ ] **Phase 8 — Evidence:** 100-field trace, automated suite, security checks, Vercel deployment, video, AI logs, README.

### Decisions to settle before Phase 1

1. **DB access:** Drizzle/Postgres server-side, or Supabase client/RLS-centric?
2. **Admin collaboration:** optimistic revision + conflict resolution (recommended) versus stronger draft ownership/locking? Real-time collaboration is not required.
3. **Cross-browser patient resume:** user-held code, verified email OTP/magic link, or another mechanism? This is a real requirement and should be designed, not improvised.
4. **Draft organization:** one editable draft for each form, or multiple independent unpublished drafts? Match the requirement to create/open/rename/delete unpublished drafts.
5. **Session privacy/retention:** expiry, anonymous session creation, intentional recovery policy and acceptable demo-safe content.
6. **Tool names:** confirm what “graphify” and “pony tail” refer to before adding them.

## 19. Provisional architecture recommendation

For this assessment, start with a **modular monolith**: Next.js 16 + Supabase PostgreSQL + Supabase Auth + one DB access convention + Zod domain schemas + Vitest + Playwright. **Redis is unnecessary** for 100 form fields and a demo-sized user base; PostgreSQL already offers transactions, unique constraints, optimistic concurrency and reliable persistence. Maintain immutable `published_versions` and session-bound `published_version_id`. Use a compare-and-swap revision for admin drafts, and a transactional unique `session_id` for submissions. Optimize only after measuring the 100-field case.

The highest-risk problems are **cross-browser resume ownership**, **multi-editor conflict safety**, **hidden-answer server sanitization**, **immutable historical versions**, and **idempotent concurrent submission**. Complete and test these before spending excessive time on cosmetic fidelity.
