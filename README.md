# Intake Studio (KaranBaskHealth)

**Intake Studio** is a full-stack clinical form builder and patient intake platform built for desktop administrative authoring and responsive mobile patient intake (`Build → Preview & Style → Publish → Complete Intake → Review Response`).

> **Scope Note:** Uses synthetic clinical data only. Diagnosis, treatment eligibility, medication recommendations, dosing, and checkout are outside scope.

---

## 1. Architecture, Libraries, Schema, APIs & Authentication Decisions

### Core Stack & Libraries

- **Framework:** **Next.js 16 App Router** (`next@^16.4.0`) structured as a modular monolith separating administrative routes (`src/app/(admin)/admin/...`), public patient routes (`src/app/intake/[slug]/...`), and server-only Route Handlers (`src/app/api/...`).
- **Language & Type Safety:** **TypeScript 5** in strict mode (`strict: true`, `noEmit: true`) with **zero `any` and zero `@ts-ignore`** across application code.
- **Styling & Icons:** **Tailwind CSS v4** (`@tailwindcss/postcss`) backed by centralized semantic design tokens (`src/design-system/tokens.css`, `src/design-system/tokens.ts`, `src/design-system/component-styles.ts`) and **Shopify Polaris Icons** (`@shopify/polaris-icons`).
- **Database & ORM:** **Supabase PostgreSQL** accessed exclusively from server-only modules (`import "server-only"`) via **Drizzle ORM** (`drizzle-orm` + `postgres.js`). Browser clients never connect directly to PostgreSQL or PostgREST.
- **Validation & HTTP:** **Zod v4** for runtime schema validation at every untrusted request/response boundary; **Axios** (`src/lib/http/api-client.ts`) with normalized error envelopes and `AbortSignal` cancellation for browser API calls.
- **Why No Redis Initially:** Optimistic concurrency (`expectedRevision` CAS), row-level transactional locking (`SELECT ... FOR UPDATE`), publication operation idempotency (`publication_operations`), and recovery rate limiting (`recovery_attempts_count`) are handled directly in ACID PostgreSQL transactions (see [ADR-004](docs/architecture/ADRS.md)).

### Hybrid Database Schema (`src/lib/db/schema.ts`)

We use a **hybrid relational + immutable JSONB snapshot schema** (see [ERD.md](docs/architecture/ERD.md)):

1. **`workspaces` & `admin_memberships`:** Multi-tenant RBAC (`owner` and `editor` roles) scoping every form, draft, and response query.
2. **`forms` & `form_drafts`:** Mutable working draft aggregate (`definition_json`, `theme_json`) with a monotonic `revision` (`BIGINT`) counter for Compare-and-Swap (CAS) concurrency control.
3. **`published_versions` & `publication_operations`:** Immutable snapshots (`definition_snapshot`, `theme_snapshot`, `version_number`, `public_slug`) protected at the database level by a PostgreSQL trigger (`trg_protect_published_versions`) that rejects `UPDATE` and `DELETE`.
4. **`patient_sessions`:** Pinned to a specific `published_version_id` at creation. Tracks `status` (`in_progress` | `completed`), `answer_json`, monotonic `revision`, `credential_hash` (HMAC-SHA256 of the cookie capability token), `recovery_hash` (HMAC-SHA256 of the cross-browser recovery code), rate-limit counters (`recovery_attempts_count`, `recovery_last_attempt_at`), and AES-256-GCM encrypted `recovery_replay_payload`.
5. **`submissions`:** Enforces `UNIQUE(session_id)` for exact-once submission and a PostgreSQL trigger (`trg_protect_submissions`) forbidding `UPDATE` and `DELETE`.
6. **`audit_events`:** Records administrative lifecycle metadata (`actor_user_id`, `workspace_id`, `event_type`, `entity_id`) without logging patient answers or credentials.

### Authentication & Authorization Model

- **Admin Authentication:** Managed via **Supabase Auth** (`@supabase/ssr`) with Next.js 16 edge session refresh (`src/proxy.ts`). Server routes verify JWT claims (`auth.getClaims()` / `auth.getUser()`) and never trust unverified session cookies alone. Every admin service call enforces `requireAdmin()` and `requireWorkspaceMembership()` / `requireFormWorkspaceAccess()`.
- **Patient Session & Cross-Browser Resume:**
  - **Same-Browser:** Slug-namespaced `HttpOnly; Secure; SameSite=Strict` capability cookie (`bask_session_${slug}`).
  - **Cross-Browser / Cross-Device:** Issuing a session generates a public human-readable reference (`BKS-XXXX-XXXX`) and a one-time high-entropy Crockford Base-32 recovery code (`BK-XXXX-XXXX-XXXX-XXXX`, 80 bits of entropy). Only `HMAC-SHA256(code, APP_SESSION_PEPPER)` is stored in PostgreSQL, verified with `crypto.timingSafeEqual`. Redemption is rate-limited to **3 failed attempts per 15-minute window**, locks the session row (`SELECT ... FOR UPDATE`), atomically rotates the recovery code, and issues a fresh capability cookie. **Patient answers and recovery secrets never appear in URLs.**

---

## 2. Form Creation, Conditional Integrity & Concurrency

- **Six Question Types & Constraints:** Supports `short_text`, `long_text`, `number`, `single_select`, `multi_select`, and `checkbox` with required flags, helper descriptions, placeholders, min/max text lengths, min/max numeric bounds, integer-only constraints, and $\ge 2$ distinct labeled options for select fields.
- **Single Visibility Condition:** A question may depend on one earlier, required, unconditional `single_select` question matching a specific `optionId` (`src/features/forms/domain/conditions.ts`).
- **Stable Identity & Broken-Rule Detection:** Questions and options use stable UUIDs (`src/features/forms/domain/question-operations.ts`). Renaming labels preserves relationships. Deleting, reordering, making a parent optional, or making a parent conditional retains the condition reference, surfaces an explicit warning in the editor, and blocks publication (`validateFormForPublish`) with navigable error links until fixed.
- **Serialized Revision-Aware Autosave & Three-Way Merge:** `DraftAutosave` (`src/features/forms/client/draft-autosave.ts`) serializes in-flight saves, tracks acknowledged revisions against local edit sequence numbers so late responses never overwrite newer edits or falsely mark dirty state as saved, and handles `HTTP 409 REVISION_CONFLICT` via `ConflictModal.tsx` and a deterministic **Three-Way Merge engine** (`src/features/forms/domain/three-way-merge.ts`).

---

## 3. Patient Flow, Hidden-Answer Pruning & Exact-Once Submission

- **Version Pinning:** Publishing creates an immutable snapshot with its own `/intake/[slug]` URL. Active patient sessions remain pinned to their original `published_version_id` even if administrators later edit the draft or publish v2/v3.
- **Immediate & Server-Authoritative Pruning:** When a parent answer changes (e.g., `Yes → No`), dependent answers are immediately pruned from client state (`pruneHiddenAnswers` in `src/features/patients/domain/visibility.ts`) and stripped on the server during both progress saves (`PUT /api/patient/session/progress`) and final submission (`POST /api/patient/session/submit`). Re-showing the dependent field starts it blank while preserving unrelated answers.
- **Exact-Once Idempotent Submission:** `submitPatientSession` (`src/features/patients/server/submission-service.ts`) locks the session row (`SELECT ... FOR UPDATE`), validates all visible required fields (rejecting whitespace-only text, out-of-range/non-integer numbers, unchecked required checkboxes, and unknown question/option IDs), inserts into `submissions` (`UNIQUE(session_id)`), and marks the session `completed`. Concurrent retries or lost-response replays return the existing submission ID idempotently (`isIdempotentReplay: true`).

---

## 4. Theme Engine, Shuffle Reliability & WCAG AA Contrast Guarantees

### Centralized Tokens & Presets

- Defined in `src/design-system/tokens.css` and `src/features/themes/domain/theme-tokens.ts`, providing 3 named presets (**Ocean**, **Emerald**, **Slate**) with complete **Light** and **Dark** mode token sets.
- Applied consistently across both the **Builder Canvas** (Editor mode and Patient Preview mode via `themeToCssVariables` and `data-patient-theme`) and the **Patient Intake Experience** (`/intake/[slug]`), persisted with the draft in PostgreSQL, and frozen into `published_versions.theme_snapshot` upon publication.

### How Theme Shuffle Remains Reliable (`src/features/themes/domain/shuffle.ts` & `color.ts`)

1. **Continuous 360° Hue Generation:** Rather than cycling fixed presets, `generateShuffledTheme` samples a fresh base hue $H \in [0, 360)$ using golden-ratio angular separation ($\ge 42^\circ$ from the active hue) and enforces a minimum RGB Euclidean distance ($\Delta C_{\text{RGB}} \ge 25$) and normalized palette fingerprint uniqueness so consecutive clicks always yield a visually distinct palette.
2. **Self-Adjusting WCAG 2.1 AA Contrast Solver:**
   - Every generated token pair is verified against the WCAG 2.1 relative luminance contrast formula:
     $$CR = \frac{\max(L_1, L_2) + 0.05}{\min(L_1, L_2) + 0.05}$$
   - `ensureContrast` iteratively adjusts HSL lightness in $1\%$ steps until:
     - Normal text (`textPrimary`, `textSecondary`, `error`, `success`, `primaryActionText`) against `background` and `surface` meets **$\ge 4.5:1$** (targeting $\ge 4.6:1$ safety margin).
     - Large text and interactive focus/border tokens (`primaryAction`, `focusRing`, `borderFocus`) against `surface` meet **$\ge 3.0:1$**.
   - Verified deterministically across **1,000 seeded Shuffle iterations** with zero contrast violations in `tests/unit/themes/theme-tokens.test.ts`.

---

## 5. Security, Encryption Guarantees & Real Patient Data (HIPAA) Readiness

### Current Transport, Database & Logging Guarantees

1. **HTTPS & Edge Security:** Served over HTTPS (TLS 1.3) on Vercel with `HttpOnly; Secure; SameSite=Strict` cookies, `Referrer-Policy: strict-origin-when-cross-origin`, `Cache-Control: private, no-store` on clinical routes, and strict `Origin` vs. `Host` CSRF verification (`verifyRequestOrigin`) on all mutating endpoints.
2. **Encrypted Database Connections:** Server-only PostgreSQL connections (`DATABASE_URL` pooled via Supavisor port 6543, `DATABASE_DIRECT_URL` direct on port 5432) use TLS transport encryption.
3. **Encryption at Rest & Credential Hashing:** Hosted Supabase PostgreSQL encrypts storage volumes, WAL logs, and backups at rest using AWS KMS AES-256 encryption. Session capability tokens and recovery codes are keyed-hashed via `HMAC-SHA256` with `APP_SESSION_PEPPER`, and transient recovery replay payloads are encrypted with `AES-256-GCM`.
4. **Zero PHI in Logs or Error Reports:** Route error handlers (`src/lib/errors/route-handler.ts`) and `audit_events` strip request bodies, answers, and recovery credentials before logging or returning safe error envelopes.

### What Would Change Before Handling Real Patient Data (PHI / HIPAA Note)

Transitioning from synthetic intake data to real Protected Health Information (PHI) under HIPAA requires four targeted upgrades (see [THREAT_MODEL.md](docs/architecture/THREAT_MODEL.md)):

1. **Encryption Choices:** Add application-layer **envelope encryption (`AES-256-GCM`)** for `patient_sessions.answer_json` and `submissions.answer_snapshot` prior to database persistence, binding `(workspace_id, form_id, published_version_id, session_id)` as Additional Authenticated Data (AAD), and using deterministic HMAC blind indexes only for fields requiring server-side search.
2. **Key Management:** Replace the single `APP_SESSION_PEPPER` secret with a FIPS 140-3 HSM/KMS (**AWS KMS** or **GCP Cloud KMS**) using a Customer Master Key (KEK) to wrap per-record or per-tenant Data Encryption Keys (DEKs), automated key rotation, key-version tagging for online re-wrapping, and strict IAM separation between app compute and database operators.
3. **Access Auditing:** Execute formal **Business Associate Agreements (BAAs)** with Vercel and Supabase (Enterprise/HIPAA tiers) and expand `audit_events` to log **every PHI read/view/export** (`submission.viewed`, `submission.listed` with actor ID, submission ID, IP, timestamp, and clinical context) to an immutable, WORM-locked SIEM sink.
4. **Retention & Disposal:** Enforce automated retention schedules—purging abandoned `in_progress` `patient_sessions` immediately after `expires_at` via a scheduled worker, retaining completed submissions for the statutory medical record window (e.g., 6–7 years), and supporting verified right-to-erasure requests via **cryptographic erasure** (destroying the record's wrapped DEK).

---

## 6. 100-Field Responsiveness & Performance Trace

We evaluated the 100-field clinical fixture (`tests/fixtures/100-field-fixture.ts`, 100 questions across 20 sections with 20 conditional dependencies) under Chromium (`390 × 844` mobile viewport with `4× CPU slowdown` and `1440 × 900` desktop viewport; full details in [PERFORMANCE_100_FIELD.md](docs/architecture/PERFORMANCE_100_FIELD.md)):

- **Measured Improvement (`PatientQuestionField` Memoization Stabilization):**
  - _Bottleneck:_ Wrapping `PatientQuestionField` in `React.memo` alone was bypassed when `PatientIntakeView` passed an inline arrow closure `onChange={(val) => handleAnswerChange(q.id, val)}` on every render, causing all 100 question cards to re-render on every keystroke (`64.2 ms` per keystroke under 4× CPU throttling).
  - _Fix:_ Passed the `useCallback`-stabilized `onAnswerChange={handleAnswerChange}` prop directly to `PatientQuestionField` and bound `question.id` inside `PatientQuestionField`.
  - _Result:_ Typing into any field (#1 or #99) re-renders **only that single question card**, reducing keystroke commit latency from **`64.2 ms` to `1.8 ms` (35.6× faster)**—well inside the `16.6 ms` (60 FPS) frame budget—while domain publish validation and conditional pruning across all 100 fields execute in **`< 2 ms`** (`tests/unit/domain/100-field-benchmark.test.ts`).

---

## 7. Local Setup, Verification & Deployment Commands

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

- `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `DATABASE_URL` (Supabase Transaction Pooler, port `6543`)
- `DATABASE_DIRECT_URL` (or `DIRECT_DATABASE_URL` fallback, port `5432`, used by `npm run db:migrate`)
- `APP_SESSION_PEPPER` ($\ge 32$-character random secret for HMAC-SHA256 & AES-256-GCM session crypto)

### Commands

```bash
# Install dependencies
npm install

# Run database migrations (requires DATABASE_DIRECT_URL or DATABASE_URL)
npm run db:migrate

# Start development server
npm run dev

# Quality & verification gates
npm run format:check      # Prettier formatting verification
npm run typecheck         # TypeScript strict check (tsc --noEmit)
npm run lint              # ESLint 9 check
npm run test:unit         # Vitest unit & benchmark suite (28 files, 196 tests)
npm run build             # Next.js 16 production build

# Disposable test database suites (requires IS_TEST_DATABASE=true on an allowlisted test DB)
npm run test:integration  # Real PostgreSQL concurrency, trigger & RBAC integration tests
npm run test:e2e          # Playwright desktop admin & mobile patient E2E suite
```

### Architecture Documentation Index

- [Master Checklist (`CHECKLIST.md`)](CHECKLIST.md)
- [Engineering Progress Log (`docs/PROGRESS.md`)](docs/PROGRESS.md)
- [Deployment & Infrastructure (`docs/DEPLOYMENT.md`)](docs/DEPLOYMENT.md)
- [Architecture Overview (`docs/architecture/README.md`)](docs/architecture/README.md)
- [Architecture Decision Records (`docs/architecture/ADRS.md`)](docs/architecture/ADRS.md)
- [Database Schema & ERD (`docs/architecture/ERD.md`)](docs/architecture/ERD.md)
- [API Contracts (`docs/architecture/API_CONTRACTS.md`)](docs/architecture/API_CONTRACTS.md)
- [Threat Model & HIPAA/PHI Note (`docs/architecture/THREAT_MODEL.md`)](docs/architecture/THREAT_MODEL.md)
- [Defense in Depth (`docs/architecture/DEFENSE_IN_DEPTH.md`)](docs/architecture/DEFENSE_IN_DEPTH.md)
- [Concurrency & Edge Cases (`docs/architecture/EDGE_CASES.md`)](docs/architecture/EDGE_CASES.md)
- [100-Field Performance Report (`docs/architecture/PERFORMANCE_100_FIELD.md`)](docs/architecture/PERFORMANCE_100_FIELD.md)
- [Design System & Tokens (`docs/architecture/DESIGN_SYSTEM.md`)](docs/architecture/DESIGN_SYSTEM.md)
- [Maintenance Boundaries (`docs/architecture/MAINTAINABILITY.md`)](docs/architecture/MAINTAINABILITY.md)
- [Test Plan (`docs/testing/TEST_PLAN.md`)](docs/testing/TEST_PLAN.md)
