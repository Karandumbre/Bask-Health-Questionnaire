# Bask Health — Intake Studio Master Checklist

**Status:** Core application features and local verification reported complete; Vercel deployment and submission deliverables pending (2026-10-10). Reported results require repository/artifact verification.

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

| Workstream                                         | Status  | Evidence / File Paths / Next Condition                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requirements analysis and reference interpretation | DONE    | Acceptance criteria decomposed into `CHECKLIST.md` and `docs/architecture/`.                                                                                                                                                                                                                                                                                                                                                |
| Phase 1: architecture proposal and ADRs            | DONE    | Documented in `docs/architecture/README.md`, `docs/architecture/ADRS.md` (ADR-001 through ADR-012).                                                                                                                                                                                                                                                                                                                         |
| Phase 1: schema, security, edge-case design        | DONE    | Documented in `docs/architecture/ERD.md`, `docs/architecture/API_CONTRACTS.md`, `docs/architecture/THREAT_MODEL.md`, `docs/architecture/EDGE_CASES.md`, `docs/architecture/DEFENSE_IN_DEPTH.md`.                                                                                                                                                                                                                            |
| Next.js 16 source scaffold / strict TS / Polaris   | DONE    | `package.json` (`next@^16.4.0`), `tsconfig.json` (strict, 0 errors via `npm run typecheck`), `eslint.config.mjs` (0 errors via `npm run lint`).                                                                                                                                                                                                                                                                             |
| Domain contracts & pure validation rules           | DONE    | `src/features/forms/domain/` and `src/features/patients/domain/`; verified via 26 passing unit tests.                                                                                                                                                                                                                                                                                                                       |
| 100-field fixture & performance trace              | DONE    | Fixture (`tests/fixtures/100-field-fixture.ts`), domain benchmark (`tests/unit/domain/100-field-benchmark.test.ts`), `PatientQuestionField` `React.memo` with stabilized `onAnswerChange` callback (`PatientIntakeView.tsx`, `PatientQuestionField.tsx`), and trace report (`docs/architecture/PERFORMANCE_100_FIELD.md`).                                                                                                  |
| PostgreSQL schema and migrations                   | DONE    | Drizzle schema (`src/lib/db/schema.ts`), SQL DDL (`db/migrations/0001_initial_schema.sql`, `db/migrations/0002_enable_rls_and_revoke_grants.sql`), migration runner with advisory locking and SHA-256 checksums (`scripts/migrate.mjs`, `scripts/lib/migration-engine.mjs`); verified applied on live hosted Supabase PostgreSQL (`vjstbqhzfnwrkksgavfv`).                                                                  |
| Admin authentication & workspace RBAC              | DONE    | Backend service & claims verification (`src/lib/auth/admin.ts`, `src/lib/supabase/server.ts`). Reviewer Login UI (`/admin/login`), login API (`/api/auth/login`, `/api/auth/logout`, `/api/auth/me`), route redirect guards, strict fail-closed test-auth guard with explicit DB allowlist (`src/lib/auth/test-auth-guard.ts`, `src/lib/db/test-db-isolation.ts`).                                                          |
| Admin draft CRUD & concurrency lifecycle           | DONE    | Backend CAS service (`src/features/forms/server/draft-service.ts`), API routes (`/api/admin/forms`, `/api/admin/forms/[formId]`), 3-pane UI, Field Navigator with Polaris Icons, Inspector, Canvas, debounced autosave state machine, enhanced `ConflictModal.tsx`, draft rename/delete, verified via E2E and unit tests.                                                                                                   |
| Publish immutable versions & validation triggers   | DONE    | Backend publish service & DB triggers (`trg_protect_published_versions`), `/api/admin/forms/[formId]/publish`, publish readiness validation blocking broken rules, snapshot generation, and Playwright E2E verification.                                                                                                                                                                                                    |
| Theme Token Architecture & Contrast Engine         | DONE    | Centralized typed tokens (`src/features/themes/domain/theme-tokens.ts`), 3 WCAG AA presets (Ocean, Emerald, Slate), self-adjusting Shuffle palette generator ($\ge 4.5:1$), RGB Euclidean color distance ($\Delta C_{RGB} \ge 25$) and fingerprinting (`color.ts`), applied in both Editor and Preview modes (`FormCanvas.tsx`), verified via 1,000 deterministic samples in `tests/unit/themes/theme-tokens.test.ts`.      |
| Three-Way Merge & Conflict Recovery                | DONE    | Deterministic 3-way draft merge engine (`src/features/forms/domain/three-way-merge.ts`), base revision tracking in `BuilderProvider`, auto-merge with CAS against server revision, verified via `tests/unit/forms/three-way-merge.test.ts`.                                                                                                                                                                                 |
| Patient HTTP Foundation & Endpoints                | DONE    | Public patient routes (`/api/patient/forms/[slug]`, `.../session`, `.../progress`, `.../resume`, `.../submit`), namespaced HttpOnly cookies (`bask_session_${slug}`), zero PHI in logs/URLs, CSRF origin verification, bounded 15m cooldown, verified via 22 tests in `tests/unit/patients/patient-flow\.test.ts`.                                                                                                          |
| Mobile Patient Intake Experience & Recovery        | DONE    | Responsive mobile interface (`/intake/[slug]`, `PatientIntakeView`), accessible 6 field types, dynamic conditional visibility & answer pruning, progress bar, recovery code presentation & cross-browser redemption modals, verified via `tests/e2e/patient-flow\.spec.ts`.                                                                                                                                                 |
| Responses administration                           | DONE    | Full admin responses view (`/admin/forms/[formId]/responses`), API endpoint (`/api/admin/forms/[formId]/responses`), client API (`src/features/forms/client/responses-api.ts`), historical snapshot viewer with label provenance, typed answer rendering, empty/loading/error states (`src/features/forms/components/ResponsesView\.tsx`), workspace RBAC verified in Integration Test 15 and `tests/e2e/phase-3b.spec.ts`. |
| Database test isolation enforcement                | DONE    | Fail-closed database allowlist (`src/lib/db/test-db-isolation.ts`) enforcing `APPROVED_TEST_PROJECT_REFS = ["vjstbqhzfnwrkksgavfv"]` and loopback hosts, verified across all integration suites and test auth guard. Refuses execution on production or Vercel.                                                                                                                                                             |
| Automated database integration & E2E tests         | DONE    | 29/29 real PostgreSQL integration tests passing in 120.0s (`tests/integration/`), 196/196 unit tests passing across 28 files (`tests/unit/`), 11/11 Playwright E2E tests passing across real database and server (`tests/e2e/phase-3b.spec.ts`, `tests/e2e/patient-flow\.spec.ts`, `tests/e2e/smoke.spec.ts`).                                                                                                              |
| CI/CD & Deployment workflows                       | PARTIAL | Gated migration workflow (`.github/workflows/db-migrate.yml`), CI gate (`.github/workflows/ci.yml`), Vercel preview/production isolation plan (`docs/DEPLOYMENT.md`). Workflows authored; GitHub/Vercel linkage and live deployment not verified.                                                                                                                                                                           |
| Reviewer deliverables & audit logs                 | PARTIAL | Root `README.md`, architecture artifacts (`docs/architecture/*`), checklist, and `docs/PROGRESS.md` aligned with implementation; production URL, public intake URL, 5-minute demo video, reviewer access and complete redacted AI logs pending live deployment.                                                                                                                                                             |

**Files:** `README.md`, `CHECKLIST.md` (master), `docs/PROGRESS.md`, `docs/architecture/*`.

**Next milestone:** Phase 3B Review & Final Deliverables Assessment.

---

## Security invariants and remaining verification

The Phase 1B findings below are ongoing security requirements. Cookie namespacing, mutation origin checks, and the admin login flow now exist in source; this cleanup does not constitute a new security audit.

- [!] ****SEC-01 (HIGH): Application DB Connection Bypasses Supabase RLS****

_*Context:*_ Drizzle queries execute under the PostgreSQL `postgres` role (`rolbypassrls = true`, table owner). Supabase default-deny RLS is only evaluated on browser-side PostgREST requests.

_*Mandatory Invariant:*_ Every Route Handler and Server Action in Phase 2 & Phase 3 must explicitly invoke `requireAdmin()` and `requireWorkspaceMembership()` or `requireFormWorkspaceAccess()`. Do not assume Drizzle queries automatically enforce tenant isolation.

- [!] ****SEC-02: Per-form cookie isolation implemented; preserve this invariant****

_*Context:*_ If a patient opens two different forms concurrently in the same browser, a static cookie name (e.g. `bask_session_token`) would overwrite the other session.

_*Mandatory Invariant:*_ Patient HTTP handlers in Phase 3 must namespace capability cookies per form slug (e.g. `bask_session_${publicSlug}`) with `Path=/` or `Path=/api/patient`, `HttpOnly`, `Secure`, `SameSite=Strict`.

- [!] ****SEC-03: Mutation origin verification implemented; preserve this invariant****

_*Context:*_ Backend domain logic executes safely, but browser-facing HTTP mutation endpoints (`POST`, `PUT`, `DELETE`) require cross-site forgery protection.

_*Mandatory Invariant:*_ All mutating Route Handlers in Phase 2 & Phase 3 must validate `request.headers.get('origin')` against the request host and reject untrusted cross-origin mutations.

- [!] ****SEC-04: Admin login implemented; login rate limiting remains pending****

_*Context:*_ Server-verified authentication, login/logout Route Handlers, cookie exchange, protected page redirects, and `proxy.ts` session refresh are implemented. The login handler does not currently implement rate limiting.

_*Mandatory Invariant:*_ Implement secure login Route Handler using Supabase Auth with rate limiting, secure cookies, and Next.js 16 `proxy.ts` edge session refresh before deploying administrative routes.

---

**Outstanding deployment review:** `SEC-01` still depends on explicit authorization because the privileged Drizzle connection bypasses RLS. Verify restricted production DB roles/grants where feasible. `SEC-04` login rate limiting remains pending. Confirm no test-auth fallback is active in hosted deployments, and use a positive test-DB allowlist (not a boolean flag alone). Never execute disposable-fixture tests against production.

---

## Original acceptance criteria

The detailed lists below preserve the original brief and planning gates. Checkboxes below reflect evidence reported through 2026-10-10. `[x]` means reported implemented/tested, not independently audited by this review; `[ ]` means pending or still needing acceptance evidence. Consult the dashboard and `docs/PROGRESS.md` for scope and dates.

## 0. Requirements and scope decisions

- [x] Use ****Next.js 16 App Router****, ****TypeScript****, ****Tailwind CSS****, and ****Polaris icons****.

- [x] Enforce strict TypeScript; no `any` or `@ts-ignore` in application code.

- [x] Design original UI/UX: desktop admin, mobile-first patient, responsive empty/loading/error/success states.

- [ ] Use a ****real hosted database****, deployed app on ****Vercel****, and private admin access.

- [x] Use the small sample intake and ****100-field fixture**** as illustrative seeds and performance benchmarks.

- Graphify and Ponytail are development tools selected by the user; neither is an application dependency or a requirement of the brief.

- [x] Document architecture and important decisions, including intentionally excluded features.

### Scope boundary

****Required:**** drafts, editor, preview, publish/versioning, patient fill/resume/submit, conditional logic, admin responses, dual-mode theming with presets and Shuffle, persistence, authentication/access rules, tests, performance proof, deployment and deliverables.

****Not required:**** full signup/account recovery, mobile admin editor, nested conditions/general rules engine, Redis, GraphQL, HIPAA certification, custom field-level encryption, live collaborative editing in the Google Docs sense.

****Additional design challenge:**** Two admins editing the same draft. The brief does not explicitly demand live collaboration, but robust conflict handling is a sensible architecture decision.

## 1. Architecture decisions (agree before coding)

- [x] Adopt a single ****Next.js 16 application**** with admin routes, versioned public patient routes, and server-only data access.

- [ ] Select hosted ****Supabase PostgreSQL**** as the source of truth; ****skip Redis initially****. Confirm Supabase free-tier limits and Vercel integration before shipping.

- [x] Decide DB access pattern: server-side Postgres adapter/ORM (e.g. Drizzle + migration tooling) ****or**** Supabase client with strict RLS; avoid mixing authorization models accidentally.

- [x] Use Supabase Auth for admin login or implement a secure single reviewer identity; enforce ****authorization on every server operation****, not only middleware/client navigation.

- [x] Model admin memberships/roles for multi-admin support if multiple editors are allowed.

- [x] Keep write operations on the server (Route Handlers or Server Actions); provide transactional database functions/RPC for atomic mutations as necessary.

- [x] Share pure validation/condition logic between preview and patient UX; ****always revalidate on the server****.

- [x] Create a canonical ****FormDefinition**** schema with stable `questionId` and `optionId` (not indexes or mutable labels).

- [x] Choose a versioned persistence model: mutable draft, ****immutable published snapshots**** of questions + theme.

- [x] Use JSONB form definitions for quick full-draft atomic updates, or normalized draft questions; document tradeoffs. Recommended: JSONB editor aggregate + immutable published JSONB snapshot + relational sessions/submissions.

- [x] Use DB constraints and ****transactions**** for submission idempotency, optimistic concurrency, and publish races.

- [ ] Configure environment validation, migrations, seed scripts, error capture without PII, and deployment pipeline.

### Proposed logical data model

- [x] `users` / `admin_memberships`: authenticated user, workspace, role, active status.

- [x] `forms`: id, workspace_id, name, current_draft_id/current_version, created_at, updated_at, deleted_at (if soft delete).

- [x] `drafts`: id, form_id, title, `definition_json`, `theme_json`, `revision` (monotonic), updated_by, updated_at; unpublished drafts may be deleted.

- [x] `published_versions`: id, form_id, version_number, immutable `definition_snapshot`, immutable `theme_snapshot`, created_at, published_by, public_slug/token. Unique `(form_id, version_number)`.

- [x] `patient_sessions`: id, published_version_id, status (`in_progress`/`completed`), answer_json, last_seen_at, created_at, completed_at, access-token hash (or separate resume credentials), and optional non-secret display reference.

- [x] `submissions`: id, session_id ****UNIQUE****, published_version_id, canonical answer_json, submitted_at; immutable after creation.

- [x] Optional `audit_events`: admin operation, entity id, actor id, time, non-sensitive metadata; never log answers or resume tokens.

- [ ] Add foreign keys, indexes, delete policies, and least-privilege grants. Prevent cascading deletion of submitted historical data.

### Recommended folder boundaries

```text

src/

&#x20; app/

&#x20;   (admin)/admin/forms/...            # draft list, builder, theme, responses

&#x20;   (public)/intake/[versionSlug]/...  # intake start/resume/complete

&#x20;   api/...                             # narrowly scoped endpoints if needed

&#x20; components/admin/

&#x20; components/patient/

&#x20; components/ui/

&#x20; features/forms/domain/               # pure schema, visibility, validation

&#x20; features/forms/server/               # auth, persistence, publishing

&#x20; features/sessions/server/            # resume credentials, submission

&#x20; features/themes/                     # token generation and WCAG checks

&#x20; lib/db/  lib/auth/  lib/security/

tests/unit/  tests/integration/  tests/e2e/

```

## 2. Authentication and authorization

- [x] ****Yes, authentication is required****: private reviewer/admin login; full signup/reset flows are explicitly not required.

- [x] Protect admin routes, server endpoints/actions, database access, and response reads.

- [x] Scope every admin query/mutation to authorized workspace/form.

- [x] Ensure unauthenticated users cannot draft, publish, change theme, list responses, or read private submissions.

- [x] Public published-form read grants no admin privileges.

- [x] Patient resume requires a high-entropy, session-specific credential; store only a hash server-side.

- [x] Prefer ****HttpOnly, Secure, SameSite**** cookie for same-browser resumes; provide a deliberate cross-browser mechanism, e.g. one-time resume link/code delivered to the original patient through a ****verified**** channel, or a user-held secret. Do not claim another-browser resume works through cookies alone.

- [x] Ensure resume URLs never carry ****answers****; if a resume token appears in a URL, minimize leakage (Referrer-Policy, no analytics, token rotation/redemption, scrub history), and document risk. Prefer code entry / token exchange.

- [x] Rate-limit guessing, credential redemption, and public writes; no cross-session access via sequential IDs.

- [x] Do not expose Supabase service-role keys in client bundles. Keep admin authorization independent of cosmetic UI hiding.

- [x] Test direct API requests and cross-user/workspace/session privilege escalation.

## 3. Draft list / lifecycle

- [x] Create a new unpublished draft.

- [x] List/search/open existing drafts; show title, modified time, save state and publish status.

- [x] Rename unpublished drafts.

- [x] Delete unpublished drafts with confirmation and reasonable recovery policy.

- [x] Define how a previously published form gets a new editable draft without mutating prior versions.

- [x] Restore draft after refresh from most recent ****successfully committed**** DB state.

- [x] Empty, loading, permission-denied, network-failure and removed-draft states.

## 4. Builder and question editing

- [x] Add, select, edit, duplicate, delete and reorder questions.

- [x] Provide ****keyboard-accessible Move up / Move down**** as alternative to drag-and-drop.

- [x] Field types: short text, long text, number, single-select, multi-select, checkbox.

- [x] Persist label, helper text, required toggle, placeholder where meaningful.

- [x] Text fields: min/max length (where chosen), required whitespace-trim validation.

- [x] Numbers: optional min/max bounds, integer-only setting, finite-number check.

- [x] Single/multi-select: >=2 distinctly labeled options with ****stable option IDs****, no duplicate normalized labels, no blank options.

- [x] Checkbox: required means it must be checked.

- [x] Duplicate regenerates question/option IDs; decide whether conditions on duplicated questions are copied only if still valid.

- [x] Supports large labels and long help text, narrow windows, overflow management, scrolling and unsaved changes.

- [x] Preview uses actual field widgets, client validation and condition evaluation without writing production responses.

- [x] Persist draft edits and theme settings across reloads; incomplete drafts are allowed.

## 5. Conditional visibility and dependency integrity

- [x] Limit each field to ****one**** condition: upstream earlier, required, ****unconditional single-select**** question equals a selected option ID.

- [x] Do not allow nested conditions or arbitrary boolean expressions.

- [x] Refer to parent question and choice by stable IDs; ****renaming**** a label/option does not break a rule.

- [x] Reordering parent after dependent marks condition invalid; editor flags it and publication is blocked.

- [x] Deleting parent/option marks dependency invalid; provide a clear “Fix condition” action.

- [x] Making parent optional, conditional, or changing its type invalidates dependents.

- [x] Reordering/replacing/deleting must never silently retarget a condition to another option.

- [x] When a parent answer no longer matches, remove ****all newly hidden answers**** in UI and DB, including server-side sanitization.

- [x] Re-showing a previously hidden field starts blank; unrelated visible values survive.

- [x] Validate all dependency integrity during ****publish**** (not just during editing).

- [x] Validate conditions against the published snapshot when ****saving progress and submitting****.

## 6. Autosave and concurrent admin editing

- [x] Implement debounced autosave with explicit states: `editing`, `saving`, `saved`, `failed`, `conflict`, `offline`.

- [x] Keep local dirty edits intact when a save fails; offer Retry, not destructive reload.

- [x] Every write uses ****expected revision****, e.g. `UPDATE drafts ... WHERE id=? AND revision=? RETURNING revision`.

- [x] On a successful write, increment revision atomically; acknowledge only the revision and contents actually committed.

- [x] Prevent older requests/responses from marking newer edits as saved; use client sequence numbers and/or serialized saves plus server revision checks.

- [x] Two admins saving against the same revision: exactly one wins; other receives ****409 conflict****.

- [x] Show conflict UI: compare latest server state to local edits; choose reload, manual merge, or copy unsaved edits before resolution. ****Do not silently last-write-wins.****

- [ ] Consider a small “Someone else is editing” presence indicator as an enhancement, ****not**** a substitute for concurrency control.

- [x] Publishing is transactional and pinned to an expected draft revision; if the revision changes, fail with a clear “Draft changed; review and retry”.

- [x] Version numbers allocated in a transaction/under DB lock to avoid duplicate version N during simultaneous publish.

- [x] If publish succeeds but network response is lost, retry detects existing publication for that operation (idempotency key) rather than generating unintended extra versions.

- [x] Deletion vs editing/publishing race handled explicitly (not ghost drafts or resurrected data).

## 7. Publication and historical stability

- [x] Draft may be invalid/incomplete and still save.

- [x] Publish blocks on missing labels, duplicate choices, invalid ranges, broken conditions, and any unsupported configuration.

- [x] Show navigable error summary with links/focus to offending question.

- [x] Publish creates immutable snapshot of field IDs, question text, choice labels, settings, order, visibility logic ****and light/dark theme tokens****.

- [x] Each version gets its ****own public URL****. Republishing creates another version; never overwrite snapshots.

- [x] Existing patient sessions bind to exactly one `published_version_id` for their lifetime.

- [x] Response detail displays labels/options and theme/version provenance ****as of original publication****, not the latest draft.

- [x] Prevent accidental snapshot edits/deletes via code and DB permissions/constraints.

- [x] Test editing and republishing while old-version sessions are still active.

## 8. Patient flow, progress, and resume

- [x] Fast mobile-first public page for an exact published version; no admin navigation or secret data.

- [x] Render questions in defined order, skipping hidden fields; progress shows understandable answered/visible status (decide semantics when conditions change).

- [x] Back/Continue behavior preserves valid answers and shows inline accessible error messages.

- [x] Patient can leave and resume ****database-backed**** incomplete progress (including securely from another browser).

- [x] Decide patient consent/session-creation UX and expiry policy.

- [x] Persist incomplete progress safely: allow missing required answers while unfinished; reject malformed/unknown values.

- [x] Save progress only against the session's pinned version.

- [x] On switching parent Yes -> No, delete dependent answer in persisted session immediately/atomically with parent change.

- [x] Show network failure/offline status, retry, expired/invalid resume credential, and interrupted completion recovery.

- [x] Prevent two patient tabs from stale writes overwriting newer answers (session revision/CAS or merge protocol); document UX.

- [x] Completion screen should be idempotently retrievable after refresh/retry.

## 9. Server-side validation and exact-once submission

- [x] Validate with authoritative published schema, never trust client-supplied question definitions or visibility.

- [x] Reject or drop unknown question IDs; unknown choice IDs and malformed values must not become responses.

- [x] Required short/long text must contain non-whitespace characters; enforce length consistently.

- [x] Reject `NaN`, infinity, bad number formats, out-of-range numbers and fractional values for integer-only fields.

- [x] Single-select must match known option; multi-select must have unique known choices and >=1 valid choice if required.

- [x] Required checkbox must be `true`.

- [x] Hidden answers are ****removed on the server**** from both progress and submission payload; never persisted as submitted answers.

- [x] Final submission checks every ****visible**** required question and condition consistency.

- [x] Use a DB transaction locking the session row, and `UNIQUE(submissions.session_id)` to guarantee one response per session.

- [x] Submission first attempt marks session completed and inserts response atomically; a retry returns the ****same submission ID and success state****.

- [x] Concurrent duplicate submits converge to one result; unexpected conflict cannot mutate the first answer.

- [x] Once completed, progress/save/answer mutations are rejected (or return immutable completion), not silently applied (verified in `tests/integration/patient-http-integration.test.ts` Test 10).

- [x] Test lost response, double click, parallel requests, slow requests and invalid client bypass attempts (verified in `tests/integration/patient-http-integration.test.ts` Tests 8, 9, 10).

## 10. Responses administration

- [x] Admin-only submissions list, with paging and optional search/filter/date/version: Backend service `listFormSubmissions` DONE (`src/features/forms/server/response-service.ts`), HTTP route `/api/admin/forms/[formId]/responses`, Admin UI `/admin/forms/[formId]/responses` (`src/features/forms/components/ResponsesView\.tsx`).

- [x] Distinguish draft, published version, in-progress sessions, submitted responses: Status badges, version badges, and submission timestamps rendered in table.

- [x] Submission detail: submitted at, stable public version, original question and option labels, answers, skipped/hidden representation: Backend service `getSubmissionDetail` DONE (`src/features/forms/server/response-service.ts`), UI detail modal rendering all 6 answer types with historical label provenance (`ResponsesView\.tsx`).

- [x] Display old-version submissions accurately after rename/reorder/delete in a new draft: Immutably preserved via `trg_protect_submissions` and `published_version_id` foreign key (verified in Integration Test 13 and `tests/e2e/phase-3b.spec.ts`).

- [x] Empty/loading/error states and no cross-tenant/access leaks: Multi-tenant workspace RBAC enforced on response reads (`requireAdmin` + `requireFormWorkspaceAccess`; verified in Integration Test 15).

- [x] Don't expose sensitive answers through browser analytics or unguarded exports: Backend query sanitization and server-side authorization on every response query.

## 11. Themes, presets, contrast and Shuffle

- [x] Centralize semantic tokens: backgrounds, surfaces, text, muted text, border, primary, primary text, selected state, error, focus, success, etc. (`src/design-system/tokens.css`, `src/features/themes/domain/theme-tokens.ts`).

- [x] At least ****three named palettes**** (e.g. Ocean, Emerald, Slate), each with matching light and dark variants (`src/features/themes/domain/presets.ts`).

- [x] Admin selects preset and can ****Shuffle**** to produce a _*fresh*_ usable palette across 360° hues avoiding current palette on each click (`src/features/themes/domain/shuffle.ts`, `src/features/themes/components/ThemeControls.tsx`).

- [x] Programmatically validate generated palette pair contrast: WCAG AA ****4.5:1 normal text****, ****3:1 large text****; also review focus/interactive non-text contrast (`src/features/themes/domain/color.ts`, `tests/unit/themes/theme-tokens.test.ts`).

- [x] Regenerate or adjust colors until validated; 1,000 deterministic seeded tests sample Shuffle results asserting zero violations (`tests/unit/themes/theme-tokens.test.ts`).

- [x] Admin controls palette and publishes both display modes; patients may switch ****only light/dark**** via sticky progress header (`PatientProgressBar.tsx`).

- [x] Patient cannot choose preset, shuffle, or edit color tokens (only light/dark mode switch presented in patient intake).

- [x] Persist draft theme DB-side across refresh; snapshot published theme with version (`src/features/forms/server/publish-service.ts`, verified in `tests/e2e/phase-3b.spec.ts`).

- [x] Verify contrast for disabled, errors, buttons, selected options, inputs, links, focus, loading and completion states (verified in unit tests and Playwright).

- [x] Apply tokens consistently across admin preview and patient UI; maintain accessible contrast with long labels (`PatientQuestionField.tsx`, `PatientIntakeView\.tsx`, `FormCanvas.tsx`).

- [x] Respect reduced-motion preferences (`--motion-reduced-duration` in `tokens.css`).

## 12. UI/UX and accessibility

- [x] Original visual language with consistent typography, space, affordances and micro-interactions.

- [x] Desktop admin builder with field navigator, preview and inspector; consider narrower desktop/tablet layouts.

- [x] Responsive mobile patient flow, touch targets, sticky/accessible navigation.

- [x] Valid `\<label>` associations, fieldsets/legends for groups, semantic buttons and form controls.

- [x] All core operations keyboard accessible; visible focus; correct tab order and no keyboard traps.

- [x] Validation error summary, field-specific feedback, `aria-describedby` and announced status where appropriate.

- [x] Meaningful loading, skeleton, empty, conflict, denied, offline, retry, publish and completion states.

- [x] Avoid disruptive animations; account for `prefers-reduced-motion`.

- [ ] Test zoom, long translated/expanded content, narrow widths, screen reader landmarks and focus restoration.

## 13. Testing strategy (start early)

### Unit tests (Vitest)

- [x] Field validators: types, required text, lengths, numeric bounds/integer, checkboxes and select membership (verified in `tests/unit/domain/patient-validation.test.ts`).

- [x] Condition evaluation, earlier-parent invariant and stable ID behavior across labels/ordering (verified in `tests/unit/domain/patient-visibility.test.ts` and `form-validation.test.ts`).

- [x] Hidden-answer pruning and re-show-empty behavior (verified in `tests/unit/domain/patient-visibility.test.ts`).

- [x] Publish-time validation and error targeting (verified in `tests/unit/domain/form-validation.test.ts`).

- [x] Recovery code entropy, normalization, HMAC hashing, and constant-time check (verified in `tests/unit/security/credentials.test.ts`).

- [x] 100-field performance trace (<5ms publish and pruning latency; verified in `tests/unit/domain/100-field-benchmark.test.ts`).

- [x] Theme contrast computation and randomized Shuffle property/sample tests (pending Phase 2 theme sprint).

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

- [x] Reviewer/admin login and protected route redirect.

- [ ] Create -> rename -> add/edit/reorder/duplicate -> preview -> autosave -> reload.

- [x] Invalid draft may save but publication blocked with actionable errors.

- [x] Fix conditions -> publish v1 -> open public URL on mobile viewport.

- [ ] Fill conditional Yes -> details -> Back -> No; verify details gone, then Yes -> details blank.

- [x] Save progress, close/reopen and resume; repeat through chosen cross-browser redemption mechanism.

- [x] Submit, refresh, double-click/retry and inspect admin response detail.

- [x] Modify draft -> publish v2; confirm v1 URL/session/old response unchanged.

- [x] Theme preset, Shuffle, persistence, publish, patient light/dark only.

- [ ] Simulate network failure during autosave, then recover without losing edits.

- [ ] Simulate editing conflict in two browser contexts.

- [x] Accessibility smoke assertions, keyboard reorder, narrow mobile viewport and long question content.

- [ ] Deterministic fixture reset for repeatable tests; no production patient data in CI.

## 14. 100-field performance evidence

- [x] Seed supplied or equivalent 100-field fixture; capture realistic conditional/options structure.

- [x] Identify representative device/browser and throttling conditions (e.g. Chrome, laptop model, CPU throttle, build mode).

- [ ] Capture ****one performance trace**** of typing, selecting questions, editing settings and changing visibility.

- [x] Record measurable metrics: React commit/render profiles, interaction latency (INP-style), long tasks and/or trace timelines.

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

- [ ] Consider basic public endpoint rate limiting and abuse controls ****without requiring Redis**** (DB-backed or hosting protections).

- [ ] Document what must change for real patient data: regulatory/compliance review, verified BAA where needed, encryption strategy, key management/rotation, auditable access, retention/deletion, incident response.

- [ ] Test production deployed flows; validate migrations, auth, role isolation, Vercel environment and public URLs.

## Phase 4 — Deployment and submission gates (current priority)

**Do not mark the following DONE until verified on the actual deployment.** The Supabase project `vjstbqhzfnwrkksgavfv` was reported as a disposable automated-test project; production must use a different project.

| Milestone                                             | Status  | Acceptance evidence required                                                                                       |
| ----------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------ |
| Private `KaranBaskHealth` GitHub repository           | PENDING | Private repository URL, clean secret scan, tracked workflow files                                                  |
| Automatic Vercel deployments                          | PENDING | Linked GitHub repo; preview deployment for PRs; production from `main`; successful deployment URLs                 |
| Separate production Supabase database and Auth        | PENDING | Different project ref from disposable test DB; production migrations applied via approved workflow                 |
| Secrets and transport verification                    | PENDING | Vercel environment scope; TLS database connection; provider-managed encryption at rest; no secrets in logs/commits |
| Deployed reviewer login and workspace isolation       | PENDING | Real Supabase Auth reviewer; anonymous and cross-workspace negative tests on hosted app                            |
| Published intake URL and end-to-end hosted smoke test | PENDING | Public URL; patient start/save/resume/submit; admin response list and detail                                       |
| Browser performance proof                             | PARTIAL | Original Chrome trace/profile attached and 100-field **editor** interactions measured/reproducible                 |
| Rate limit and production security review             | PARTIAL | Verify login and public writes/recovery controls, cookies, HTTP caching, CSRF, audit/retention notes               |
| Final README                                          | PENDING | Setup, seed, env names, test commands, tradeoffs, performance, security, unfinished work                           |
| Five-minute demonstration video                       | PENDING | Complete admin/patient flow plus deliberate failure and recovery                                                   |
| AI logs and changed/rejected suggestion               | PENDING | All task-related tool/session prompts and responses, redacted, with concrete verification example                  |
| Reviewer invitations and credentials                  | PENDING | Nine GitHub invitations sent; credentials shared privately                                                         |

**Previously reported local checks (not rerun in this checklist update):** 152 unit tests, 29 PostgreSQL integration tests, 11 Playwright tests, Next.js 16 production build with 20 routes. These are historical results, not confirmation that Vercel is live.

---

## 16. Notable edge-case matrix

| Area             | Edge case                                            | Expected result                                                            |
| ---------------- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| Draft autosave   | A request returns after a newer save                 | Do not mark newer content saved or replace local edits                     |
| Draft autosave   | Server rejects write/network disconnect              | Retain local changes, report failed state, retry                           |
| Two admins       | Both update revision 7                               | One commits revision 8; other gets conflict and explicit resolution        |
| Two admins       | One deletes while other edits                        | Second gets gone/conflict; no resurrection                                 |
| Publish          | Draft edited between validate and publish            | Transaction checks expected revision; publish consistent snapshot or fails |
| Publish          | Two admins publish simultaneously                    | Unique versions; no partially published snapshot or accidental duplicates  |
| Reorder          | Conditional child moved before parent                | Flag rule error; block publish                                             |
| Delete           | Referenced parent or option removed                  | Flag invalid dependency; no silent retargeting                             |
| Rename           | Parent/option label renamed                          | IDs preserve link; published labels remain historically stable             |
| Answer changes   | Yes -> No -> Yes                                     | Dependent answer removed and returns blank; unrelated answers intact       |
| Malicious save   | Hidden value included in payload                     | Server strips it before persisting                                         |
| Malicious submit | Unknown option, whitespace text, decimal integer     | Final validation rejects invalid payload                                   |
| Resume           | Browser A tries browser B's session ID               | Denied without valid secret/verified redemption                            |
| Resume           | Two tabs edit same session                           | Detect revision conflict or controlled merge, never overwrite silently     |
| Version          | Publish v2 while v1 patient mid-way                  | Patient remains pinned to v1; response displays v1 labels                  |
| Submit           | Double click, concurrent calls, timeout after commit | Same success/submission ID, exactly one immutable response                 |
| Complete         | Save progress after successful submission            | Rejected/no mutation of canonical answer                                   |
| Theme            | Shuffle produces unreadable button/error/focus       | Reject/adjust palette before accepting                                     |
| Security         | Public user calls admin mutation API directly        | Server rejects even if UI route is hidden                                  |
| Delete           | Delete form with existing submissions                | Preserve published versions and responses per retention policy             |

## 17. Deliverables and review checklist

- [ ] ****Live Vercel URL**** with working hosted backend/database.

- [ ] At least one ****published patient intake URL****.

- [ ] Provide private working reviewer credentials by secure channel (not public README).

- [ ] Create ****private repository named `FirstNameBaskHealth`**** (replace `FirstName` with actual intended first name).

- [ ] Invite GitHub users: `inveve`, `p13lgst-bask`, `abdelaziz11`, `mauri-bask-health`, `MarwanBask`, `khaled-bask`, `luizbask`, `tsellobenok-bask`, `juanbask`.

- [ ] `README.md`: local setup, seed data, environment names, migration/test commands, technical & design decisions, hosting, performance trace and measurement, security/privacy note, tradeoffs, unfinished work.

- [ ] Demo video ****<=5 minutes****: create/edit, preview, publish, mobile conditional completion, responses, ****one deliberate failure and recovery****.

- [ ] Collect ****task-specific AI prompts and responses from every tool/session****, redact unrelated personal data and credentials.

- [ ] Identify one AI-generated suggestion changed/rejected, explain why, and show how outcome was verified.

- [ ] Verify fresh install + fresh database seed + tests + deployed public/admin smoke test before submitting.

## 18. Suggested implementation sequence / gates

- [x] ****Phase 0 — Architecture:**** agree data schema, auth boundaries, snapshot semantics, concurrency strategy, resume trust model and chosen DB access style.

- [x] ****Phase 1 — Foundation:**** Next.js, Tailwind, Polaris icons, Supabase, migrations, auth, CI, test harness, seed scripts.

- [x] ****Phase 2 — Domain first:**** Zod/types (or equivalent), validators, conditional engine, publish validation; write unit tests.

- [x] ****Phase 3 — Admin drafts:**** list/create/rename/delete; editor UI; keyboard reorder; autosave + revision conflicts and tests.

- [x] ****Phase 4 — Publication:**** immutable snapshot + transactional version allocation + stable public URLs; integration tests.

- [x] ****Phase 5 — Patient:**** progress, secure resume, server-side pruning/validation, exact-once submission; integration and E2E tests.

- [x] ****Phase 6 — Responses:**** protected list/detail, historically accurate labels and version references.

- [x] ****Phase 7 — Themes & polish:**** presets, Shuffle/contrast generator, dark/light, accessibility/responsive UX, failure/recovery.

- [ ] ****Phase 8 — Evidence:**** 100-field trace, automated suite, security checks, Vercel deployment, video, AI logs, README.

### Decisions to settle before Phase 1

1\. ****DB access:**** Drizzle/Postgres server-side, or Supabase client/RLS-centric?

2\. ****Admin collaboration:**** optimistic revision + conflict resolution (recommended) versus stronger draft ownership/locking? Real-time collaboration is not required.

3\. ****Cross-browser patient resume:**** user-held code, verified email OTP/magic link, or another mechanism? This is a real requirement and should be designed, not improvised.

4\. ****Draft organization:**** one editable draft for each form, or multiple independent unpublished drafts? Match the requirement to create/open/rename/delete unpublished drafts.

5\. ****Session privacy/retention:**** expiry, anonymous session creation, intentional recovery policy and acceptable demo-safe content.

6\. ****Development tools:**** Graphify and Ponytail are configured separately from application dependencies.

## 19. Provisional architecture recommendation

For this assessment, start with a ****modular monolith****: Next.js 16 + Supabase PostgreSQL + Supabase Auth + one DB access convention + Zod domain schemas + Vitest + Playwright. ****Redis is unnecessary**** for 100 form fields and a demo-sized user base; PostgreSQL already offers transactions, unique constraints, optimistic concurrency and reliable persistence. Maintain immutable `published_versions` and session-bound `published_version_id`. Use a compare-and-swap revision for admin drafts, and a transactional unique `session_id` for submissions. Optimize only after measuring the 100-field case.

The highest-risk problems are ****cross-browser resume ownership****, ****multi-editor conflict safety****, ****hidden-answer server sanitization****, ****immutable historical versions****, and ****idempotent concurrent submission****. Complete and test these before spending excessive time on cosmetic fidelity.

## Maintainability review — 2026-10-10

- DONE: Shared condition rules, question actions/input rendering, option/constraint editors, dashboard composition and mutation hook, clipboard handling, and Supabase configuration.

- DONE: One migration engine and one environment loader; workspace provisioning separated from authentication.

- DONE: Revision-aware rename/autosave, consistent form lock order, scoped/serialized publication replay, recovery attempt persistence and expiration enforcement.

- DONE: Theme modules separated; presets, Shuffle, native answer controls, and light/dark preview wired to shared tokens.

- DONE: Safe JSON/pagination validation and regressions for draft comparison, unknown final answers, legacy theme reading, and shared session policy.

- PARTIAL: Database regressions added; execution requires a designated disposable test database.

- Historical scope: Patient pages/API routes and responses UI were pending at this refactor checkpoint and were subsequently delivered in Phase 3A/3B. See the live dashboard and dated progress entries.

## Design tokens and environment access — 2026-10-10

- DONE: Shared CSS/JS design foundations and primitive recipes; named editor/dialog/touch-target dimensions replace arbitrary values.

- DONE: Central application copy, formatted domain/validation messages, routes, API endpoints, timing, auth settings, and question defaults.

- DONE: One lazy environment name/access utility used by application code, scripts, database tooling, and E2E configuration; public browser getter and server-only wrapper retained.

- DONE: ESLint prevents direct environment reads in application code; regression tests cover fallback/override behavior and browser isolation.

- VERIFIED: 126 unit tests, TypeScript, lint, production build, and Chrome root/login/mobile checks. No database integration tests or migrations run.
