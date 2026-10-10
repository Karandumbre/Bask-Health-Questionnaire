# Working in Intake Studio

## Structure and reuse

- This is a Next.js App Router app using React, strict TypeScript, Tailwind v4, Supabase Auth, and Drizzle/PostgreSQL.
- Keep shared UI primitives in `src/components/ui/`. Reuse `Button`, `Input`, `Textarea`, `Select`, and `Dialog` before adding inline controls or copying Tailwind styles. Keep feature composition in `src/features/<feature>/components/`.
- Use native input props and refs. Associate labels with controls, give icon-only controls accessible names, and use the shared modal dialog for keyboard/focus behavior.
- Use `src/lib/http/api-client.ts` for browser API requests. Its shared Axios instance uses interceptors for headers and error normalization; retain AbortSignal cancellation and avoid automatic mutation retries. Validate responses with Zod; put feature-specific endpoint helpers in the feature's `client/` directory. Keep browser code separate from server-only services.
- Keep pure domain rules in `domain/`, persistence in `server/`, and React behavior in `hooks/` or context. Avoid combining network, persistence, and presentation in one component.
- The builder context composes editing state. `DraftAutosave` handles serialized revision-aware saves. Never mark newer edits saved when an older request completes, retry a conflict implicitly, or guess a successful revision.
- Keep reusable question factories and IDs in `src/features/forms/client/question-operations.ts`. Preserve published question and option IDs; regenerate IDs only when creating or duplicating fields.

## Authentication and persistence

- Use server-verified Supabase identity and shared workspace/form authorization helpers. Apply origin verification to browser mutation routes and serialize failures with `handleRouteError`.
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
- Graphify is available on the development machine. If `graphify-out/graph.json` exists, query it for architecture context and verify findings against current source. Generated graph output is ignored by Git; its absence does not prevent direct code inspection.
- Do not create or rebuild a project-wide graph merely for a small edit. Generate or refresh it when requested or when an architecture task warrants it, following the Graphify skill and excluding secrets, dependencies, and build output.
