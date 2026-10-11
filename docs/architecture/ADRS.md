# Architecture Decision Records (ADRs)

This document tracks all foundational architectural decisions for **Intake Studio**.

---

## ADR-001: Next.js 16 App Router Modular Monolith

### Context

Intake Studio encompasses both private administration (form builder, theme customizer, submission reviewer) and public patient interfaces (form viewer, progress persistence, cross-device resume). We need a cohesive codebase that prevents boundary leakage while eliminating distributed system complexity.

### Decision

Adopt a single Next.js 16 App Router application structured as a **modular monolith** with TypeScript in strict mode, Tailwind CSS for styling, and `@shopify/polaris-icons` for administrative UI.

Route segments enforce domain separation:

- `(admin)/admin/forms`: Authenticated clinical workspaces, draft builder (`/admin/forms/[formId]/edit`), and response explorer (`/admin/forms/[formId]/responses`).
- `(admin)/admin/login`: Private administrative reviewer authentication.
- `intake/[slug]`: Public, mobile-first patient runtime scoped to immutable version slugs.
- `api/...`: Server-only Route Handlers for auth, admin form/draft/publish/responses CRUD, and patient session/progress/resume/submit lifecycle.

### Consequences

- **Pros:** Shared domain logic (validation, condition evaluation, theme contrast math) across server and client without duplication or separate microservice deploy overhead.
- **Cons:** Shared deployment pipeline requires strict build hygiene (`import "server-only"`) and automated CI checks to prevent server-only code from leaking into patient client bundles.
- **Status:** Adopted & Implemented.

---

## ADR-002: Hosted Supabase PostgreSQL & Supabase Auth

### Context

A production-grade system requires reliable relational storage with transactional capabilities, foreign key integrity, row locking, and robust administrative user identity.

### Decision

Use hosted **Supabase PostgreSQL** as the single source of truth and **Supabase Auth** for administrative login. Backend database credentials remain exclusively on the server (via direct/pooled connection strings). No direct browser-to-database connections are permitted.

### Consequences

- **Pros:** Native support for PostgreSQL transactional semantics, `SELECT ... FOR UPDATE`, triggers, and managed authentication.
- **Cons:** Must handle connection pooling when deployed to serverless environments (Vercel) using Supabase's transaction pooler (port 6543 / Supavisor).
- **Status:** Adopted & Implemented.

---

## ADR-003: Server-Side Drizzle ORM with Explicit Application RBAC

### Context

Two primary data access patterns exist in Supabase ecosystems:

1. Direct browser client using Supabase Row-Level Security (RLS) policies.
2. Server-side ORM/Query builder (Drizzle) with application-layer authorization guards.

Mixing these two creates security blind spots and fractured authorization logic.

### Decision

Adopt **server-side Drizzle ORM** with a pooled PostgreSQL client. Database queries execute strictly within Next.js Route Handlers / Server Actions behind an explicit application-layer workspace authorization guard (`requireAdmin`, `requireWorkspaceMembership`, `requireFormWorkspaceAccess`). Browser clients never hold Supabase service-role keys or direct PostgreSQL credentials, and default-deny RLS + revoked `anon`/`authenticated` grants (`0002_enable_rls_and_revoke_grants.sql`) block PostgREST Data API access.

### Consequences

- **Pros:** 100% type-safe SQL, explicit transaction blocks (`db.transaction(...)`), clear audit interception, and zero client-bundle secret exposure.
- **Cons:** Application layer is solely responsible for verifying workspace membership on every request.
- **Status:** Adopted & Implemented.

---

## ADR-004: Defer Redis in Initial Topology

### Context

Modern web architectures frequently introduce Redis for caching, rate limiting, and session locking.

### Decision

**Omit Redis initially.** Rely entirely on PostgreSQL features:

- Optimistic Concurrency Control (CAS) via integer revisions.
- Atomic submission locking via `SELECT ... FOR UPDATE` and unique constraints.
- Transactional idempotency via unique operation IDs.
- Rate limiting for patient recovery via database-backed attempt counters with sliding timestamps.

### Consequences

- **Pros:** Radically lower operational surface area, zero distributed cache invalidation bugs, unified ACID transactions across data and concurrency tokens.
- **Cons:** High-volume DDoS traffic hits PostgreSQL connection pool; acceptable for the assessment scale (100-field forms, demo workloads). Redis can be introduced behind an adapter interface if telemetry demonstrates DB connection saturation.
- **Status:** Adopted & Implemented.

---

## ADR-005: Hybrid Persistence Model (JSONB Draft/Snapshot Aggregate + Relational Core)

### Context

Form structures consist of variable trees of questions, conditional rules, validation constraints, and theme tokens. Fully normalized relational tables (e.g. `questions`, `options`, `conditions`) create heavy multi-table join cascades on every autosave keystroke, while a pure NoSQL approach sacrifices referential integrity for submissions, workspaces, and memberships.

### Decision

Adopt a **hybrid persistence model**:

1. **Relational Spine:** Strongly typed tables for `workspaces`, `admin_memberships`, `forms`, `published_versions`, `patient_sessions`, `submissions`, and `audit_events`.
2. **Document Aggregate:** `definition_json` and `theme_json` stored as structured JSONB within `form_drafts` and frozen into `published_versions.definition_snapshot` and `theme_snapshot`.
3. **Strict Validation:** Zod schemas validate JSONB payloads at the application service boundary before database writes.

### Consequences

- **Pros:** Single-query atomic autosave updates, flexible schema evolution, and zero-cost deep cloning upon publication.
- **Cons:** Querying specific question answers across all historical submissions requires JSONB operators (`->>`) or materialized views for analytics.
- **Status:** Adopted & Implemented.

---

## ADR-006: Workspace-Level Role-Based Access Control (RBAC)

### Context

Multiple administrators may access Intake Studio. Treating simple login authentication as sufficient permission introduces cross-tenant data leaks.

### Decision

Implement explicit workspace-level RBAC:

- **Roles:** `owner` (can manage memberships, archive forms) and `editor` (can create, edit, and publish drafts).
- Every administrative action requires:
  1. Valid server-verified Supabase Auth session (`auth.getClaims()` / `auth.getUser()`).
  2. Active row in `admin_memberships` linking `(user_id, workspace_id)`.
  3. Verification that target `form_id` belongs to `workspace_id`.

### Consequences

- **Pros:** Total isolation between administrative teams; prevents IDOR (Insecure Direct Object Reference) attacks.
- **Cons:** Every database service call must resolve and assert tenant context.
- **Status:** Adopted & Implemented.

---

## ADR-007: Optimistic Concurrency (CAS) with Three-Way Merge & HTTP 409 Conflict Resolution

### Context

Two clinical administrators may have the same form draft open simultaneously. In-place "Last-Write-Wins" (LWW) silently destroys clinical questions, conditions, and copy without warning. Full real-time collaborative editing (Operational Transformation / CRDTs) introduces out-of-scope complexity for a single-draft assessment.

### Decision

Implement **Optimistic Concurrency Control (OCC)** via monotonic integer `revision` tracking and deterministic **Three-Way Merging**:

1. Client fetches draft with `revision: R` (stored as the last server-acknowledged merge base).
2. On autosave, client submits payload with `expectedRevision: R`.
3. Server executes:
   ```sql
   UPDATE form_drafts
   SET definition_json = $1, revision = revision + 1, updated_at = NOW()
   WHERE id = $2 AND revision = $3
   RETURNING revision;
   ```
4. If row count is 0, the write fails with `HTTP 409 Conflict`.
5. The UI displays `ConflictModal` powered by `three-way-merge.ts` (matching questions and options by stable IDs across the acknowledged base, local dirty draft, and latest server draft), auto-merging disjoint edits and allowing explicit resolution of property/choice/delete-vs-modify collisions, Reload Server Version, or Copy Unsaved Changes.

### Consequences

- **Pros:** Zero silent data loss, deterministic 3-way merge recovery, and strict revision integrity under race conditions.
- **Cons:** Requires client-side acknowledged-base tracking and conflict resolution UX.
- **Status:** Adopted & Implemented.

---

## ADR-008: Database-Level Immutability for Published Versions

### Context

Clinical responses must be verifiable against the exact form configuration that was presented to the patient. If an administrator later alters a published version, historical audits and legal compliance are compromised.

### Decision

Guarantee published version immutability directly in PostgreSQL:

1. Attach a database trigger to `published_versions` that raises an exception on any `UPDATE` or `DELETE` statement.
2. Forms cannot be modified post-publish; creating changes generates a new draft and subsequent version (vN+1).
3. Public URLs bind to `public_slug` pointing to this immutable snapshot.

### Consequences

- **Pros:** Absolute data integrity even in the event of administrative application bugs or direct SQL accidents.
- **Cons:** Corrections to typos in published forms require cutting a new release (v2) and pointing incoming patients to the new slug.
- **Status:** Adopted.

---

## ADR-009: Cryptographic Cross-Browser Patient Resumption via High-Entropy Recovery Code

### Context

Patients often start an intake on a mobile phone (e.g. from an SMS or QR code) and wish to resume on a desktop browser.

- Browsers do not share cookies.
- Requiring patient accounts/passwords creates massive drop-off friction.
- Exposing resume capabilities directly in URL query parameters (`/intake?sessionId=123`) creates severe security vulnerabilities: session hijacking via browser history, shoulder surfing, proxy logs, and HTTP Referer leakage.

### Decision

Implement a **dual-credential capability model**:

1. **Same-Device:** `HttpOnly`, `SameSite=Strict`, `Secure` session cookie holding an encrypted capability token.
2. **Cross-Device Recovery:** Upon session initialization, the system generates:
   - A public, non-secret session reference (e.g. `BKS-8F92-K10A`).
   - A high-entropy cryptographic recovery code (e.g. `BK-9X4M-77QP-W2NZ`).
3. The plaintext recovery code is displayed **once** with an explicit "Copy / Save Recovery Code" prompt.
4. The database stores only `HMAC_SHA256(recovery_code, PEPPER)`.
5. Cross-browser resumption requires entering both the reference and the recovery code. Successful verification rate-limits brute force attempts, invalidates the previous recovery code, and issues a fresh session cookie for the new browser.

### Consequences

- **Pros:** Zero patient account creation, no URL secret leakage, cryptographically secure against IDOR and enumeration.
- **Cons:** Patient UX burden: patients must save the code. If lost, uncompleted progress cannot be recovered (a standard privacy-first tradeoff).
- **Status:** Adopted.

---

## ADR-010: Exactly-Once Transactional Submission with Row Locking

### Context

Patients on mobile networks frequently experience intermittent connectivity, leading to repeated "Submit" button taps, or client timeouts after the server has already committed the transaction. Duplicate submissions corrupt clinical analytics and database consistency.

### Decision

Enforce strict exactly-once submission semantics:

1. The `submissions` table enforces `UNIQUE(session_id)`.
2. When a submission request arrives:
   ```sql
   BEGIN;
   SELECT * FROM patient_sessions WHERE id = $1 FOR UPDATE;
   -- If session.status == 'completed', fetch existing submission and return HTTP 200 idempotently.
   -- Otherwise validate answers, sanitize hidden fields, insert into submissions, update session.status = 'completed'.
   COMMIT;
   ```
3. Any subsequent concurrent request waits on the row lock and immediately discovers `status == 'completed'`, returning the identical submission record without re-evaluating or inserting.

### Consequences

- **Pros:** Perfectly idempotent; zero duplicate rows; resilient against network retries and double-clicks.
- **Cons:** Brief row lock duration during submission validation; transaction must remain fast and purely relational.
- **Status:** Adopted.

---

## ADR-011: Strict Layered Testing Strategy (Domain -> DB Integration -> E2E)

### Context

Testing only through UI E2E tests produces flaky, slow feedback loops and misses low-level concurrency races.

### Decision

Establish a three-tier test pyramid:

1. **Unit Tests (Vitest):** Pure domain logic (question validation, whitespace trimming, condition rules, hidden-answer pruning, theme contrast math, 100-field performance simulation).
2. **Integration Tests (Vitest + Real PostgreSQL):** CAS revision collisions, transactional publish serialization, duplicate submit races, and DB immutability triggers.
3. **E2E Tests (Playwright):** Admin authoring lifecycle, keyboard navigation, mobile patient intake, cross-browser resume flow, and network error recovery.

### Consequences

- **Pros:** Fast local feedback (<1s unit tests), rock-solid verification of edge cases and concurrency guarantees.
- **Cons:** Integration tests require a live PostgreSQL container/connection.
- **Status:** Adopted.

---

## ADR-012: Git-Driven Deployment Pipeline with Gated Database Migrations

### Context

Automated deployments from PR branches (Vercel Previews) must never execute destructive or schema-altering migrations against production databases.

### Decision

1. **Vercel Git Integration:** Pushes to `main` auto-deploy to Vercel Production. Pull requests auto-deploy to ephemeral Vercel Previews.
2. **Environment Isolation:** Vercel Previews bind to a dedicated preview database or mock environment, never production.
3. **Controlled Migrations:** Database migrations are versioned via SQL scripts in `db/migrations/` and managed through Drizzle Kit. Production migrations run exclusively in a dedicated, gated GitHub Actions workflow step prior to production promotion.

### Consequences

- **Pros:** Eliminates preview-induced data corruption; provides full rollback and audit trails.
- **Cons:** Requires maintaining migration discipline: all migrations must be forward-compatible.
- **Status:** Adopted.
