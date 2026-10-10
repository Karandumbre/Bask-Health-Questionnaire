# Prompt for Local AI - Bask Health Phase 1 (Architecture-first)

You are a staff-level full-stack architect and senior Next.js engineer. You are building a production-style take-home assessment for Bask Health called **Intake Studio**. Read the candidate brief, reference screenshots/Figma, `CHECKLIST.md`, and `PHASE_1_ARCHITECTURE.md` **in full before writing code**. Treat the brief as authoritative. Figma is illustrative, not pixel-matching.

## Goal for THIS iteration

Start with **Phase 1: architecture, database, security and engineering contracts**. Do not build a flashy UI first. Deliver reviewable architecture and implement only well-scoped foundations if the repo/environment is ready. Do **not** claim Supabase, Vercel, auth, migrations or tests are working until actually verified.

### Non-negotiable brief

- Next.js **16** App Router, TypeScript strict, Tailwind CSS, **Polaris icons**. No `any` or `@ts-ignore` in application code.
- Hosted **Supabase PostgreSQL** as source of truth; **Supabase Auth** for private admin/reviewer login; **Vercel** deployment linked to **private GitHub repo**; pushes to `main` auto-deploy production, PRs yield previews. Keep backend credentials on the server. No Redis unless performance evidence later requires it.
- Admins create/open/rename/delete unpublished drafts; question types short/long text, number, single-select, multi-select, checkbox; keyboard reorder, duplicate, conditional logic, publish, preview, thematic presets and Shuffle, historic responses.
- A condition is exactly one equality from a prior **required unconditional single-select** option. Reference IDs, not labels. Invalid dependencies block publish, not autosave.
- Two admins may edit same draft. Use optimistic concurrency (`revision`, HTTP 409 conflict UX), no silent overwrites. Publishing checks revision and is transactional/idempotent.
- Published version contains **immutable** form + light/dark theme; unique public URL. Old session/version and old labels must remain fixed forever.
- Patient progress/resume is DB-backed, including an **explicit, secure cross-browser mechanism**. Never grant access from session ID alone, never put answers in URL. Session is pinned to version. Parent answer changes remove now-hidden answers, including server-side.
- Final validation on server: correct type/ranges/integer, 2+ distinct choices, nonblank required text, checked required checkbox, valid required multi-select, reject unknown visible values; hidden answers removed. Exactly one immutable submission per session, including concurrent retry/lost response.
- Three named presets + light/dark + fresh generated Shuffle with WCAG AA >=4.5:1 normal text and >=3:1 large text, centralized tokens. Patients switch only light/dark.
- Focused Vitest, real Postgres integration tests, Playwright e2e; trace one 100-field scenario. Access/condition/version/duplicate submission tests are essential.
- README, test/migration/seed scripts, security/tradeoff notes, 5-min demo, AI logs, private repo reviewers and deploy proof.

### Default design choices (propose changes explicitly; do not silently diverge)

1. Modular monolith in Next.js, Drizzle server-side Postgres access, Supabase Auth identity, application service-layer workspace membership authorization; no direct privileged browser DB calls.
2. DB: `workspaces`, `admin_memberships`, `forms`, `form_drafts` JSONB + revision, `published_versions` immutable JSONB + unique version and slug, `publication_operations`, `patient_sessions` + revision + credential hashes, immutable `submissions` unique per session, `audit_events` without sensitive payloads.
3. One draft per form; published history remains while new draft evolves. Archive published forms instead of cascading delete.
4. Published snapshots strictly immutable at DB level, not only TypeScript convention.
5. Secure patient recovery: random session reference + high-entropy one-time recovery code issued at start, shown once, persisted only hashed, redeemed with rate limiting to establish session-specific HttpOnly cookie. Discuss UX friction and expiration/rotation; never presume code by itself is patient identity without secret proof.
6. All draft writes CAS on `expectedRevision`; all patient writes CAS on `expectedSessionRevision`; all publications and submissions transactional. Repeated publish uses `operationId`, submit uses unique session row.
7. Private repo `FirstNameBaskHealth` (ask before choosing exact name), CI GitHub Actions checks; Vercel Git integration deploys, migrations gated and controlled, preview DB separate from production.

### Do this in order

**Step A - inspect and plan.** Inspect existing repository and dependencies; do not delete/overwrite unrelated work. Compare candidate brief to checklist. Output a short gap analysis, decisions, and file-change plan. Ask only genuinely blocking questions; otherwise state assumptions.

**Step B - architecture artifacts.** Create/update `docs/architecture/README.md`, `docs/architecture/ADRS.md`, `docs/architecture/ERD.md` (Mermaid graph), `docs/architecture/API_CONTRACTS.md`, `docs/architecture/THREAT_MODEL.md`, `docs/architecture/EDGE_CASES.md`. Explain trust boundaries, role access, patient recovery credential, concurrency, immutable versions, transactions, idempotency, deletion/retention, logs and cross-version answers.

**Step C - database design.** Propose executable Drizzle schema and SQL migrations with FKs, unique constraints, indexes, RBAC model, immutable snapshot and submission triggers, CAS semantics, publication serialization, and no cascading deletion of historical data. Use correct Supabase Auth ID integration. Document DB privilege/RLS choice. If environment is not available, provide code but mark migration verification PENDING. Do not run destructive production migrations.

**Step D - domain contracts.** Define strict discriminated union for all question types using Zod/TypeScript; stable question/option IDs; schema version; canonical answer value types. Add pure rule functions for publish validation, conditional visibility, hidden-answer pruning, and server-side final validation. Define error codes such as `REVISION_CONFLICT`, `INVALID_FORM`, `INVALID_ANSWER`, `SESSION_UNAUTHORIZED`, `SESSION_COMPLETED`, `PUBLISH_CONFLICT`, `RESUME_RATE_LIMITED`. Ensure errors are safe and contain no sensitive payloads.

**Step E - testing plan and selected tests.** Start Vitest coverage for required text trim, unknown choices, number edge cases, conditional identity, broken dependencies, pruning and version schema. Outline true DB concurrency integration tests; implement them only when test DB exists. Plan Playwright admin-to-patient E2E, secure cross-browser resume, duplicate submit, and autosave failure/recovery. Include 100-field fixture benchmark plan.

**Step F - CI/deployment design.** Provide `.env.example` with names only, GitHub Actions build/test workflow, Vercel automatic deployment instructions and explicit gated migration workflow. Do not print or commit tokens, DB URLs or reviewer password. Explain production vs preview environment isolation and free-tier operational limits.

**Step G - status tracking.** For each checklist item use statuses `DONE`, `PARTIAL`, `IN_PROGRESS`, `PENDING`, `BLOCKED`. A planning document merits DONE only for planning tasks; implementation stays PENDING until code works. Update `CHECKLIST.md`, add a per-phase summary (`docs/PROGRESS.md`) recording Date, Changes, Tests executed/actual results, Decisions, Blockers, Next 3 actions. Preserve existing checkboxes and annotate status rather than marking design as implementation.

### Verification expectations

Run available commands and report exact results: `npm run lint`, `npx tsc --noEmit`, unit tests, migrations dry-run/test DB verification and `npm run build`. If a command cannot run, write `NOT RUN` and reason. Do not fake measured concurrency behavior or performance trace. Avoid client bundle secrets, logging patient payloads, and `any`/`@ts-ignore`.

### Output format after work

1. What was changed (actual file paths).
2. Decisions made and tradeoffs, with proposed vs verified distinction.
3. Database ER diagram and operation flows.
4. Tests run, passing/failing/not run.
5. Checklist statuses and exact percentages/counts (if reported, based only on tracked items).
6. Outstanding blockers/questions.
7. Next single milestone to implement.

**Work incrementally and wait for my review before moving into the full editor UI.**
