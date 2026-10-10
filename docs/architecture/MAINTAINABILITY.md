# Maintenance boundaries

The application is a modular monolith. Feature services coordinate each use case; there is no global orchestrator.

- Routes authenticate callers, validate request bodies/query parameters, and serialize safe responses. Services own workspace/form authorization and transaction boundaries. Do not duplicate resource authorization queries in route handlers.
- `forms/context/builder-context.tsx` coordinates editing and selection. `use-draft-autosave` connects React to the serialized `DraftAutosave` controller. Pure question factories belong in `forms/domain/question-operations.ts`; condition eligibility and validation belong in `forms/domain/conditions.ts`.
- `FormCanvas` composes `EditorQuestionCard`, `QuestionInput`, and theme controls. `QuestionActions` owns shared reorder/duplicate/delete actions. `QuestionInput` uses native radio/checkbox semantics and explicit labels. `use-preview-answers` prunes hidden answers.
- `QuestionInspector` composes option, constraint, and condition editors. `FormDashboard` composes `FormRow` and `CreateFormDialog`; `use-form-dashboard` owns API mutations and pending state.
- Shared controls, labels, alerts, and modal behavior belong in `components/ui`. Clipboard state and timer cleanup belong in `lib/hooks/use-clipboard.ts`.
- Browser API calls use the shared Axios instance and Zod response schemas. Feature endpoint helpers belong in `features/<feature>/client`. Public Supabase configuration is shared while cookie adapters remain browser/server/proxy specific.
- `forms/server/form-lock.ts` defines form-before-draft lock order. Rename and autosave check the expected revision, increment it, and update the container in the same transaction. Publication serializes operation IDs and verifies form ownership before replaying a result.
- `patients/server/session-policy.ts` owns capability/expiry checks and session durations. No fallback session pepper is permitted. Failed recovery attempts commit before an authorization error is thrown; recovery expiry is enforced.
- Workspace provisioning is serialized per user in `workspaces/server/workspace-service.ts`, outside the authentication module.
- Theme schemas, presets, color calculations, audits, Shuffle, and CSS conversion have separate modules under `themes/domain`. `theme-tokens.ts` remains their public barrel. Legacy snapshots are normalized on read, without rewriting stored immutable versions.
- `scripts/lib/migration-engine.mjs` is the only migration implementation. The CLI and programmatic runner call it. `scripts/lib/load-env.mjs` uses Node 22's environment parser for both scripts and tests.

## Verification boundaries

Unit tests cover API errors, request validation, conditions, hidden-answer pruning, comparison details, themes, autosave, and session policy. PostgreSQL integration regressions cover rename versus stale saves, concurrent publication replay, cross-form operation reuse, and recovery counter persistence/expiry. Those integration tests require `IS_TEST_DATABASE=true` and a disposable database; they must not run against the application database.

Conflict resolution uses the last acknowledged autosave snapshot as the common base for a three-way merge. The controller advances that base only after a successful save or an explicit server reload, so in-flight local edits cannot become the base prematurely. The editor offers per-conflict choices before saving against the latest server revision. The separate comparison utility supports two-way summaries and optional base-aware deletion attribution.

Patient-facing pages/API routes and a responses UI remain pending features. This refactor does not establish a complete patient intake flow or a live-database end-to-end verification.
