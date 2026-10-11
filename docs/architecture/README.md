# Architecture overview

Intake Studio runs as one Next.js 16 App Router application. Supabase Auth verifies administrators; server-only Drizzle services access PostgreSQL. Patients use public version URLs and session-specific capabilities rather than administrator accounts.

## Boundaries and data flow

- `src/app/` contains pages and HTTP Route Handlers. Protected pages and handlers verify identity; services check workspace/form membership before accessing protected resources.
- `src/features/forms/` separates question/condition validation and merging in `domain/`, persistence in `server/`, browser endpoint helpers in `client/`, and editor behavior in hooks/context. The builder composes these pieces.
- `src/features/patients/` owns version-bound sessions, progress, recovery, final validation, and submission. Visibility and hidden-answer pruning are shared domain rules; PostgreSQL remains authoritative.
- `src/features/themes/` provides Ocean, Emerald, and Slate presets, light/dark modes, Shuffle, and contrast checks. Shared visual foundations live in `src/design-system/`; intake aliases bind theme colors. Shared controls and dialogs live in `src/components/ui/`.
- Application copy lives in `src/lib/constants/messages.ts`; routes and timing defaults live in `application.ts`. Environment names/defaults live in `config/constants.mjs`, with access through `config/environment.mjs` and its server-only wrapper. Browser HTTP requests use the shared Axios client and endpoint contracts.

Drafts contain mutable definition/theme JSONB and a revision. Publication locks the form before the draft, validates the expected revision, and creates an immutable snapshot and operation record in one transaction. Patient sessions reference one snapshot. Submission locks the session, validates/prunes answers, and creates one immutable response per session.

Public URLs identify readable published forms; they are not patient credentials. Per-slug cookies authenticate session operations. Cross-browser recovery rotates the capability and recovery code, invalidating the former browser's credential.

## Verification boundary

On October 11, 2026, read-only metadata inspection verified the configured allowlisted disposable project, not the Vercel production database. Typecheck, lint, 282 unit tests, and build passed locally on Node 24.14.1; CI targets Node 22. Database writes and browser journeys were not run in this audit. Deployment and hosted functionality are owner-confirmed.

## Supporting documents

- [Architecture decisions](ADRS.md): choices, reasons, and tradeoffs.
- [Defense in depth](DEFENSE_IN_DEPTH.md): identity, authorization, capabilities, grants, and security gaps.
- [Edge cases](EDGE_CASES.md): concurrency, pruning, publication, recovery, and retry behavior with test evidence.
- [Database model](ERD.md): columns, relationships, constraints, indexes, and metadata findings.

See also the [test plan](../testing/TEST_PLAN.md), [deployment guide](../DEPLOYMENT.md), and [master checklist](../../CHECKLIST.md).
