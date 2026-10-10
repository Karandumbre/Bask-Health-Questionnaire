# Intake Studio — Engineering Progress Log

## Phase 1: Architecture, Database, Security & Engineering Contracts

**Date:** 2026-10-10  
**Status:** Architecture and Domain Foundation Complete & Verified (35/35 Unit Tests Passing, Zero Type Errors)  
**Lead:** Staff Full-Stack Architect  

---

### 1. Changes Implemented

#### A. Architecture Documentation (`docs/architecture/`)
- `docs/architecture/README.md`: High-level architectural blueprint, trust boundaries, system principles, and document index.
- `docs/architecture/ADRS.md`: Complete Architectural Decision Records (ADR-001 through ADR-012) covering modular monolith, Supabase PostgreSQL, Drizzle server-only data access, omission of Redis, hybrid JSONB persistence, workspace RBAC, CAS optimistic concurrency, DB immutability triggers, cryptographic patient recovery codes, transactional exact-once submission, test pyramid, and gated CI/CD migrations.
- `docs/architecture/ERD.md`: Full Mermaid Entity-Relationship Diagram, table definitions, relational constraints, `ON DELETE RESTRICT` historical retention policies, index designs, and PostgreSQL trigger DDL.
- `docs/architecture/API_CONTRACTS.md`: Comprehensive HTTP contract specifications, CAS protocol headers, and standardized safe error code envelopes (`REVISION_CONFLICT`, `INVALID_FORM`, `INVALID_ANSWER`, `SESSION_UNAUTHORIZED`, `SESSION_COMPLETED`, `PUBLISH_CONFLICT`, `RESUME_RATE_LIMITED`).
- `docs/architecture/THREAT_MODEL.md`: STRIDE security assessment, trust boundary mapping, IDOR defense, HMAC-SHA256 recovery code hashing with timing-safe comparison, and zero PHI in URLs/application logs.
- `docs/architecture/EDGE_CASES.md`: Detailed failure-mode analysis for admin editing races, out-of-order network responses, publish transaction conflicts, parent-child reordering, dynamic visibility answer pruning, and double-click submission races.

#### B. Database Design & Migrations (`db/` & `src/lib/db/`)
- `src/lib/db/schema.ts`: Production Drizzle ORM schema with strict relations and types for `workspaces`, `admin_memberships`, `forms`, `form_drafts`, `published_versions`, `publication_operations`, `patient_sessions`, `submissions`, and `audit_events`.
- `db/migrations/0001_initial_schema.sql`: Executable PostgreSQL migration with foreign keys, unique constraints, performance indexes, and database triggers forbidding `UPDATE` and `DELETE` on `published_versions` and `submissions`.
- `drizzle.config.ts`: Configuration for migration generation and execution.

#### C. Domain Contracts & Pure Logic (`src/features/` & `src/lib/`)
- `src/lib/errors/index.ts`: Strongly typed error catalog and safe `AppError` envelope.
- `src/features/forms/domain/types.ts`: Discriminated union of Question types (`short_text`, `long_text`, `number`, `single_select`, `multi_select`, `checkbox`), stable IDs, validation schemas, and theme token structures.
- `src/features/forms/domain/validation.ts`: Pure publish validator enforcing non-blank labels, choice invariants ($\ge 2$ choices, unique labels), numeric bounds, and condition integrity (earlier, required, unconditional single-select parent).
- `src/features/patients/domain/types.ts`: Canonical answer schemas and session request payloads.
- `src/features/patients/domain/visibility.ts`: Pure visibility evaluation and immediate pruning of newly hidden answers when parents change.
- `src/features/patients/domain/validation.ts`: Server-authoritative progress and final submission validators enforcing whitespace trimming, number bounds, checkbox checks, and stripping hidden or unknown fields.
- `src/lib/security/credentials.ts`: Cryptographic session reference and recovery code generation, Crockford base-32 encoding, normalization, HMAC-SHA256 hashing, and `timingSafeEqual` verification.

#### D. Testing Suite & Performance Fixtures (`tests/` & `docs/testing/`)
- `vitest.config.ts`: Unit test runner configuration with path alias support.
- `tests/fixtures/100-field-fixture.ts`: 100-field clinical form fixture generator with realistic multi-section conditional dependencies.
- `tests/unit/domain/form-validation.test.ts`: 12 test cases covering publish rules and broken condition detection.
- `tests/unit/domain/patient-visibility.test.ts`: 5 test cases covering visibility rules, parent toggling, and non-resurrection of hidden answers.
- `tests/unit/domain/patient-validation.test.ts`: 9 test cases covering whitespace trimming, numeric bounds, choice memberships, and malicious payload sanitization.
- `tests/unit/security/credentials.test.ts`: 6 test cases verifying recovery code entropy, normalization, hashing, and constant-time verification.
- `tests/unit/domain/100-field-benchmark.test.ts`: 3 test cases benchmarking 100-field publish validation and runtime pruning latency ($< 5\text{ms}$).
- `docs/testing/TEST_PLAN.md`: Full test plan for unit, database integration, and Playwright E2E suites.

#### E. CI/CD & Deployment Architecture
- `.env.example`: Safe configuration template with variable names and zero committed secrets.
- `.github/workflows/ci.yml`: Automated quality gate with typechecking, linting, and Vitest suite execution.
- `docs/DEPLOYMENT.md`: Vercel hosting setup, preview vs production isolation, and gated migration procedures.

---

### 2. Tests Executed & Actual Results

| Test Suite / Command | Execution Scope | Result | Details |
|---|---|---|---|
| `npx tsc --noEmit` | Entire project (`tsconfig.json` strict) | **DONE (PASS, Exit 0)** | 0 errors. Strict TypeScript enabled, zero `any`, zero `@ts-ignore`, strict null checks. |
| `npm run lint` | ESLint 9 (`eslint.config.mjs`) | **DONE (PASS, Exit 0)** | 0 errors, 0 warnings. Next.js 16 flat config cleanly configured. |
| `npm test` (Vitest) | 5 test files, 35 unit & benchmark tests | **DONE (PASS, Exit 0)** | **35 passed / 0 failed** in 0.89s. |
| `npm run build` | Next.js 16.4.0 (Turbopack) | **DONE (PASS, Exit 0)** | Production build compiled cleanly in 2.9s; static pages generated. |
| 100-Field Benchmark | 100 clinical questions | **DONE (PASS)** | Publish rules passed; visibility & pruning executed in $< 5\text{ms}$. |
| Database Migration Execution | `db/migrations/0001_initial_schema.sql` | **PENDING** | SQL DDL authored and reviewed; awaiting live Supabase PostgreSQL connection. |
| Database Concurrency Tests | PostgreSQL row locks & CAS | **PENDING** | Integration test suite designed in `docs/testing/TEST_PLAN.md`; awaits database instance. |
| Playwright E2E | Desktop admin & mobile patient flows | **PENDING** | Test scenarios fully designed in `docs/testing/TEST_PLAN.md`; awaits UI implementation. |

---

### 3. Decisions & Tradeoffs

1. **Drizzle ORM vs Supabase Browser Client:**
   - *Decision:* Drizzle on server only; zero direct browser database access.
   - *Tradeoff:* Requires server-side Route Handlers for all operations, but guarantees airtight workspace authorization and prevents secret leakage.
2. **Patient Cross-Browser Resume Flow:**
   - *Decision:* High-entropy one-time recovery code (`BK-XXXX-XXXX-XXXX-XXXX`) issued on creation and verified with rate limiting.
   - *Tradeoff:* Minor patient friction (must save the code), but provides complete privacy without requiring email accounts or leaking tokens in URLs.
3. **Draft Storage Strategy:**
   - *Decision:* Single active draft JSONB aggregate per form with monotonic revision counter.
   - *Tradeoff:* Extremely fast atomic autosaves and single-transaction publications, with schema validation enforced at application boundary.

---

## Phase 1B: Supabase Integration, Security & Database Verification

**Date:** 2026-10-10  
**Status:** Complete & Fully Verified (49/49 Passing Tests: 35 Unit + 14 Real PostgreSQL Integration Tests, Clean Next.js 16 Production Build)  
**Lead:** Staff Full-Stack Architect  

---

### 1. Changes Implemented in Phase 1B

#### A. PostgreSQL & Supabase Integration (`src/lib/db/`, `src/lib/supabase/`, `src/proxy.ts`)
- `src/lib/db/index.ts`: Server-only pooled PostgreSQL connection using `postgres.js` and Drizzle ORM. Configured with `prepare: false` for compatibility with Supabase transaction pooler (port 6543), connection reuse singleton, and direct client connection helper (`getDirectClient`).
- `src/lib/db/migrate.ts` & `scripts/migrate.mjs`: Programmatic and CLI migration runners tracking applied SQL scripts in `_schema_migrations` table; verified applied on live Supabase instance (`vjstbqhzfnwrkksgavfv`).
- `src/lib/supabase/client.ts`: Browser Supabase client via `@supabase/ssr` `createBrowserClient`.
- `src/lib/supabase/server.ts`: Server Supabase client via `@supabase/ssr` `createServerClient` using `next/headers` `cookies()`. Implements `getServerVerifiedUser()` utilizing `auth.getClaims()` first and server-verified `auth.getUser()` fallback; rejects unverified `auth.getSession()`.
- `src/lib/supabase/proxy.ts`: Session refresher for Next.js edge requests.
- `src/proxy.ts`: Next.js 16 network boundary proxy replacing legacy `middleware.ts`.

#### B. Administrative Authentication, RBAC & Security (`src/lib/auth/`, `docs/architecture/`)
- `src/lib/auth/admin.ts`: Application authorization guards: `requireAdmin()`, `requireWorkspaceMembership(userId, workspaceId, role)`, `requireFormWorkspaceAccess(formId, userId, role)`, and `requireAdminWorkspaceAccess()`.
- `src/lib/security/credentials.ts`: Enhanced with capability token generation, HMAC-SHA256 hashing, and constant-time verification.
- `docs/architecture/DEFENSE_IN_DEPTH.md`: Detailed documentation of the 6-layer defense-in-depth model, PostgreSQL roles (`postgres`, `service_role`, `authenticated`, `anon`), grants, and application-layer tenant isolation.

#### C. Database Operations & Concurrency Services (`src/features/`)
- `src/features/forms/server/draft-service.ts`: Administrative lifecycle service implementing draft creation, listing, retrieval, renaming, archiving, deletion of unpublished forms, and Compare-and-Swap (CAS) autosaving with HTTP 409 `REVISION_CONFLICT` on expectedRevision mismatch.
- `src/features/forms/server/publish-service.ts`: Transactional publication service with `SELECT ... FOR UPDATE` row locks, monotonic version progression, operation ID idempotency (`publication_operations`), form/theme snapshots, and advancing draft revision.
- `src/features/patients/server/session-service.ts`: Patient session service with capability token cookies, high-entropy recovery code generation, sliding 15-minute rate limiting, constant-time verification, atomic recovery code rotation inside transactional row locks, and server-side hidden-answer pruning.
- `src/features/patients/server/submission-service.ts`: Transactional exactly-once submission service with `SELECT ... FOR UPDATE` row locks on session, `UNIQUE(session_id)` constraint enforcement, idempotent replay handling, and complete server validation.

#### D. Live PostgreSQL Concurrency & Security Integration Tests (`tests/integration/`)
- `tests/integration/postgres-integration.test.ts`: 14 comprehensive integration tests executing against hosted Supabase PostgreSQL verifying:
  1. Concurrent admin draft updates (CAS win/lose)
  2. Stale `expectedRevision` rejection (HTTP 409)
  3. Concurrent publishing serialization via row locks
  4. Publication idempotency via operation IDs
  5. Published version immutability via database triggers (`trg_protect_published_versions`)
  6. Historical snapshot preservation across draft edits
  7. Unauthorized workspace access rejection (HTTP 403)
  8. Unauthorized patient session access rejection (HTTP 401)
  9. Concurrent recovery-code redemption with atomic rotation
  10. Server-side hidden-answer pruning
  11. Concurrent duplicate submissions serialization via row locks
  12. Submission retry after successful commit (idempotent replay)
  13. Form archival preserving historical responses
  14. Invalid or unknown answer rejection (HTTP 422)

#### E. CI/CD & Gated Migrations (`.github/workflows/`)
- `.github/workflows/ci.yml`: Added ESLint step, separated unit tests (`npm run test:unit`) and gated integration tests (`npm run test:integration`), and build verification.
- `.github/workflows/db-migrate.yml`: Dedicated GitHub Actions workflow dispatch for controlled, gated database migrations to ensure migrations never execute automatically during Vercel builds.

---

### 2. Tests Executed & Actual Results

| Test Suite / Command | Execution Scope | Result | Details |
|---|---|---|---|
| `npx tsc --noEmit` | Entire project (`tsconfig.json` strict) | **DONE (PASS, Exit 0)** | 0 errors. Strict TypeScript, zero `any`, zero `@ts-ignore`. |
| `npm run lint` | ESLint 9 (`eslint.config.mjs`) | **DONE (PASS, Exit 0)** | 0 errors, 0 warnings. Next.js 16 flat config cleanly validated. |
| `npm run test:unit` | 5 test files, 35 unit & benchmark tests | **DONE (PASS, Exit 0)** | **35 passed / 0 failed** in 0.54s (offline). |
| `npm run test:integration` | Real Supabase PostgreSQL database | **DONE (PASS, Exit 0)** | **14 passed / 0 failed** in 85.7s against hosted Supabase instance. |
| `npm test` | All 6 test files, 49 total tests | **DONE (PASS, Exit 0)** | **49 passed / 0 failed**. |
| `npm run build` | Next.js 16.4.0 (Turbopack) | **DONE (PASS, Exit 0)** | Production build compiled cleanly in 723ms; static pages and `Proxy (Middleware)` generated. |
| Initial Migration Execution | `scripts/migrate.mjs` | **DONE (PASS, Exit 0)** | All 9 tables, indexes, and triggers applied and recorded in `_schema_migrations`. |

---

### 3. Decisions & Tradeoffs

1. **Next.js 16 `proxy.ts` vs `middleware.ts`:**
   - *Decision:* Standardized on Next.js 16 `src/proxy.ts` with `updateSession()` helper for session cookie refresh.
   - *Tradeoff:* Adheres to latest Next.js 16 conventions while preserving Edge compatibility.
2. **Asymmetric Claims Verification vs Session Cookie Trust:**
   - *Decision:* Implemented `getServerVerifiedUser()` prioritizing `auth.getClaims()` and `auth.getUser()`, strictly refusing to trust unverified `auth.getSession()`.
   - *Tradeoff:* Eliminates cookie tampering risks and ensures administrative user status is verified.
3. **Session Pooler (Port 5432) vs Transaction Pooler (Port 6543):**
   - *Decision:* Used port 6543 (`prepare: false`) for general application queries; used session pooler (port 5432) for DDL migrations and direct admin tasks.
   - *Tradeoff:* Solves IPv6-only DNS limitations of `db.<project>.supabase.co` on IPv4 networks while respecting PgBouncer transaction mode constraints.
4. **Atomic Recovery Code Rotation in Transaction:**
   - *Decision:* Wrapped `resumePatientSession` inside a database transaction with `SELECT ... FOR UPDATE`.
   - *Tradeoff:* Serializes concurrent redemption attempts and guarantees that stolen or duplicate recovery codes cannot redeem the session twice.

---

### 4. Blockers & Outstanding Questions

1. **Private GitHub Repository Confirmation:** Awaiting user preference on exact repository naming (e.g. `FirstNameBaskHealth`).
2. **Vercel Project Linking:** Ready for deployment configuration when credentials/approval are provided.

---

### 5. Next Actions (Phase 2)

1. Review Phase 1B results with user.
2. Build Phase 2 Administrative UI: Draft management, form builder with Polaris icons, field navigator, and debounced autosave.
3. Implement revision conflict resolution modal (HTTP 409 handler).


