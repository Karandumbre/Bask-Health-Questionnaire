# Architecture decision records

These decisions describe the current source. Implementation does not certify hosted settings or clinical compliance. Audit evidence is recorded in the [test plan](../testing/TEST_PLAN.md) and [database model](ERD.md).

## ADR-001: One Next.js App Router application

**Decision:** Keep admin pages, patient pages, and Route Handlers in one Next.js 16 application with strict TypeScript, React 19, Tailwind v4, and Polaris icons. Separate domain, server, client, and React behavior within features.

**Reason and tradeoff:** Shared validation and theme rules reduce duplication and deployment overhead. Server-only imports and explicit authorization are necessary; route groups alone do not secure data.

## ADR-002: Supabase PostgreSQL and Auth

**Decision:** Use Supabase Auth for email/password administrator login and PostgreSQL for application persistence. Verify identity through `getClaims()` with `getUser()` fallback, rather than trusting `getSession()` alone.

**Reason and tradeoff:** Managed identity and relational transactions fit the assessment. Auth project configuration and reviewer provisioning remain external setup tasks. A first authenticated workspace lookup provisions an owner workspace when no active memberships exist; public signup policy therefore matters.

## ADR-003: Server-side Drizzle and explicit authorization

**Decision:** Access application data through server-only Drizzle services. Check active workspace membership and form ownership, with owner-only deletion/archival. The PostgreSQL client disables prepared statements for transaction pooling.

**Reason and tradeoff:** Transactions and SQL constraints are explicit. The inspected database role owns tables and has `BYPASSRLS`; RLS and revoked browser-role grants do not authorize this connection. A narrower server role is follow-up work. No Supabase service-role API key is required by current application configuration.

## ADR-004: PostgreSQL coordination without Redis

**Decision:** Use revisions, row/advisory locks, operation IDs, and database recovery-attempt counters. No Redis dependency exists.

**Reason and tradeoff:** One persistence system keeps coordination simple. Recovery cooldown is per known session, not a general login or public-endpoint abuse-control system. Load capacity has not been measured.

## ADR-005: JSONB aggregates with relational identities

**Decision:** Store draft definitions/themes and published/answer snapshots as JSONB. Keep workspace, form, version, session, and submission identities relational.

**Reason and tradeoff:** Aggregate saves and publication are atomic without question-table joins. Zod and domain validation enforce JSON structure and stable question/option IDs. PostgreSQL foreign keys do not validate IDs inside JSONB; cross-response analytics would require additional queries or indexing.

## ADR-006: Workspace owner/editor roles

**Decision:** Owners and editors create/edit/publish forms and read responses; owners additionally delete unpublished forms or archive forms. Revoked memberships are excluded. Identity comes from server verification, not request-supplied user IDs.

**Reason and tradeoff:** Form-level access follows a simple workspace boundary. Member invitation, role-management, and audit-log browsing UI/API are not implemented. Revocation racing an already-authorized transaction is not independently verified.

## ADR-007: Revision-aware saves and explicit reconciliation

**Decision:** Draft saves and renames require an expected revision. Autosave serializes saves and associates acknowledgments with the submitted snapshot and confirmed revision. A three-way merge compares the last acknowledged base, local edits, and current server state by stable IDs. Property, option, ordering, and delete-versus-modify conflicts require resolution.

**Reason and tradeoff:** Disjoint edits can be retained without silent overwrites. Conflicts halt automatic saves; the modal offers reconciliation, server reload, copying local edits, or explicit overwrite against a refreshed server revision. Unsaved memory is not durable across closing/reloading the page.

## ADR-008: Immutable publication snapshots

**Decision:** Publish locks the form then draft, checks the revision, validates the definition, and writes a snapshot, publication operation, version counter, advanced draft revision, and audit event transactionally. Public slugs identify a version. SQL row triggers reject snapshot UPDATE/DELETE.

**Reason and tradeoff:** Existing patient sessions and historical labels remain stable. The same draft remains editable after publication; later publication produces another snapshot. Published forms are archived rather than hard-deleted. Row triggers do not prevent privileged TRUNCATE or disabling triggers.

## ADR-009: Capability cookies and recovery codes

**Decision:** A per-slug HttpOnly, SameSite=Strict cookie holds `sessionId:capabilityToken`; Secure is enabled in production configurations. Tokens are random and HMAC-SHA256 hashed using the application pepper. A public session reference plus a user-held `BK-XXXX-XXXX-XXXX-XXXX` code enables cross-browser resume. Sessions last 30 days; recovery codes expire after seven days and rotate on successful resume. Five failed attempts cause a bounded 15-minute cooldown.

**Reason and tradeoff:** Patients need no account and secrets stay out of URLs. Rotation invalidates the previous browser capability. The cookie value is not application-encrypted. Resume stores previous-hash/rotation metadata and an AES-256-GCM replacement-credential payload, but does not consume them for replay: losing a successful rotation response can strand access. No implemented 60-second recovery replay window should be claimed.

## ADR-010: One immutable submission per session

**Decision:** Final submission locks the session, verifies capability/expiry, validates visible answers against its version, prunes hidden data, inserts the submission, and marks the session completed atomically. `UNIQUE(session_id)` prevents a second response. A completed-session retry returns the existing submission.

**Reason and tradeoff:** Parallel clicks and lost-success retries converge without changing the original answer snapshot. Replay still requires a valid, unexpired capability; it is not indefinite access. Completed-session progress writes are rejected.

## ADR-011: Layered test coverage

**Decision:** Use Vitest for domain, service/HTTP mocks, and real PostgreSQL suites; use Playwright for Chromium browser journeys. Synthetic fixtures include a 100-field form. Database writes require the existing disposable-target guard.

**Reason and tradeoff:** Fast isolated checks complement transactional and browser behavior tests. Mocked tests cannot establish live database or browser behavior, and a timed domain benchmark cannot establish UI performance. Current audit execution and limitations are in the test plan.

## ADR-012: Deployment separated from migrations

**Decision:** Vercel hosts the application. Repository CI runs lint, types, unit tests, conditional database integration, and build. SQL migration wrappers use the shared engine with advisory locking and checksums. A manual GitHub workflow selects preview/production and requires `APPLY`; build does not apply migrations.

**Reason and tradeoff:** Schema writes stay outside routine application builds. GitHub environment approval rules, Vercel Git linkage, branch mappings, environment separation, and successful hosted workflows require external confirmation. The owner confirms deployment and hosted functionality; no automatic rollback or exclusive migration channel is established by source.
