# Deployment

## Confirmed status and evidence limits

The project owner confirms that the application is deployed on Vercel and the hosted application works. This audit did not deploy, modify hosting settings, or independently exercise authenticated/patient flows. A read-only HTTPS GET of the supplied root URL returned HTTP 200.

| Item                                                    | Status / evidence                                                                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| GitHub/Vercel deployment                                | DONE — owner-confirmed                                                                                                    |
| Hosted functionality                                    | DONE — owner-confirmed; independent hosted automation remains PENDING                                                     |
| Application URL                                         | [karan-bask-health.vercel.app](https://karan-bask-health.vercel.app) — public HTTPS GET 200                               |
| Published intake URL                                    | `[add verified /intake/[slug] URL]`                                                                                       |
| Repository                                              | Git remote points to `https://github.com/Karandumbre/KaranBaskHealth.git`; privacy/invitations require owner confirmation |
| Vercel Git linkage, branch mappings, environment scopes | External settings not observable from tracked configuration                                                               |
| Production database/Auth target and preview separation  | Owner-marked complete in the checklist; not independently verified                                                        |

No tracked Vercel-specific configuration was found. The Next.js build script is `next build --webpack`; database migrations are separate. GitHub-to-Vercel linkage cannot be inferred from a Git remote or GitHub Actions file alone.

## Application environment and Auth setup

Set these independently for production and preview deployments:

| Variable                               | Purpose                                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Auth project URL, compiled into browser configuration                                                                 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public publishable key                                                                                                |
| `DATABASE_URL`                         | Server-side application connection; transaction pooler is supported through `prepare: false`                          |
| `DATABASE_DIRECT_URL`                  | Direct/session-pooler migration connection; falls back to `DATABASE_URL`                                              |
| `APP_SESSION_PEPPER`                   | Independent high-entropy secret, at least 32 characters, for patient credential hashing and replay-payload encryption |
| `APP_ENV`                              | Optional runtime classification; use `production` for production                                                      |

Vercel/Node supply runtime identifiers. Keep `ENABLE_TEST_AUTH`, `TEST_AUTH_SECRET`, and `IS_TEST_DATABASE` out of hosted configuration. Use separate production, preview, and disposable test targets; preview isolation is required but not verified here. Public Supabase values are build-time inputs, so verify them for each build/environment.

Provision confirmed reviewer email/password accounts through Supabase Auth and share credentials privately. There is no signup or password-reset UI. Restrict public signups as appropriate because any verified user with no active membership receives an owner workspace on initial workspace lookup. Check Supabase Site URL and permitted redirects for the intended deployment; the implemented login uses password authentication, not an OAuth callback route. Hosted Auth settings were not accessible in this audit.

## PostgreSQL modes and migrations

`src/lib/db/index.ts` uses the application URL with prepared statements disabled, max 10 connections per production process (3 otherwise), and idle/connect/lifetime limits. A session/direct client uses one connection. Serverless instance count can multiply those pools; no capacity measurement is claimed.

`npm run db:migrate` calls the shared engine in `scripts/lib/migration-engine.mjs`, which uses a session-level advisory lock and SHA-256 migration checksums. Migrations do not run in `npm run build`.

For a future authorized schema change: inspect generated SQL, verify the intended target and backup/recovery plan, validate safely in development/disposable storage, then run the [manual workflow](../.github/workflows/db-migrate.yml) for `preview` or `production` with `APPLY`. It reads `DATABASE_DIRECT_URL`/`DATABASE_URL` from the selected GitHub environment. Configure environment approval rules externally; the YAML selects an environment but does not prove approvals are enforced. Coordinate schema/application compatibility; no automatic rollback is implemented.

The audit performed no migrations. Read-only metadata on the repository-designated disposable project found both SQL versions applied with matching checksums, RLS enabled, browser-role table grants absent, and both UPDATE/DELETE immutability triggers enabled. Production migration state is unknown. See the [ERD](architecture/ERD.md).

## HTTPS, cookies, and transport

Use HTTPS for the application and published intake. Patient capability cookies are HttpOnly/SameSite=Strict and Secure when production configuration is detected. Supabase Auth cookie options come from the SDK, so inspect them separately. Verify cross-origin rejection, cache headers, and safe failure responses on the deployed origin.

The application does not explicitly force database TLS; the inspected local connection URLs have no `sslmode` option. `pg_stat_ssl` reported no TLS on the pooler-to-database leg. This does not reveal client-to-pooler encryption or production transport settings. Confirm TLS/verification settings for the actual deployed connections and provider storage-encryption guarantees externally. Keep transport and encryption-at-rest verification open until evidence is supplied.

## CI and hosted verification still required

[CI](../.github/workflows/ci.yml) runs Node 22 lint/types/unit/build checks, with integration conditional on disposable database secrets. Its build uses placeholder configuration. Browser E2E runs separately and must not target the reviewer deployment; see the [test plan](testing/TEST_PLAN.md).

Record independent evidence for:

- Verified HTTPS application and public intake URLs, Git linkage/branch settings, repository privacy, and reviewer invitations.
- Real reviewer login, anonymous rejection, owner/editor restrictions, and cross-workspace response isolation.
- Published intake start/save/cross-browser resume/submit and historical response review using synthetic data.
- Cookies, test-auth exclusion, Origin behavior, sensitive caching/logs, runtime SQL privileges, TLS, and production/preview/test project separation.
- Applied production migrations and backup/recovery procedures.

Retain the owner's working-deployment confirmation separately from these unexecuted checks. No deployment or hosted configuration changes were made by this audit.
