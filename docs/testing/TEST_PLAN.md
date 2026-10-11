# Test plan and audit evidence

## Commands and executed results

Run from the repository root with Node 22 (CI target) and npm. `npm test` runs all Vitest tests, including database integration; use `test:unit` for non-destructive isolated checks.

| Command                    | October 11, 2026 audit result                                               |
| -------------------------- | --------------------------------------------------------------------------- |
| `npm run typecheck`        | Passed                                                                      |
| `npm run lint`             | Passed                                                                      |
| `npm run test:unit`        | Passed: 35 files, 282 tests                                                 |
| `npm run build`            | Passed; Next.js webpack production build                                    |
| `npm run test:integration` | Not run; audit restricted database access to read-only metadata             |
| `npm run test:e2e`         | Not run; no browser/backend mutations performed in this documentation audit |

Executed checks used Node 24.14.1; this audit did not repeat them under CI's Node 22. No historical test counts are presented as current results. A read-only HTTPS GET of `https://karan-bask-health.vercel.app/` returned HTTP 200; no authenticated or patient flow was executed. Hosted functionality is owner-confirmed, separate from these checks. Read-only PostgreSQL findings are in the [ERD](../architecture/ERD.md).

## Existing coverage

Vitest uses a Node environment, `tests/setup.ts` loads local environment files, and the `server-only` import is aliased for testing. The unit suite includes domain, mocked service/HTTP, and rendered-markup checks; it does not establish browser focus or live persistence.

- Form and patient validation, earlier-parent conditions, hidden-answer pruning, stable question IDs, and publish gates.
- Serialized draft saves, edits during in-flight requests, late acknowledgments, ambiguous/network failure, explicit retry, and unsaved state.
- Three-way merges, disjoint edits, property/choice/delete-versus-modify conflicts, and acknowledged-base tracking.
- Theme contrast/Shuffle samples, design-token contracts, shared UI markup, preview controls, and loading states.
- Workspace access helpers, credential hashing, origin rejection, test-auth safeguards, safe API errors, response pagination/cache invalidation, session policies, and completion recovery.
- A 100-field fixture benchmark asserting visibility and hidden-answer pruning each take under 10ms in the test process. Passing that assertion is not a browser rendering or publish-latency measurement.

Two PostgreSQL suites exist. `postgres-integration.test.ts` covers draft/publish races, publication idempotency and triggers, authorization, recovery rotation/expiry/failed attempts, pruning, duplicate submissions, retry, archive retention, and response access. `patient-http-integration.test.ts` invokes actual Route Handlers with constructed requests and a real database for cookies, progress, cross-browser credentials, hidden-answer injection, submissions, completed-session writes, and cross-form/version isolation; it does not start a separate HTTP server.

Playwright has nine spec files, one Chromium project, one worker, and mixed mocked HTTP and real-backend journeys. Coverage includes authoring/rename/delete, preview/publication, theme persistence and contrast, recovery in separate browser contexts, hidden-answer pruning, historical snapshots/responses, network failures, completion/expiry, keyboard use, consent layout, and narrow viewports. Not every spec is a real Supabase login test: automated admin journeys use guarded test identity fixtures.

## Disposable database setup and isolation

Integration tests write records and may disable triggers during cleanup. Never use production, staging, preview, or shared development targets. A local hostname alone does not prove that records are disposable.

1. Independently designate a disposable PostgreSQL/Supabase target. Configure both `DATABASE_URL` and `DATABASE_DIRECT_URL` for it and matching public Supabase settings plus a test-only `APP_SESSION_PEPPER` (at least 32 characters).
2. Set `IS_TEST_DATABASE=true` and a non-production application classification. The existing `assertTestDatabaseIsolation` must approve the target before destructive setup or migration. It rejects production classifications, Vercel runtimes, and targets outside its local/project allowlist. Do not weaken or mock it; `NODE_ENV=test` is insufficient.
3. Only after the guard passes, provision that disposable schema with `npm run db:migrate`. The migration command itself is not test-isolation guarded; do not substitute it for the guard check.
4. Run `npm run test:integration`. Avoid parallel suites/processes sharing a database while cleanup changes trigger state. Use synthetic fixtures only and inspect each suite's setup/cleanup; the HTTP suite has no complete teardown, so use a discardable target and do not assume a clean reset after every run.

The audit's configured target matched the repository's approved disposable project and had `IS_TEST_DATABASE=true`. It was inspected only in READ ONLY transactions; its availability was not used to authorize destructive verification during this audit.

## Playwright setup

```sh
npx playwright install chromium
npm run test:e2e
```

`test:e2e` builds then runs Playwright. The config starts a fresh `next start` server on `127.0.0.1:3000`; it does not reuse an existing server. It enables test identity with a test-only signing secret and `IS_TEST_DATABASE=true`, subject to the existing target/Vercel guards. Direct `npx playwright test` requires a current build already present.

The optional external variable is **`PLAYWRIGHT_TEST_BASE_URL`**, as currently mapped in `config/constants.mjs`; its internal key is named `PLAYWRIGHT_BASE_URL`. Changing the base URL does not disable the configured local server or make a hosted reviewer database safe for writes. Never run the full suite against the deployed application. Failure artifacts include screenshots/video; traces are captured on first retry. CI retries twice; local runs have no retries by default.

## CI and remaining verification

[CI](../../.github/workflows/ci.yml) targets Node 22 and runs lint, types, units, conditional database integration when `TEST_DATABASE_URL` is present, and build with placeholder settings. Browser E2E is not in CI. Configured secrets and successful workflow runs were not inspected externally.

Pending independent checks include safe PostgreSQL/Chromium execution, hosted auth/workspace negative tests, deployed cookie/cache/origin behavior, transport settings, zoom/screen-reader/focus checks, and a production-browser performance trace. Recovery lost-response handling is a source-confirmed gap: encrypted replay storage exists, but successful rotation cannot be replayed with the old code.

## 100-field browser measurement procedure

Use `tests/fixtures/100-field-fixture.ts` as the reproducible synthetic definition in an isolated development/disposable setup. It generates 20 groups of five questions, not a database seed command or importer. Measure a production build, with the commit, browser/version, device/viewport, CPU/network conditions, and fixture recorded.

Capture editor typing, selecting/reordering fields, changing validation/theme settings, and patient conditional visibility. Record interaction latency, render/commit profiles, and long tasks with an exported trace. Compare the same conditions before/after any optimization, or explain with measurements why no further change is warranted. `PatientQuestionField` memoization and stable callbacks exist; no browser performance result or trace was independently established in this audit. Add a redacted artifact link to the README when available.
