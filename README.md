# Bask Health — Intake Studio

A full-stack intake builder for a fictional weight-loss care service. Administrators create and style forms, publish immutable versions, and review responses. Patients complete a responsive intake, save progress, resume in another browser, and submit.

Built for the Senior Frontend Engineer take-home assignment. Use synthetic data only. Diagnosis, treatment eligibility, medication recommendations, dosing, and checkout are outside scope.

## Submission links

| Deliverable                      | Status                                                                 |
| -------------------------------- | ---------------------------------------------------------------------- |
| Live Vercel application          | Pending: add the deployed URL                                          |
| Published patient intake         | Pending: add a working `/intake/[slug]` URL                            |
| Private repository               | `KaranBaskHealth`; reviewer invitations and privacy need confirmation  |
| Reviewer access                  | Create a real Supabase Auth account and share credentials privately    |
| Demo video, five minutes maximum | Pending: complete flow plus one failure/recovery case                  |
| Redacted AI logs                 | Pending: collect task-specific prompts and responses from all sessions |
| Browser performance trace        | Pending: capture and attach the 100-field trace described below        |

These statuses describe the available local evidence; they do not certify a deployment or external account configuration.

## Product capabilities

- Create, open, rename, and delete unpublished drafts; add, edit, reorder, duplicate, and delete questions.
- Six field types: short text, long text, number, single-select, multi-select, and checkbox. Configure required answers, text lengths, numeric bounds, integer constraints, and choice options.
- One visibility condition per field, referencing an earlier, required, unconditional single-select. Broken dependencies block publication; incomplete drafts remain saveable.
- Revision-aware autosave, visible save status, explicit failure recovery, and three-way reconciliation for conflicting edits.
- Working preview; Ocean, Emerald, and Slate presets; light/dark modes; generated Shuffle palettes; saved theme settings.
- Immutable published form/theme snapshots with a distinct public URL per version. Patient sessions remain pinned to their starting version.
- Database-backed progress, recovery-code resume, server-side validation, hidden-answer pruning, and idempotent submission.
- Authorized response lists and details with historical question labels, version, and submission time.
- Native inputs, keyboard reorder buttons, accessible labels/errors, modal focus handling, and reduced-motion styles.

## Stack and structure

Next.js 16 App Router, React 19, strict TypeScript 6, Tailwind CSS v4, and Polaris icons. Supabase Auth verifies administrators; Drizzle and PostgreSQL provide persistence. Axios and Zod handle browser API requests and response contracts.

| Path                               | Responsibility                                                        |
| ---------------------------------- | --------------------------------------------------------------------- |
| `src/app/`                         | Pages, loading/error boundaries, and Route Handlers                   |
| `src/features/forms/`              | Builder, drafts, publication, concurrency, and responses              |
| `src/features/patients/`           | Intake, validation, visibility, progress, recovery, and submission    |
| `src/features/themes/`             | Presets, contrast calculations, Shuffle, and theme variables          |
| `src/components/ui/`               | Shared controls, dialogs, feedback, and loading primitives            |
| `src/design-system/`               | Visual tokens and primitive style recipes                             |
| `src/lib/`                         | Authentication, database schema, security, HTTP, and shared constants |
| `config/`                          | Environment names, defaults, and lazy configuration access            |
| `db/migrations/`                   | Versioned schema and database protections                             |
| `scripts/lib/migration-engine.mjs` | Shared migration engine with locking and checksums                    |
| `tests/`                           | Unit, database integration, browser journeys, and synthetic fixtures  |

### Database model

The schema combines relational access boundaries with JSONB form and answer snapshots:

- `workspaces` and `admin_memberships` scope administrative access through owner/editor roles.
- `forms` and `form_drafts` store mutable definitions and themes with revision checks.
- `published_versions` preserve immutable form/theme snapshots; `publication_operations` identify publication retries.
- `patient_sessions` pin progress to a published version and store capability/recovery hashes, expiry, and recovery-attempt state.
- `submissions` enforce one response per session and preserve submitted answers.
- `audit_events` record administrative lifecycle metadata.

See the [schema](src/lib/db/schema.ts) and [ERD](docs/architecture/ERD.md).

## Local setup

Use Node.js 22, matching CI, and npm. Provision a dedicated development Supabase project with PostgreSQL and Auth; do not use a production or shared patient database.

```sh
npm ci
cp .env.example .env.local
```

Populate `.env.local` using the settings below. Create a reviewer user in Supabase Auth with a confirmed email and password. Disable public signups for this private reviewer application: authenticated users without memberships receive their own workspace on first access.

Confirm that the database URLs point to the intended development project before applying migrations:

```sh
npm run db:migrate
npm run dev
```

Open `http://localhost:3000/admin/login` and sign in with the real reviewer account. The first successful workspace lookup provisions a workspace and owner membership automatically.

For a local production build:

```sh
npm run build
npm run start
```

### Environment variables

Application and migration tooling load `.env.local`, then `.env`, without replacing variables already supplied by the process. Keep database credentials and the session pepper server-side; never commit populated environment files.

| Variable                               | Purpose                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase Auth project URL                                                                              |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public Supabase key; preferred over the legacy anon key                                                |
| `DATABASE_URL`                         | Application PostgreSQL connection, normally the transaction pooler                                     |
| `DATABASE_DIRECT_URL`                  | Direct or session-pooler connection for migrations; falls back to `DATABASE_URL`                       |
| `APP_SESSION_PEPPER`                   | Independently generated high-entropy secret, at least 32 characters, for session/recovery cryptography |
| `APP_ENV`                              | Optional environment classification; use `production` for the hosted application                       |
| `PLAYWRIGHT_BASE_URL`                  | Optional browser-test URL; defaults to `http://127.0.0.1:3000`                                         |
| `IS_TEST_DATABASE`                     | Explicit disposable-database opt-in for integration tests                                              |
| `ENABLE_TEST_AUTH`                     | Optional local automated-test authentication; leave unset for normal use                               |
| `TEST_AUTH_SECRET`                     | Test-only signing secret, at least 32 characters, when test authentication is enabled                  |

`NODE_ENV`, `CI`, and Vercel environment identifiers are supplied by their respective runtimes. The example file also lists `NEXT_PUBLIC_APP_URL` and `E2E_REVIEWER_*`; current application/test code does not consume those settings. Public intake links use the application's origin and published slug.

### Synthetic demo data and seeding

There is no standalone seed command or fixture-import UI. For a reviewer demo, create a form through the dashboard with a required name field, a required Yes/No single-select, a dependent details field shown for Yes, and a required consent checkbox. Add the other field types to demonstrate their validation and preview.

The automated suites create their own synthetic records. `tests/fixtures/100-field-fixture.ts` exports `generate100FieldFixture()` for benchmarks; it does not populate the application database by itself.

## Repeatable product walkthrough

1. Sign in, create a draft, add questions, and configure an eligible visibility condition.
2. Try preview, choose a preset, toggle light/dark, and Shuffle. Wait for saved status, reload, and confirm the draft/theme persist.
3. Publish and open the generated public URL in a separate browser context.
4. Enter partial answers and save. Keep the session reference and recovery code; resume in another browser and confirm answers return.
5. Change the conditional parent so its child disappears, then show it again. The child should start unanswered while unrelated answers remain.
6. Complete required answers, submit, and open the response list/detail as an administrator.
7. Edit and republish the draft. Confirm the original intake URL and historical response retain their original version and theme.

For the failure/recovery demonstration, temporarily interrupt a save request, confirm local edits remain with an unsaved/error state, restore connectivity, and retry explicitly. Do this with synthetic data only.

## Design and engineering decisions

- **One application with feature boundaries:** domain rules remain pure, server services own persistence, and React hooks own interactive state. Shared primitives keep controls and modal behavior consistent.
- **Draft aggregate plus immutable snapshots:** drafts store the form/theme together; publication snapshots preserve stable question/option IDs and historical meaning without changing old patient sessions.
- **Explicit concurrency:** expected revisions and transactions prevent silent overwrites. Autosave acknowledgments belong to their submitted snapshot; late responses cannot mark newer edits saved. Conflicts use the last server-acknowledged state as their merge base.
- **Reliable completion:** submission locks the session, validates visible answers, and uses a unique session-to-submission relationship. A retry returns the existing confirmation rather than creating another response.
- **Understandable recovery:** an HttpOnly capability cookie permits same-browser return. A session reference and recovery code enable cross-browser resume, with expiry, bounded failed attempts, and credential rotation.
- **Centralized styling:** design tokens define shared visual values; theme presets bind through scoped intake aliases. Shuffle generates hues beyond the presets and adjusts primary-action lightness for contrast. Token audits and browser tests cover readability.
- **Continuous patient form:** keeping fields in document order supports browser search, keyboard navigation, and jump-to-required behavior. No drag-only interaction or mandatory pagination is introduced.

## Tests and verification

```sh
npm run typecheck
npm run lint
npm run test:unit
npm run build
```

Unit coverage includes validation, conditional dependencies, hidden-answer pruning, autosave/concurrency, API failures, theme contrast, authorization helpers, and credential handling. Database suites cover immutable publication, access boundaries, progress persistence, recovery, and simultaneous/retried submissions. Browser journeys cover authoring, preview, publication, intake, resume, response review, mobile layouts, and recovery from failures.

### Database and browser suites

Integration tests write records and may alter trigger state. Run them only with a separately designated disposable test database and a passing `assertTestDatabaseIsolation` guard in `src/lib/db/test-db-isolation.ts`. `NODE_ENV=test` alone is insufficient. Never weaken the guard or mark an application database disposable to make tests pass.

Configure both database URLs for that disposable target, set `IS_TEST_DATABASE=true`, and supply the public Supabase settings and a test-only pepper. Provision its schema with the migration command before running the suites. The test guard must approve the target before destructive setup; inspect the existing allowlist rather than assuming every local or remote database is safe.

```sh
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

`test:e2e` builds and starts a local production server. Playwright enables the isolated test-auth configuration; test authentication is blocked on Vercel and requires an approved disposable database. Some browser tests mock HTTP responses, while the full backend journeys create actual database records. Do not point the full suite at a deployed reviewer application. CI runs lint, types, unit tests, and a build; database integration runs when disposable test secrets are configured. Browser E2E is not currently part of CI.

### Evidence available as of October 11, 2026

The latest local review ran typecheck, lint, and 194 unit tests successfully. A saved local Playwright report recorded 32 passing tests; that report was not rerun during the review and is ignored by Git. These results do not establish hosted behavior. Production build, live-backend checks, and fresh database/browser results should be recorded against the final submission commit.

### Performance evidence

The 100-field fixture exercises visibility and hidden-answer pruning in a timed unit benchmark. `PatientQuestionField` uses `React.memo`; `PatientIntakeView` passes the stable `onAnswerChange` handler, and the field binds its question ID through `useCallback`. This avoids allocating a new parent callback for each field on every render. The [performance report](docs/architecture/PERFORMANCE_100_FIELD.md) describes earlier measurements, but the underlying browser trace has not been verified during this README review.

**Still required:** attach a browser performance trace from a production build using the 100-field fixture. Record browser/version, viewport/device, CPU/network conditions, and the exact commit. Measure typing, editing, or changing visibility, and report an observed improvement or explain why further optimization is unnecessary. No browser latency numbers or FPS claims are asserted here without a trace.

## Security and deployment

Supabase identity is verified on the server. Protected services check workspace/form access; mutation routes verify request origin. Application tables have RLS enabled and browser-role grants revoked. Because privileged server database connections can bypass RLS, service authorization remains essential.

Patient access uses per-form HttpOnly cookies and server-verified capabilities. Recovery credentials are hashed; the short-lived recovery replay payload uses authenticated AES-256-GCM encryption. Answers remain ordinary database values, protected by access controls and provider storage encryption, rather than custom field-level encryption. Do not place answers or resume credentials in URLs, logs, analytics, or error reports. Keep reviewer credentials private.

For deployment, connect the private repository to Vercel, set the required application environment variables, and provision/migrate the intended hosted database deliberately. Keep test-auth flags unset and keep test databases separate. Supply the deployment URL, a published intake URL, and a real reviewer login after checking the complete hosted flow.

- **HTTPS:** Vercel manages SSL certificates for configured domains; confirm the final application and intake URLs serve HTTPS. See [Vercel SSL documentation](https://vercel.com/docs/domains/working-with-ssl).
- **Database transport:** require encrypted PostgreSQL connections, for example through supported `sslmode=require` connection settings and provider SSL enforcement. The application client does not independently force TLS, so confirm the deployed connection settings; use certificate verification where configured. See [Supabase connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres) and [SSL enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement).
- **Encryption at rest:** Supabase documents provider-managed encryption. That is a provider guarantee, not a deployment verification performed by this repository. See [Supabase's shared responsibility model](https://supabase.com/docs/guides/deployment/shared-responsibility-model).

Before handling real patient data, review whether field-level encryption is needed and separate encryption keys from application signing secrets, with managed storage and rotation. Replace broad database credentials with least-privilege roles, restrict administrative provisioning, add auditable response-access records, and define retention/deletion rules for answers, sessions, backups, and logs. Review provider agreements, monitoring/redaction, abuse controls, and recovery procedures. Session expiry is an access limit; it is not an automated data-retention policy. This synthetic-data exercise does not claim HIPAA compliance.

## Tradeoffs and unfinished work

Full signup/account recovery, mobile authoring, nested conditions, clinical decisions, checkout, and custom answer encryption are outside the assignment's scope. PostgreSQL remains the source of truth; there is no Redis requirement or browser-storage persistence substitute. Initial demo data is created manually rather than through a dedicated seed tool.

Outstanding submission work is listed at the top: hosted verification and links, reviewer access/invitations, the five-minute video, redacted AI logs, and a browser performance trace. Confirm login abuse controls and production database permissions before expanding access beyond private reviewers.

For AI disclosure, the earlier generated README claimed a 35.6× browser-performance improvement and described a more elaborate Shuffle algorithm. Those claims were not copied as verified results: the current source was checked against the descriptions, and the performance section distinguishes the implemented callback optimization from measurements requiring a trace. Include the original session logs in the submission; this summary does not replace them.

## Further documentation

- [Master checklist](CHECKLIST.md) and [progress log](docs/PROGRESS.md)
- [Architecture overview](docs/architecture/README.md), [decisions](docs/architecture/ADRS.md), and [API contracts](docs/architecture/API_CONTRACTS.md)
- [Deployment](docs/DEPLOYMENT.md), [threat model](docs/architecture/THREAT_MODEL.md), and [defense in depth](docs/architecture/DEFENSE_IN_DEPTH.md)
- [Concurrency and edge cases](docs/architecture/EDGE_CASES.md), [maintenance boundaries](docs/architecture/MAINTAINABILITY.md), and [design system](docs/architecture/DESIGN_SYSTEM.md)
- [Test plan](docs/testing/TEST_PLAN.md) and [performance report](docs/architecture/PERFORMANCE_100_FIELD.md)
