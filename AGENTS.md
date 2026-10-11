# Working in Intake Studio

## Structure and reuse

- This is a Next.js App Router application using React, strict TypeScript, Tailwind v4, Supabase Auth, and Drizzle/PostgreSQL.
- Define visual values in `src/design-system/tokens.css`; prefer its Tailwind utilities over arbitrary pixel values. JavaScript style consumers use `src/design-system/tokens.ts`. Primitive recipes live in `component-styles.ts`. Keep patient theme colors in existing theme presets and bind them through scoped intake aliases. Use a documented, narrowly scoped exception only when required by third-party integration or browser behavior.
- Put application copy and formatted messages in `src/lib/constants/messages.ts`; shared routes, timing, authentication settings, and question defaults belong in `src/lib/constants/application.ts`. Keep schema discriminants and HTML/protocol identifiers alongside their contracts.
- Environment keys, external names, values, and defaults live in `config/constants.mjs`; access lives in `config/environment.mjs`. Use `readEnvironment(ENVIRONMENT_KEYS.NODE_ENV)` and `ENVIRONMENT_VALUES.PRODUCTION` rather than literal setting names or values. Server application code imports its `server-only` wrapper at `src/lib/config/environment.ts`; Node scripts/configuration import the MJS utility directly. Browser code uses only the public Supabase getter. Do not cache runtime environment values eagerly or expose a private settings object to clients. ESLint rejects direct `process.env` access outside this boundary; tests may explicitly override environments.
- Keep shared UI primitives in `src/components/ui/`. Reuse `Button`, `Input`, `Textarea`, `Select`, and `Dialog` before adding inline controls or copying Tailwind styles. Keep feature composition in `src/features/<feature>/components/`.
- Use native input props and refs. Associate labels with controls, give icon-only controls accessible names, and use the shared modal dialog for keyboard and focus behavior.
- Use `src/lib/http/api-client.ts` for browser API requests. Its shared Axios instance uses interceptors for headers and error normalization; retain AbortSignal cancellation and avoid automatic mutation retries. Validate responses according to endpoint contracts with Zod, particularly at untrusted boundaries; do not duplicate validation already guaranteed by an established typed contract without a reason. Put feature-specific endpoint helpers in the feature's `client/` directory. Keep browser code separate from server-only services.
- Reuse `forms/domain/conditions.ts` for condition eligibility and validation, and `QuestionActions` for field actions. Keep native answer controls in `QuestionInput`; use the shared clipboard hook rather than repeating timers.
- Keep pure domain rules in `domain/`, persistence in `server/`, and React behavior in `hooks/` or context. Avoid combining network, persistence, and presentation in one component.
- The builder context composes editing state. `DraftAutosave` handles serialized revision-aware saves. Never mark newer edits saved when an older request completes, retry a conflict implicitly, or guess a successful revision.
- Keep reusable question factories and IDs in `src/features/forms/domain/question-operations.ts`. Preserve published question and option IDs; regenerate IDs only when creating or duplicating fields.

## Authentication and persistence

- Use server-verified Supabase identity and shared workspace/form authorization helpers. Apply origin verification to browser mutation routes and serialize failures with `handleRouteError`.
- Authenticate and authorize every protected server operation. Never trust client-provided user IDs, workspace IDs, roles, or ownership claims. Verify resource-level access before protected reads or writes, including workspace membership, form ownership, and role permissions.
- Apply authorization consistently across Route Handlers, Server Actions, and server services. Fail closed when identity, session verification, or authorization cannot be established. Hidden UI controls are not an authorization boundary.
- Preserve PostgreSQL RLS policies and service-role boundaries where configured. Never expose privileged Supabase keys or server-only secrets to browser code.
- Use `forms/server/form-lock.ts` for consistent form-before-draft locking. Renames require an expected revision and advance the draft revision. Migration wrappers must call `scripts/lib/migration-engine.mjs`; do not add a second engine.
- Preserve optimistic concurrency checks, transaction boundaries, publication immutability, and submission idempotency when changing services.
- Use stable question and option IDs as merge identities; do not match solely by array position or display label. Merge disjoint edits where safe, and identify property collisions, choice collisions, and delete-versus-modify conflicts.
- Never silently overwrite conflicting changes or resolve conflicts by choosing a winner without an explicit policy. Keep the last server-acknowledged draft as the three-way merge base, not an unacknowledged local draft.
- Associate every autosave acknowledgment with its submitted local snapshot and the server-confirmed revision. Preserve newer local edits and unsaved state when older requests finish, fail, or return conflicts. Do not retry conflicting mutations until reconciliation or explicit resolution.
- Add regression coverage for simultaneous edits, overlapping saves, late responses, delete-versus-modify conflicts, and network interruptions when changing these flows.
- Database integration tests write records and may temporarily change trigger state. Run them only against a designated disposable test database. Do not apply migrations or run destructive tests against the application's database as a routine verification step.
- Require the existing test database safety guard to pass before destructive test setup, migrations, trigger changes, or truncation. Never bypass, weaken, or mock that guard to make tests pass. `NODE_ENV=test` alone does not establish that a database is disposable.
- Never run destructive verification against production, staging, preview, or shared development databases. If a safe test database is unavailable, skip those tests and report them as not run.
- Never print or commit credentials, `.env` files, session tokens, or patient data.

## Validation

- CI uses Node 22; keep dependency and type choices compatible with it.
- Run `npm run typecheck`, `npm run lint`, and `npm run test:unit` for code changes. Run `npm run build` for changes affecting routes, imports, rendering, CSS, or build configuration.
- Add behavioral regression tests for concurrency, network failure handling, authorization, or data-loss bugs. Prefer tests of observable behavior over tests that repeat implementation details.
- After UI changes, verify affected screens, responsive layout, keyboard navigation, dialog focus/escape behavior, and generated Tailwind utilities in a browser where available. Compilation alone is not browser verification.
- Run `npm run test:integration` only with an explicitly configured disposable test database and a passing safety guard. Report unrun checks and remaining limitations accurately.
- Tailwind v4 uses `@tailwindcss/postcss`, `postcss.config.mjs`, and the import in `src/app/globals.css`. Do not restore v3 PostCSS setup or removed utility names.
- Preserve unrelated user changes and existing staged files. Keep checklist and progress claims aligned with evidence.
- After code changes, report the files changed and why, checks actually executed and their results, browser behaviors verified (if any), checks not run and why, and known limitations or remaining risks.
- Never claim tests, builds, migrations, browser checks, or deployments succeeded without evidence. Do not mark checklist items complete merely because code was written or compilation passed.
- Do not silently modify unrelated code to fix pre-existing failures; report such failures separately.

## Project context

- Read `CHECKLIST.md` and relevant files in `docs/architecture/` when working on the corresponding feature. These describe contracts and pending work, not proof that behavior was tested.
- Graphify is available on the development machine. When `graphify-out/graph.json` exists and code relationships or architecture are relevant, query it first and verify important findings against current source.
- Use the Graphify implementation installed in the development environment. Read its skill or CLI documentation before invoking update commands. If the installed implementation supports `graphify update .`, use that command; do not assume all Graphify implementations share the same CLI.
- After completing code changes, refresh an existing graph using the supported update command and verify success before claiming it is current. If unavailable or unsuccessful, report the limitation and inspect the source directly; do not claim an outdated graph is current.
- Do not create a project-wide graph for routine edits when none exists. Generate one only when explicitly requested or an architecture task warrants it, following the installed Graphify skill and excluding secrets, dependencies, and build output. Documentation-only changes do not require a graph update.
- Generated graph output is ignored by Git and should remain local unless explicitly requested otherwise.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
