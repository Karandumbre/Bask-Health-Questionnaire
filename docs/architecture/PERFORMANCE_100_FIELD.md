# 100-field intake performance verification

## Current evidence

The fixture lives in `tests/fixtures/100-field-fixture.ts`. The domain benchmark in `tests/unit/domain/100-field-benchmark.test.ts` checks visibility and pruning for 100 fields. It does not measure browser rendering, typing latency, first contentful paint, or CPU-throttled interaction.

Earlier Phase 3B documentation reported browser timings and a 35.6x typing improvement. No supporting raw performance trace was found in the repository during cleanup. Those results are not treated as reproducible evidence for the current source. The historical summary remains in `docs/PROGRESS.md`.

## Rendering limitation

`PatientQuestionField` uses `React.memo`, but `PatientIntakeView` supplies a new inline `onChange` callback for each field on every render. With the default shallow comparison, this changed prop prevents memoization from establishing that only the edited field renders. A browser profile is needed before claiming render isolation or an interaction speedup.

## Remaining verification

- Render the 100-field fixture in the patient interface with fictional answers.
- Record browser version, viewport, CPU throttling, network conditions, and source revision.
- Measure initial rendering, typing in the first and last fields, conditional visibility/pruning, and next-required scroll/focus.
- Capture field render counts and retain the raw trace with repeatable measurement steps.
- Compare any optimization against the same fixture and conditions before publishing timing or speedup claims.

The patient interface currently uses a continuous form, sticky progress navigation, and scoped theme variables. These are implementation choices; their browser performance remains to be measured.
