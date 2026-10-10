# Comprehensive Testing & Verification Plan

This document establishes the testing strategy for **Intake Studio**, spanning pure domain unit tests, PostgreSQL concurrency integration tests, and Playwright end-to-end (E2E) flows.

---

## 1. Test Architecture Overview

```
                                    ┌──────────────────────────────┐
                                    │    Playwright E2E Suite      │
                                    │  - Desktop Admin Builder     │
                                    │  - Mobile Patient Intake     │
                                    │  - Cross-Browser Resume      │
                                    └──────────────┬───────────────┘
                                                   │
                                    ┌──────────────┴───────────────┐
                                    │  Database Integration Suite  │
                                    │  - CAS Revision Collisions   │
                                    │  - Row Locking Submissions   │
                                    │  - Immutability DB Triggers  │
                                    └──────────────┬───────────────┘
                                                   │
                                    ┌──────────────┴───────────────┐
                                    │      Vitest Unit Suite       │
                                    │  - Schema & Type Unions      │
                                    │  - Visibility & Pruning      │
                                    │  - Server-Authoritative Valid│
                                    │  - 100-Field Benchmark       │
                                    └──────────────────────────────┘
```

---

## 2. Unit Testing Suite (Vitest)

### Executed & Verified:

1. **Form Publish Rules (`tests/unit/domain/form-validation.test.ts`):**
   - Blank form title rejection.
   - Zero-question form rejection.
   - Blank question label rejection.
   - Duplicate question ID detection.
   - Text length boundary validity ($min \le max$).
   - Number range boundary validity ($min \le max$, integer checks).
   - Minimum choice requirements ($\ge 2$ distinct choices, non-blank labels, unique normalized names).
   - Missing parent question references.
   - Forward references (parent located after child in questions array).
   - Optional parent rejection (parent MUST be required).
   - Nested conditions rejection (parent MUST be unconditional).
   - Happy path: fully compliant form acceptance.

2. **Patient Visibility & Hidden Answer Pruning (`tests/unit/domain/patient-visibility.test.ts`):**
   - Visibility evaluation for unconditional vs conditional questions.
   - Active pruning: when parent switches from _Yes_ to _No_, dependent answers are removed immediately.
   - Prevention of state resurrection: changing back from _No_ to _Yes_ leaves dependent question blank.
   - Dropping unknown/injected questions.

3. **Server-Side Validation (`tests/unit/domain/patient-validation.test.ts`):**
   - Whitespace-only required text trimmed and rejected.
   - Minimum length violations.
   - Number bounds: decimals in integer-only fields, out-of-bounds numbers.
   - Required checkboxes: `false` strictly rejected.
   - Single-select: unknown option IDs rejected.
   - Multi-select: duplicate IDs rejected; unknown IDs rejected.
   - Malicious injection of hidden fields: pruned on server and omitted from submission snapshot.
   - In-progress autosave: permissive saving for incomplete fields, strict type safety.

4. **Cryptographic Credentials (`tests/unit/security/credentials.test.ts`):**
   - Session reference format generation (`BKS-XXXX-XXXX`).
   - High-entropy recovery code format (`BK-XXXX-XXXX-XXXX-XXXX`, Crockford Base-32).
   - Normalization and whitespace stripping.
   - HMAC-SHA256 hashing with application pepper.
   - Constant-time comparison (`timingSafeEqual`).
   - Rejection of tampered codes or mismatched pepper.

5. **100-Field Fixture & Latency Benchmark (`tests/unit/domain/100-field-benchmark.test.ts`):**
   - Generates compliant 100-field clinical form.
   - Verifies publish validation passes across all 100 fields.
   - Measures visibility calculation and pruning latency ($< 5\text{ms}$).

---

## 3. Database Concurrency Integration Test Plan (PostgreSQL)

_Note: Execution requires live PostgreSQL connection string (`DATABASE_URL`)._

### 3.1. Optimistic Concurrency CAS Test

- **Scenario:** Two worker threads attempt to update `form_drafts` with the same `expectedRevision = 5`.
- **Expected Outcome:** Exactly one worker succeeds, incrementing `revision = 6`. The other receives row count 0 and returns `HTTP 409 REVISION_CONFLICT`.

### 3.2. Idempotent Transactional Publish

- **Scenario:** Two simultaneous calls to `publishForm` with identical `operationId`.
- **Expected Outcome:** One worker executes the publish transaction; the second worker reads `publication_operations` and returns the identical `published_version_id` without creating version $N+1$.

### 3.3. Database Immutability Triggers

- **Scenario:** Direct SQL execution:
  ```sql
  UPDATE published_versions SET public_slug = 'hacked' WHERE id = '...';
  DELETE FROM submissions WHERE id = '...';
  ```
- **Expected Outcome:** PostgreSQL aborts the transaction with trigger exception: `"Table ... is immutable. UPDATE and DELETE operations are forbidden."`

### 3.4. Exactly-Once Submission Under Parallel Load

- **Scenario:** 5 concurrent HTTP requests fire `submitPatientSession` with the same session token.
- **Expected Outcome:** The first request acquires `SELECT ... FOR UPDATE`, completes the session, and writes to `submissions`. The remaining 4 requests wait on the row lock, discover `status = 'completed'`, and return the existing submission record. Exactly 1 row exists in `submissions`.

---

## 4. Playwright End-to-End (E2E) Test Plan

### Test Scenarios:

1. **Admin Authoring Lifecycle:**
   - Log in with Supabase reviewer credentials.
   - Create new form -> Rename form -> Add Short Text, Number, Single-Select, Multi-Select, Checkbox.
   - Reorder questions using keyboard accessibility (`Move Up` / `Move Down`).
   - Duplicate question and verify regenerated IDs.
   - Trigger autosave, verify "Saved" status pill.
   - Reload browser; verify dirty state was persisted from PostgreSQL.

2. **Dependency Integrity & Publish Gate:**
   - Add condition on Question 3 pointing to Question 1.
   - Move Question 1 after Question 3.
   - Attempt to publish; verify publish is blocked and UI shows navigation link to the invalid question.
   - Move Question 1 back before Question 3.
   - Publish v1; verify generation of unique public intake URL.

3. **Patient Mobile Intake & Visibility Pruning:**
   - Set viewport to mobile ($375 \times 812$).
   - Load public version URL.
   - Verify modal/screen displays one-time recovery code (`BK-XXXX-XXXX-XXXX-XXXX`).
   - Answer parent question _Yes_ -> Fill dependent details -> Navigate back -> Change parent to _No_.
   - Submit form -> Check admin response detail: dependent question is recorded as blank/omitted.

4. **Cross-Browser Session Resumption:**
   - Patient starts intake on Browser Context A, answers 3 questions, copies recovery code.
   - Open Browser Context B (clean cookies/cache).
   - Navigate to `/intake/resume`, input session reference and recovery code.
   - Verify previously answered 3 questions are restored.
   - Complete intake in Browser B.

5. **Historical Snapshot Stability (v1 vs v2):**
   - Admin opens draft, edits question labels, adds new questions, publishes v2.
   - Patient in existing v1 session refreshes page.
   - Verify patient remains on v1 with original question labels, options, and theme tokens.
   - Admin response explorer displays original v1 labels for v1 submissions.

---

## 5. 100-Field Fixture Benchmark Plan

- **Fixture:** 100 questions organized across 20 clinical categories (see `tests/fixtures/100-field-fixture.ts`).
- **Telemetry Targets:**
  - Client keystroke latency (INP equivalent): $< 50\text{ms}$.
  - Visibility evaluation and hidden-answer pruning: $< 10\text{ms}$.
  - Autosave payload size: $< 150\text{KB}$ uncompressed.
  - Server validation time: $< 25\text{ms}$.
- **Profiling Setup:** Chrome Performance Profiler in Next.js production build (`npm run build && npm run start`) with 4x CPU throttling.
