# Working in Intake Studio

## Structure and reuse

- This is a Next.js App Router app using React, strict TypeScript, Tailwind v4, Supabase Auth, and Drizzle/PostgreSQL.
- Define visual values in `src/design-system/tokens.css`; use its Tailwind utilities instead of arbitrary pixel values. JS style consumers use `src/design-system/tokens.ts`. Primitive recipes live in `component-styles.ts`. Keep patient theme colors in the existing theme presets and bind them through scoped intake aliases.
- Put application copy and formatted messages in `src/lib/constants/messages.ts`; shared routes, timing, authentication settings, and question defaults belong in `src/lib/constants/application.ts`. Keep schema discriminants and HTML/protocol identifiers alongside their contracts.
- Environment keys, external names, values, and defaults live in `config/constants.mjs`; access lives in `config/environment.mjs`. Use `readEnvironment(ENVIRONMENT_KEYS.NODE_ENV)` and `ENVIRONMENT_VALUES.PRODUCTION` rather than literal setting names or values. Server application code imports its `server-only` wrapper at `src/lib/config/environment.ts`; Node scripts/configuration import the MJS utility directly. Browser code uses only the public Supabase getter. Do not cache runtime environment values eagerly or expose a private settings object to clients. ESLint rejects direct `process.env` access outside this boundary; tests may explicitly override environments.
- Keep shared UI primitives in `src/components/ui/`. Reuse `Button`, `Input`, `Textarea`, `Select`, and `Dialog` before adding inline controls or copying Tailwind styles. Keep feature composition in `src/features/<feature>/components/`.
- Use native input props and refs. Associate labels with controls, give icon-only controls accessible names, and use the shared modal dialog for keyboard/focus behavior.
- Use `src/lib/http/api-client.ts` for browser API requests. Its shared Axios instance uses interceptors for headers and error normalization; retain AbortSignal cancellation and avoid automatic mutation retries. Validate responses with Zod; put feature-specific endpoint helpers in the feature's `client/` directory. Keep browser code separate from server-only services.
- Reuse `forms/domain/conditions.ts` for condition eligibility/validation and `QuestionActions` for field actions. Keep native answer controls in `QuestionInput`; use the shared clipboard hook rather than repeating timers.
- Keep pure domain rules in `domain/`, persistence in `server/`, and React behavior in `hooks/` or context. Avoid combining network, persistence, and presentation in one component.
- The builder context composes editing state. `DraftAutosave` handles serialized revision-aware saves. Never mark newer edits saved when an older request completes, retry a conflict implicitly, or guess a successful revision.
- Keep reusable question factories and IDs in `src/features/forms/domain/question-operations.ts`. Preserve published question and option IDs; regenerate IDs only when creating or duplicating fields.

## Authentication and persistence

- Use server-verified Supabase identity and shared workspace/form authorization helpers. Apply origin verification to browser mutation routes and serialize failures with `handleRouteError`.
- Use `forms/server/form-lock.ts` for consistent form-before-draft locking. Renames require an expected revision and advance the draft revision. Migration wrappers must call `scripts/lib/migration-engine.mjs`; do not add a second engine.
- Preserve optimistic concurrency checks, transaction boundaries, publication immutability, and submission idempotency when changing services.
- Database integration tests write records and temporarily change trigger state. Run them only against a designated disposable test database. Do not apply migrations or run destructive tests against the application's database as a routine verification step.
- Never print or commit credentials, `.env` files, session tokens, or patient data.

## Validation

- CI uses Node 22; keep dependency and type choices compatible with it.
- Run `npm run typecheck`, `npm run lint`, and `npm run test:unit` for code changes. Run `npm run build` for changes affecting routes, imports, rendering, CSS, or build configuration.
- Add behavioral regression tests for concurrency, network failure handling, authorization, or data-loss bugs. Prefer tests of observable behavior over tests that repeat implementation details.
- After UI changes, verify affected screens, responsive layout, keyboard navigation, dialog focus/escape behavior, and generated Tailwind utilities in a browser where available. Compilation alone is not browser verification.
- Run `npm run test:integration` only with an explicitly configured test database. Report unrun checks and remaining limitations accurately.
- Tailwind v4 uses `@tailwindcss/postcss`, `postcss.config.mjs`, and the import in `src/app/globals.css`. Do not restore v3 PostCSS setup or removed utility names.
- Preserve unrelated user changes and existing staged files. Keep checklist/progress claims aligned with evidence.

## Project context

- Read `CHECKLIST.md`, `docs/PROGRESS.md`, and `docs/architecture/` when working on the relevant feature. These describe contracts and pending work, not proof that a behavior was tested.
- Graphify is available on the development machine. When `graphify-out/graph.json` exists and code relationships or architecture are relevant, query it first and verify findings against current source.
- After completing code changes, refresh an existing graph with `graphify update .` and verify the command succeeds before reporting the work complete. If the graph cannot be refreshed, report that explicitly; do not claim it is current.
- Do not create a project-wide graph for routine edits when none exists. Generate one when explicitly requested or when an architecture task warrants it, following the Graphify skill and excluding secrets, dependencies, and build output. Documentation-only changes do not require a graph update.
- Generated graph output is ignored by Git and should remain local unless explicitly requested otherwise.
