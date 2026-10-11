# Bask Health — Intake Studio

Intake Studio is a form builder and patient intake application developed for the Bask Health Senior Frontend Engineer assessment. Administrators can create and publish forms, and patients can complete them on mobile or desktop, save progress, and return later.

The owner confirms that the application is deployed on Vercel and the hosted application works. A read-only HTTPS request to the supplied application URL returned HTTP 200; hosted settings and authenticated/patient flows were not independently verified in this audit. Persistence uses Supabase PostgreSQL. The assessment uses synthetic data only.

## Links and reviewer access

| Item                  | Details                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Live application      | [Live application](https://karan-bask-health.vercel.app) — HTTPS GET 200; functionality owner-confirmed                  |
| Sample patient intake | `[add verified published intake URL]`                                                                                    |
| Source code           | [KaranBaskHealth](https://github.com/Karandumbre/KaranBaskHealth) — private status owner-marked; invitations unconfirmed |
| Admin login           | `/admin/login` — credentials shared privately                                                                            |
| Demo video            | [add link, maximum five minutes]                                                                                         |
| AI interaction logs   | [add link to redacted task-related logs]                                                                                 |
| Performance evidence  | [add browser trace or report link once verified]                                                                         |

Please do not put reviewer passwords, database credentials, recovery codes, or patient answers in this README.

## What I built

**Form builder:** Create, rename, edit, preview, and publish forms. The editor supports short text, long text, numbers, single-select, multi-select, and checkboxes. Each question can have validation rules, and conditional questions can depend on an earlier required single-select question.

**Safe editing and publishing:** Changes are autosaved using revision checks. When two administrators edit the same draft, the application detects conflicts and offers a comparison and merge flow. Publishing creates an immutable form and theme snapshot with a unique patient URL, so later edits do not change earlier responses.

**Patient intake:** Responsive intake with required-field validation, conditional visibility, progress saving, and cross-browser recovery using a session reference and recovery code. The server removes answers to hidden questions and validates submitted responses against the published form. Duplicate submission attempts return the existing result instead of creating another response.

**Themes and responses:** Three presets (Ocean, Emerald, Slate), light/dark modes, an accessible Shuffle palette generator, and an admin response viewer that uses original published question labels.

## Technology

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, and Shopify Polaris icons
- Supabase Auth for administrator authentication
- Supabase PostgreSQL with Drizzle ORM and versioned SQL migrations
- Zod for request and domain validation
- Vitest for unit and database integration tests; Playwright for browser tests
- GitHub and Vercel for source control and deployment

The repository is organized by feature in `src/features/forms`, `src/features/patients`, and `src/features/themes`. Route handlers live in `src/app`, while shared database, authentication, and security modules live in `src/lib`.

## Run locally

Use Node.js 22 and npm. Create a separate development Supabase project; do not reuse production or the disposable automated-test database.

```bash
npm ci
cp .env.example .env.local
```

Configure the following variables in `.env.local`:

| Variable                               | Purpose                                                   |
| -------------------------------------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL                                      |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase key                                 |
| `DATABASE_URL`                         | PostgreSQL application connection                         |
| `DATABASE_DIRECT_URL`                  | Migration connection (direct or supported session pooler) |
| `APP_SESSION_PEPPER`                   | Secret used for patient capability/recovery credentials   |

The pepper must contain at least 32 characters. `DATABASE_URL` supports transaction pooling; migrations use a direct/session pooler and fall back to `DATABASE_URL` if the direct URL is absent. Optional settings include `APP_ENV` and `PLAYWRIGHT_TEST_BASE_URL` (the current external name in `config/constants.mjs`). Disposable tests use `IS_TEST_DATABASE`, and guarded test identity uses `ENABLE_TEST_AUTH`/`TEST_AUTH_SECRET`; leave these out of hosted environments. Node/Vercel supply runtime environment identifiers. Never commit populated environment files.

After confirming that the database connection targets the intended **development** project:

```bash
npm run db:migrate
npm run dev
```

Open `http://localhost:3000/admin/login`. Provision a confirmed email/password reviewer account through Supabase Auth and share credentials privately. On initial workspace lookup, any verified user without active memberships receives a new owner workspace; restrict public signups externally. No standalone seed command exists: create demo forms through the UI. See the [deployment guide](docs/DEPLOYMENT.md).

## Tests

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run build
```

Database integration tests and full browser journeys require a designated disposable test database and correctly configured test credentials:

```bash
npm run test:integration
npm run test:e2e
```

**Do not point these suites at production.** The repository includes database-target safety checks, but you should still confirm the actual project and environment before testing. The existing `assertTestDatabaseIsolation` guard must pass before destructive setup or migrations; `NODE_ENV=test` alone is insufficient. See the [test plan](docs/testing/TEST_PLAN.md) for isolation, Chromium installation, and fixture cleanup limits.

October 11, 2026 audit: typecheck, lint, unit tests (**35 files / 282 tests**), and production build passed on Node 24.14.1. CI targets Node 22; that runtime was not repeated locally. Database integration and Playwright were not run. Read-only metadata verified the configured repository-designated disposable database, not the hosted target: both applied migration checksums match, all ten tables have RLS, both immutability triggers are enabled, and no browser-role table grants were visible. Details and schema differences are in the [ERD](docs/architecture/ERD.md).

## Key engineering choices

- **Drafts and published versions are separate.** Editable form definitions are stored as JSONB; publishing saves immutable snapshots of questions and theme settings.
- **Concurrency is explicit.** Draft writes use expected revisions. A three-way merge compares the acknowledged base, local changes, and server changes; conflicting choices require resolution.
- **Patient sessions are version-bound.** A patient continues on the form version where they started, even after a new version is published.
- **Submissions are idempotent.** Database transactions and a unique session constraint ensure one submitted response per patient session.
- **Authorization lives on the server.** Admin operations verify workspace membership. Patient actions require session-specific credentials. Server-side Drizzle access does not rely on browser RLS for authorization.
- **Theme rules are shared.** The same typed tokens drive builder preview and patient intake, with contrast checks for the generated palettes.

The [architecture overview](docs/architecture/README.md), [decisions and tradeoffs](docs/architecture/ADRS.md), [security boundaries](docs/architecture/DEFENSE_IN_DEPTH.md), [edge cases](docs/architecture/EDGE_CASES.md), and [master checklist](CHECKLIST.md) describe implementation and remaining verification.

## Suggested reviewer walkthrough

1. Sign in and create a draft form.
2. Add a required Yes/No question and a dependent field that appears when Yes is selected.
3. Preview the form, choose a theme, use Shuffle, and reload to check persistence.
4. Publish and open its intake URL on a phone-sized browser viewport.
5. Save partial patient answers, then resume with the recovery reference and code in a separate browser.
6. Change Yes to No and confirm that the dependent answer is removed.
7. Submit and review the historical response in the administrator dashboard.
8. Demonstrate an interrupted autosave and recovery, using synthetic data.

## Performance and accessibility

The project includes a 100-field fixture and domain benchmarks. The patient field renderer is memoized to reduce unnecessary re-renders. A reproducible production-browser performance trace, with its device conditions and measurements, remains pending. The passing unit benchmark asserts visibility and pruning each take under 10ms; it does not measure browser rendering. Follow the [browser measurement procedure](docs/testing/TEST_PLAN.md#100-field-browser-measurement-procedure) and attach the trace and measured rationale.

Inputs use accessible labels and error messages, choice groups use appropriate semantics, and the form supports keyboard navigation and reduced-motion preferences. Contrast is checked for named and generated palettes.

## Scope and limitations

This is a take-home demonstration using synthetic information, not a clinical production system. It does not assess treatment eligibility or prescribe medication. Before handling real patient data, the application would require a separate compliance/security review covering provider agreements, database privileges, encryption/key management, audit trails, retention/deletion, incident response, and operational monitoring.

The project intentionally omits signup/account recovery, mobile form authoring, nested condition logic, and live collaborative editing. A dedicated seed command is not included; demo forms can be created in the UI, and tests use synthetic fixtures.

Patient capabilities use per-slug HttpOnly/SameSite=Strict cookies with Secure in production. Origin checks reject supplied mismatched hosts but accept absent Origin; sensitive no-store headers are not uniform across all endpoints. Recovery rotates the code and capability; stored encrypted replacement credentials are not consumed for replay, so losing a successful resume response can strand access. General login/public-write rate limits remain incomplete. The privileged inspected SQL role bypasses RLS, and database TLS/storage-encryption settings remain unverified. See [defense in depth](docs/architecture/DEFENSE_IN_DEPTH.md).

**Remaining handoff items:** Add the published intake link, confirm reviewer invitations and credentials, include the five-minute demonstration video, attach performance evidence, and provide the requested redacted AI prompts/responses with one documented suggestion that was changed or rejected and how it was verified.
