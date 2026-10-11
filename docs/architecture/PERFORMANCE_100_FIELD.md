# 100-Field Intake Performance

**Status: browser performance trace pending.**

## Current implementation

- `tests/fixtures/100-field-fixture.ts` generates 100 synthetic questions across 20 sections. Each section has a required single-select parent, three conditional children, and an unconditional consent checkbox.
- `PatientQuestionField` uses `React.memo`. `PatientIntakeView` passes the stable `onAnswerChange` callback; each field binds its question ID with `useCallback`. Unchanged props permit React to skip sibling renders, but visibility, index, validation, or disabled-state changes can still cause additional renders.
- The patient form remains a continuous document, with a sticky progress indicator and jump-to-required navigation. This supports keyboard navigation, browser search, and focus on off-screen fields without virtualization.
- Scoped theme CSS variables are applied to the builder and patient view. No rendering or theme-switch timing is claimed without measurement.

## Administrator loading and editing

- The forms dashboard uses an in-memory browser cache scoped to the server-verified user and workspace. Lists remain fresh for 30 seconds; stale lists appear while revalidating. Refresh requests only the existing forms API and retains rows on network failure. Successful create, rename, delete, draft save, publication, and logout clear the cache. Aborted or invalidated requests cannot repopulate it.
- The dashboard page verifies identity and resolves workspace metadata before mounting the client dashboard. The forms query runs through the API on a cache miss, so a cold visit still needs an additional authenticated request. No first-load latency improvement is claimed without a trace.
- Dashboard and editor loading fallbacks show fixed branding, navigation, actions, and panel headings. Unknown form titles, counts, question content, and workspace metadata still wait for data. Actions that require data remain disabled in the fallback.
- Existing workspace lookups use a read without a provisioning lock. First-time provisioning retains the transaction, advisory lock, and membership recheck.
- `EditorQuestionCard` receives question, selected-state, and stable selection props instead of subscribing to the whole builder context. It uses `React.memo`; unchanged question objects remain stable. The selected card's actions still consume the builder context.

A local Chromium check with synthetic data, production React, generated production CSS, and mocked navigation/API verified cache reuse across dashboard remounts, explicit refresh, retained rows on refresh failure, 390 × 844 dashboard/loading-shell layout, and the 1440 × 900 editor layout. Instrumented rendering of 100 cards showed that changing one question label rerendered only its card. These checks do not measure real server latency or replace the required performance trace. The unchanged create-form dialog received focus and closed with Escape, but did not restore focus to its trigger; that separate issue remains open.

## Domain benchmark

`tests/unit/domain/100-field-benchmark.test.ts` verifies that the fixture contains 100 fields, passes publication validation, and correctly prunes hidden answers. It asserts that visibility and pruning each finish within 10 ms in the test process. It does not measure browser typing, paint, editing latency, or publish-validation duration.

```sh
npm run test:unit -- tests/unit/domain/100-field-benchmark.test.ts
```

## Required browser trace

Use synthetic data and a production build. Load the 100-field fixture into a dedicated demo or disposable test environment; the repository does not currently provide a fixture-import UI or standalone seed command.

1. Record the exact commit, browser/version, operating system, viewport, device pixel ratio, and CPU/network settings. Suggested comparison profiles are desktop at 1440 × 900 with no CPU throttle and mobile at 390 × 844 with 4× CPU slowdown. These are proposed conditions, not completed measurements.
2. Capture a Chrome DevTools Performance recording while typing in the first and last text fields, changing a conditional parent, and editing a question in the administrator builder. Measure interactions separately and identify the relevant events in the saved trace.
3. Repeat the same scripted interaction several times, report observed durations and variability, and export the trace with a clearly named commit/profile identifier. Keep answers and resume credentials out of shared captures.
4. For a measured optimization, compare a baseline and current implementation under the same conditions. Explain exactly what changed. Alternatively, use the trace to justify why further optimization is unnecessary.
5. Link the trace from this document and the README. Include the measured interactions, results, and comparison conditions.

## Results to complete

| Measurement                                      | Status                        |
| ------------------------------------------------ | ----------------------------- |
| Domain fixture, validation, and pruning behavior | Covered by the unit benchmark |
| Browser typing, editing, and visibility trace    | Pending                       |
| Device/browser conditions and commit             | Pending                       |
| Measured improvement or decision not to optimize | Pending                       |

Virtualization is currently omitted to preserve full-document navigation and accessibility. Whether further optimization is needed remains a measurement question.
