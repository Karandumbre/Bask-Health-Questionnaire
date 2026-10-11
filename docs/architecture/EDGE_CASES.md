# Concurrency, Integrity & Edge Cases

This document details critical race conditions, integrity hazards, and algorithmic resolution strategies for **Intake Studio**.

---

## 1. Administrative Authoring Races

### 1.1. Two Administrators Editing the Same Draft

- **Hazard:** Admin Alice opens Draft Revision 4. Admin Bob opens Draft Revision 4. Alice saves at $T_1$, advancing the database to Revision 5. Bob attempts to save at $T_2$ with local changes based on Revision 4.
- **Resolution Strategy:**
  1. Bob's request sends `{ expectedRevision: 4 }`.
  2. The server executes:
     ```sql
     UPDATE form_drafts
     SET definition_json = $1, revision = revision + 1, updated_at = NOW()
     WHERE id = $2 AND revision = 4
     RETURNING revision;
     ```
  3. The query returns 0 rows.
  4. The server responds with `HTTP 409 Conflict`, returning Bob's expected revision (4) and the server's current revision (5).
  5. **Client UX (`ConflictModal.tsx` & `three-way-merge.ts`):** Bob's UI pauses autosave, preserves Bob's dirty changes in memory, fetches Revision 5 from the server, and runs a deterministic **Three-Way Merge** against the last server-acknowledged base (Revision 4) using stable question and option IDs:
     - **Auto-Merge Disjoint Edits & Resolve Collisions:** Disjoint question/option edits are merged automatically; property, choice, or delete-vs-modify collisions are surfaced with explicit "Keep Local" vs "Use Server" choices and committed with `expectedRevision: 5`.
     - **Inspect & Copy Unsaved Changes** (JSON) to clipboard.
     - **Reload Server Revision** to accept Alice's changes or **Keep Mine & Overwrite** against Revision 5.

### 1.2. Stale Network Responses Overwriting Newer Edits

- **Hazard:** Admin Alice types "Chest Pain" (autosave request #1 dispatched). Alice immediately types "Severe Chest Pain" (autosave request #2 dispatched). Network latency causes request #2 to resolve at the server first, and request #1 resolves second.
- **Resolution Strategy:**
  - Client increments an internal monotonic sequence number (`clientMutationSeq`) per keystroke.
  - Autosaves are serialized via a promise queue or debounced worker.
  - Even if request #1 arrives late at the server, its `expectedRevision` will be stale compared to request #2, failing safely with a rejected CAS.
  - The client ignores incoming responses whose sequence number is older than the latest dispatched request.

### 1.3. Simultaneous Form Publish & Edit

- **Hazard:** Alice edits the draft while Bob triggers "Publish".
- **Resolution Strategy:**
  - `publishForm` begins an explicit PostgreSQL transaction:
    ```sql
    BEGIN;
    SELECT * FROM form_drafts WHERE form_id = $1 FOR UPDATE;
    -- Verify draft.revision == expectedRevision
    -- Validate form definition against strict publish rules
    -- Increment forms.latest_published_version_number
    -- Insert into published_versions
    COMMIT;
    ```
  - The row lock blocks concurrent draft updates until publication completes.
  - If Alice's edit committed right before Bob's publish, Bob's `expectedRevision` check fails, alerting Bob that the draft changed and must be re-reviewed before publishing.

### 1.4. Network Timeout on Publish (Idempotent Retry)

- **Hazard:** Bob clicks Publish. The server completes the transaction, but the network connection drops before Bob's browser receives the HTTP response. Bob clicks Publish again.
- **Resolution Strategy:**
  - Publish requests require a client-generated UUID `operationId`.
  - The database records successful publications in `publication_operations (operation_id, published_version_id)`.
  - When the retried request arrives with the same `operationId`, the server returns the previously created version record without allocating a duplicate version number (vN+1).

---

## 2. Dependency & Visibility Hazards

### 2.1. Parent Question Reordered After Child

- **Hazard:** Question 2 depends on Question 1. Admin reorders Question 1 to position 5.
- **Resolution Strategy:**
  - Draft autosave **permits** invalid drafts so work is never lost while rearranging.
  - The form inspector immediately flags Question 2 with an error badge: _"Depends on Question 1, which appears later in the form."_
  - `publishForm` executes pure validator `validateFormForPublish`. The publish transaction aborts with `HTTP 422 INVALID_FORM` specifying `{ questionId: "q2", error: "FORWARD_DEPENDENCY" }`.

### 2.2. Parent Question or Option Deleted

- **Hazard:** Question 2 depends on Option "opt-yes" of Question 1. Admin deletes Option "opt-yes" or Question 1.
- **Resolution Strategy:**
  - System retains Question 2's condition metadata pointing to `q1` / `opt-yes`.
  - The UI highlights the broken dependency in red: _"Condition references a deleted question/option. Click to repair."_
  - Conditions never silently retarget to the first remaining option.
  - Publish is blocked until the condition is either deleted or pointed to a valid parent.

### 2.3. Parent Changed from Yes -> No -> Yes (Answer Pruning)

- **Hazard:**
  1. Patient selects "Yes" to "Do you smoke?" (Q1).
  2. Patient enters "10 cigarettes per day" in dependent question (Q2).
  3. Patient changes Q1 to "No".
  4. Later, patient changes Q1 back to "Yes".
- **Resolution Strategy:**
  - The moment Q1 is changed to "No", Q2 becomes hidden.
  - **Pruning Invariant:** In both the client state and the server database progress record, `answers["q2"]` is immediately deleted upon Q1 becoming "No".
  - When the patient switches back to "Yes", Q2 re-appears completely blank. It does NOT resurrect the prior answer "10 cigarettes per day".

---

## 3. Patient Submission & Resume Hazards

### 3.1. Concurrent Duplicate Submissions (Double-Click / Retry)

- **Hazard:** Patient taps "Submit" twice rapidly on a mobile device, or a mobile network drops the connection after commit and retries automatically.
- **Resolution Strategy:**
  - The `submissions` table enforces `UNIQUE(session_id)`.
  - The submission endpoint acquires an exclusive lock:
    ```sql
    BEGIN;
    SELECT * FROM patient_sessions WHERE id = $1 FOR UPDATE;
    IF session.status = 'completed' THEN
        SELECT * FROM submissions WHERE session_id = $1;
        COMMIT;
        RETURN existing_submission;
    END IF;
    -- Validate and sanitize answers
    INSERT INTO submissions (id, session_id, published_version_id, answer_snapshot, submitted_at)
    VALUES (...);
    UPDATE patient_sessions SET status = 'completed', completed_at = NOW() WHERE id = $1;
    COMMIT;
    ```
  - Both requests return the identical submission ID and timestamp.

### 3.2. Malicious Client Injecting Hidden or Invalid Answers

- **Hazard:** An attacker intercepts the network request and injects answers for questions that were hidden, non-existent choice IDs, or strings exceeding maximum limits.
- **Resolution Strategy:**
  - The server evaluates `pruneHiddenAnswers(answers, pinnedVersion.questions)` before validation. Any answer for a question not currently visible is discarded.
  - The server executes `validateFinalSubmission` against the pinned snapshot:
    - Single-select values must exist in the question's option list.
    - Multi-select values must be an array of known option IDs with no duplicates.
    - Required text fields must contain non-whitespace characters (`value.trim().length > 0`).
    - Required checkboxes must be boolean `true`.
    - Numbers must be finite, valid numbers matching integer/bounds constraints.
  - Any violation immediately rejects the submission with `HTTP 422 INVALID_ANSWER`.

### 3.3. Two Patient Tabs Saving Stale Answers

- **Hazard:** Patient opens the intake on their phone in two tabs. Tab A answers Q1. Tab B (opened earlier) answers Q2 and autosaves.
- **Resolution Strategy:**
  - Patient progress saves enforce monotonic `expectedSessionRevision`.
  - Tab B's save fails with `HTTP 409 Conflict`, prompting the user to refresh the latest saved progress rather than silently overwriting Tab A's answers.
