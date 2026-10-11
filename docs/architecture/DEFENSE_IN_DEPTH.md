# Defense in depth

## Identity and workspace authorization

`src/lib/supabase/server.ts` verifies administrators with `auth.getClaims()` and falls back to `auth.getUser()`. Protected pages/Route Handlers call `requireAdmin`; form/workspace services require active membership and resolve the resource's workspace. Owners and editors can author, publish, and read responses; only owners can delete unpublished forms or archive forms. There is no membership-management or audit-log browsing UI/API.

The proxy refreshes Supabase sessions best-effort. Protected operations verify identity separately. Supabase Auth cookies use the SDK-provided options; do not attribute the patient cookie flags to all Auth cookies. Test identity overrides are opt-in, secret-signed, disposable-target guarded, and excluded on Vercel. They were not enabled for database inspection.

Authenticated users with no active membership receive a new owner workspace on workspace lookup, including after all their memberships are revoked. Restrict Supabase signup/provisioning externally for the reviewer deployment; application login alone is not an invitation allowlist.

## PostgreSQL privileges, RLS, and grants

Drizzle uses `DATABASE_URL` on the server. The client has `prepare: false`, a small per-process pool, and timeouts; direct/session pooling is available for migration work. The configured SQL username determines privileges, not Supabase Auth identity. No configured service-role API key or service-role Auth management flow exists in the application.

Read-only catalog inspection on October 11, 2026 targeted the project named in `APPROVED_TEST_PROJECT_REFS`, identified from both connection URLs and the matching public Supabase host. This is the repository-designated disposable project, not independently established as the Vercel production target.

| Metadata                   | Observed on inspected target                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Tables                     | Nine application tables plus `_schema_migrations`                                                                       |
| RLS                        | Enabled on all ten; FORCE RLS false; no policies                                                                        |
| Ownership/current SQL user | `postgres` owns all ten tables; inspection used `postgres`                                                              |
| Role flags                 | `postgres` is not a superuser but has BYPASSRLS; `service_role` also has BYPASSRLS; `anon`/`authenticated` have neither |
| Table grants               | Visible grants belong to `postgres` and `service_role`, including TRUNCATE; none to `anon`, `authenticated`, or PUBLIC  |
| Immutability               | Enabled row triggers reject UPDATE/DELETE on `published_versions` and `submissions`                                     |
| Migration ledger           | `0001_initial_schema.sql` and `0002_enable_rls_and_revoke_grants.sql`; both SHA-256 checksums match repository files    |

**Privileged Drizzle access bypasses RLS.** Service authorization is the primary administrative boundary. Migration 0002 revokes browser-role table, sequence, and routine grants existing at migration time; it does not change default privileges for future objects. This audit inspected table grants, not every sequence/routine ACL or inherited privilege path. Least-privilege runtime roles remain a follow-up. Row triggers do not prevent privileged TRUNCATE or trigger disabling.

## Patient capability and recovery

`patient-cookies.ts` names cookies by sanitized public slug and stores `sessionId:capabilityToken`. Cookies are HttpOnly, SameSite=Strict, path `/`, with a 30-day lifetime. Secure is set when runtime/app/Vercel configuration is production. Cookie names isolate forms/versions; path `/` is not a narrow path restriction. The random token is not encrypted in the cookie; PostgreSQL stores its HMAC-SHA256 digest.

A reference alone grants no session access. Recovery requires the reference and a user-held `BK-XXXX-XXXX-XXXX-XXXX` code, verified with HMAC and constant-time comparison. Sessions expire after 30 days, recovery codes after seven days. Five failed attempts for a known session cause a 15-minute cooldown. Failed attempts commit before the generic rejection is raised. Successful resume row-locks the session and rotates both code and capability, invalidating old browser access. Completed sessions cannot resume through recovery.

The service stores an AES-256-GCM encrypted replacement-credential payload using a pepper-derived key, plus previous recovery metadata. It does not decrypt/reuse that payload on retry. A lost successful resume response may leave the user without the new credentials. The source does not implement the previously documented 60-second replay guarantee. Recovery cooldown does not protect login, unknown-reference flooding, session creation, or all public writes.

## Origin protection and HTTP privacy

Every current mutation Route Handler calls `verifyRequestOrigin`. It compares `Origin` host (including port) to `Host`, rejecting malformed/mismatched supplied origins. Missing Origin is accepted for server/test callers; scheme is not compared. This is not a strict requirement that every mutation carry Origin, and no separate CSRF token is issued.

Request JSON is parsed against contracts; protected resources are resolved on the server. Patient progress checks revision, active status, and credential hash at the write; final submission validates against the pinned version. Error serialization returns safe envelopes rather than raw unexpected exceptions.

Patient session GET responses explicitly use `Cache-Control: private, no-store`. Equivalent explicit headers are not established across every admin/session success and error response. Review deployed caching and proxy/log behavior before treating sensitive response handling as complete.

## Sensitive data and transport limits

Database credentials and `APP_SESSION_PEPPER` remain server-only; browsers receive only public Supabase configuration. Do not record patient answers, credentials, or recovery secrets in URLs, logs, analytics, documentation, or commits. Answer JSONB is not application-level field-encrypted. Audit events cover administrative lifecycle metadata, not all response reads; form names in metadata must also remain non-sensitive.

The application does not force PostgreSQL TLS. Inspected URLs have no `sslmode` option. `pg_stat_ssl` reported `ssl=false` for the observed pooler-to-database backend leg; that does not reveal client-to-pooler encryption. Transport verification is incomplete, and production settings were not inspected. Provider-managed storage encryption and HTTPS configuration also require provider/owner evidence; they are not proven by repository source.

Use synthetic data. Real patient use requires provider agreements, least-privilege roles, encryption/key management, retention/deletion, response-access auditing, abuse controls, monitoring, and incident/recovery review. See [deployment verification](../DEPLOYMENT.md) and [test evidence](../testing/TEST_PLAN.md).
