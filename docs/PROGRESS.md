# Intake Studio — Implementation Status

## Implemented

- Administrator login with Supabase Auth and workspace-scoped authorization.
- Draft creation, renaming, deletion, question editing, preview, and revision-aware autosave.
- Six question types with validation, stable IDs, and conditional visibility.
- Three-way draft reconciliation with explicit conflict resolution.
- Immutable publication snapshots and version-specific public intake URLs.
- Database-backed patient progress, cross-browser recovery, and idempotent submission.
- Response lists and details using the submitted version's question and option labels.
- Shared UI controls, design tokens, theme presets, Shuffle palettes, and light/dark modes.
- Unit, database integration, and browser test suites; CI validation and migration workflows.

See the [README](../README.md) for setup and test commands, the [architecture documents](architecture/README.md) for implementation details, and the [checklist](../CHECKLIST.md) for acceptance criteria.

## Remaining work

- Deploy the application with a separate hosted Supabase database and Auth project.
- Configure GitHub Actions test-project secrets, including `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and run CI.
- Check the hosted administrator and patient flows, workspace isolation, cookies, and database transport settings.
- Capture the [100-field browser performance trace](architecture/PERFORMANCE_100_FIELD.md).
- Add the live application and published intake URLs to the README.
- Confirm repository privacy, invite reviewers, and share a working reviewer login privately.
- Record the demonstration video, including a failure and recovery case.
- Collect the required redacted AI logs and describe one changed or rejected suggestion.

## Security follow-up

Login rate limiting remains pending. Before handling real patient data, review database privileges, provider agreements, access auditing, retention and deletion, key rotation, and incident response. Session expiry does not delete stored answers.
