import { THEME_PRESET_OCEAN } from "@/features/themes/domain/theme-tokens";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db, getDirectClient } from "@/lib/db";
import {
  workspaces,
  adminMemberships,
  forms,
  formDrafts,
  publishedVersions,
  patientSessions,
  submissions,
} from "@/lib/db/schema";
import {
  createForm,
  renameForm,
  updateDraft,
  archiveForm,
  deleteUnpublishedForm,
} from "@/features/forms/server/draft-service";
import { publishForm } from "@/features/forms/server/publish-service";
import {
  listFormSubmissions,
  getSubmissionDetail,
} from "@/features/forms/server/response-service";
import {
  createPatientSession,
  resumePatientSession,
  savePatientProgress,
} from "@/features/patients/server/session-service";
import { submitPatientSession } from "@/features/patients/server/submission-service";
import { FormDefinition } from "@/features/forms/domain/types";
import { AppError } from "@/lib/errors";

describe("PostgreSQL Integration & Concurrency Verification", () => {
  // Test isolation context
  const testWorkspaceId = crypto.randomUUID();
  const ownerUserId = crypto.randomUUID();
  const editorUserId1 = crypto.randomUUID();
  const editorUserId2 = crypto.randomUUID();
  const unauthorizedUserId = crypto.randomUUID();

  // Test form definition with conditional logic
  const testFormDefinition: FormDefinition = {
    schemaVersion: 1,
    title: "Clinical Screening Intake",
    description: "Postgres integration test form",
    questions: [
      {
        id: "q-conditions",
        type: "single_select",
        label: "Do you have any pre-existing conditions?",
        required: true,
        visibility: null,
        options: [
          { id: "opt-yes", label: "Yes" },
          { id: "opt-no", label: "No" },
        ],
      },
      {
        id: "q-condition-details",
        type: "short_text",
        label: "Please specify your pre-existing conditions",
        required: true,
        visibility: {
          parentQuestionId: "q-conditions",
          equalsOptionId: "opt-yes",
        },
      },
      {
        id: "q-age",
        type: "number",
        label: "Patient Age",
        required: true,
        visibility: null,
        validation: {
          min: 0,
          max: 120,
          integerOnly: true,
        },
      },
    ],
  };

  const defaultTheme = THEME_PRESET_OCEAN;

  let initialized = false;
  beforeAll(async () => {
    if (process.env.IS_TEST_DATABASE !== "true")
      throw new Error(
        "Integration tests require IS_TEST_DATABASE=true and a disposable database.",
      );
    // Production safety check: Prevent tests from ever running against production
    if (
      process.env.NODE_ENV === "production" ||
      process.env.APP_ENV === "production" ||
      process.env.VERCEL_ENV === "production"
    ) {
      throw new Error(
        "CRITICAL SAFETY ABORT: Integration tests are forbidden from executing against a production environment!",
      );
    }

    // 1. Create isolated test workspace
    await db.insert(workspaces).values({
      id: testWorkspaceId,
      name: "Integration Test Clinic",
    });

    // 2. Assign memberships
    await db.insert(adminMemberships).values([
      {
        workspaceId: testWorkspaceId,
        userId: ownerUserId,
        role: "owner",
      },
      {
        workspaceId: testWorkspaceId,
        userId: editorUserId1,
        role: "editor",
      },
      {
        workspaceId: testWorkspaceId,
        userId: editorUserId2,
        role: "editor",
      },
    ]);
    initialized = true;
  });

  afterAll(async () => {
    if (!initialized) return;
    // Clean up test data safely using direct client to handle triggers
    const directSql = getDirectClient();
    try {
      // Disable triggers temporarily for test teardown of test workspace records
      await directSql`ALTER TABLE "published_versions" DISABLE TRIGGER "trg_protect_published_versions";`;
      await directSql`ALTER TABLE "submissions" DISABLE TRIGGER "trg_protect_submissions";`;

      await directSql`
        DELETE FROM "submissions" WHERE "published_version_id" IN (
          SELECT pv.id FROM "published_versions" pv
          JOIN "forms" f ON pv.form_id = f.id
          WHERE f.workspace_id = ${testWorkspaceId}
        );
      `;
      await directSql`
        DELETE FROM "patient_sessions" WHERE "published_version_id" IN (
          SELECT pv.id FROM "published_versions" pv
          JOIN "forms" f ON pv.form_id = f.id
          WHERE f.workspace_id = ${testWorkspaceId}
        );
      `;
      await directSql`
        DELETE FROM "publication_operations" WHERE "form_id" IN (
          SELECT id FROM "forms" WHERE workspace_id = ${testWorkspaceId}
        );
      `;
      await directSql`
        DELETE FROM "published_versions" WHERE "form_id" IN (
          SELECT id FROM "forms" WHERE workspace_id = ${testWorkspaceId}
        );
      `;
      await directSql`
        DELETE FROM "form_drafts" WHERE "form_id" IN (
          SELECT id FROM "forms" WHERE workspace_id = ${testWorkspaceId}
        );
      `;
      await directSql`
        DELETE FROM "audit_events" WHERE "workspace_id" = ${testWorkspaceId};
      `;
      await directSql`
        DELETE FROM "forms" WHERE "workspace_id" = ${testWorkspaceId};
      `;
      await directSql`
        DELETE FROM "admin_memberships" WHERE "workspace_id" = ${testWorkspaceId};
      `;
      await directSql`
        DELETE FROM "workspaces" WHERE "id" = ${testWorkspaceId};
      `;
    } catch (err) {
      console.error("Test teardown notice:", err);
    } finally {
      await directSql`ALTER TABLE "published_versions" ENABLE TRIGGER "trg_protect_published_versions";`;
      await directSql`ALTER TABLE "submissions" ENABLE TRIGGER "trg_protect_submissions";`;
      await directSql.end();
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Concurrent admin draft updates (CAS win/lose)
  // ---------------------------------------------------------------------------
  it("1. handles concurrent admin draft updates with Compare-and-Swap (no silent overwrite)", async () => {
    const { form } = await createForm({
      workspaceId: testWorkspaceId,
      name: "Concurrent Test Form",
      userId: editorUserId1,
      initialDefinition: testFormDefinition,
    });

    const update1 = updateDraft({
      formId: form.id,
      expectedRevision: 0,
      definition: { ...testFormDefinition, title: "Title by Admin 1" },
      theme: defaultTheme,
      userId: editorUserId1,
    });

    const update2 = updateDraft({
      formId: form.id,
      expectedRevision: 0,
      definition: { ...testFormDefinition, title: "Title by Admin 2" },
      theme: defaultTheme,
      userId: editorUserId2,
    });

    const results = await Promise.allSettled([update1, update2]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Exactly one update must win; the other must fail with HTTP 409 conflict
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const error = (rejected[0] as PromiseRejectedResult).reason as AppError;
    expect(error.code).toBe("REVISION_CONFLICT");
    expect(error.status).toBe(409);

    // Draft revision in DB must be exactly 1
    const [draft] = await db
      .select()
      .from(formDrafts)
      .where(eq(formDrafts.formId, form.id));
    expect(draft?.revision).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // 2. Stale expectedRevision rejection
  // ---------------------------------------------------------------------------
  it("2. rejects draft updates with stale expectedRevision", async () => {
    const { form } = await createForm({
      workspaceId: testWorkspaceId,
      name: "Stale Revision Form",
      userId: editorUserId1,
      initialDefinition: testFormDefinition,
    });

    // Advance revision from 0 to 1
    await updateDraft({
      formId: form.id,
      expectedRevision: 0,
      definition: { ...testFormDefinition, title: "Updated Once" },
      theme: defaultTheme,
      userId: editorUserId1,
    });

    // Attempt update with stale expectedRevision = 0
    await expect(
      updateDraft({
        formId: form.id,
        expectedRevision: 0,
        definition: { ...testFormDefinition, title: "Stale Overwrite" },
        theme: defaultTheme,
        userId: editorUserId1,
      }),
    ).rejects.toThrowError(AppError);

    // Verify current revision is still 1
    const [draft] = await db
      .select()
      .from(formDrafts)
      .where(eq(formDrafts.formId, form.id));
    expect(draft?.revision).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // 3. Concurrent publishing
  // ---------------------------------------------------------------------------
  it("3. serializes concurrent publish requests using row locking and rejects stale attempts", async () => {
    const { form } = await createForm({
      workspaceId: testWorkspaceId,
      name: "Concurrent Publish Form",
      userId: editorUserId1,
      initialDefinition: testFormDefinition,
    });

    const op1 = crypto.randomUUID();
    const op2 = crypto.randomUUID();

    const publishPromise1 = publishForm({
      formId: form.id,
      expectedRevision: 0,
      operationId: op1,
      userId: editorUserId1,
    });

    const publishPromise2 = publishForm({
      formId: form.id,
      expectedRevision: 0,
      operationId: op2,
      userId: editorUserId2,
    });

    const results = await Promise.allSettled([
      publishPromise1,
      publishPromise2,
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Exactly one publish must succeed; the concurrent one is rejected as stale revision
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    const err = (rejected[0] as PromiseRejectedResult).reason as AppError;
    expect(err.code).toBe("PUBLISH_CONFLICT");

    // Published versions must not contain duplicate version numbers
    const versions = await db
      .select()
      .from(publishedVersions)
      .where(eq(publishedVersions.formId, form.id));
    expect(versions.length).toBe(1);
    expect(versions[0]?.versionNumber).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // 4. Publication idempotency
  // ---------------------------------------------------------------------------
  it("4. returns identical published version idempotently when called with same operationId", async () => {
    const { form } = await createForm({
      workspaceId: testWorkspaceId,
      name: "Idempotent Publish Form",
      userId: editorUserId1,
      initialDefinition: testFormDefinition,
    });

    const operationId = crypto.randomUUID();

    const result1 = await publishForm({
      formId: form.id,
      expectedRevision: 0,
      operationId,
      userId: editorUserId1,
    });
    expect(result1.isIdempotentReplay).toBe(false);

    // Repeat publish with identical operationId
    const result2 = await publishForm({
      formId: form.id,
      expectedRevision: 0,
      operationId,
      userId: editorUserId1,
    });
    expect(result2.isIdempotentReplay).toBe(true);
    expect(result2.publishedVersionId).toBe(result1.publishedVersionId);
    expect(result2.versionNumber).toBe(result1.versionNumber);
    expect(result2.publicSlug).toBe(result1.publicSlug);

    // Verify only 1 version was created
    const versions = await db
      .select()
      .from(publishedVersions)
      .where(eq(publishedVersions.formId, form.id));
    expect(versions.length).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // 5. Published version immutability (PostgreSQL Triggers)
  // ---------------------------------------------------------------------------
  it("5. enforces database-level immutability on published_versions via triggers", async () => {
    const { form } = await createForm({
      workspaceId: testWorkspaceId,
      name: "Immutability Test Form",
      userId: editorUserId1,
      initialDefinition: testFormDefinition,
    });

    const pub = await publishForm({
      formId: form.id,
      expectedRevision: 0,
      operationId: crypto.randomUUID(),
      userId: editorUserId1,
    });

    // Attempt direct SQL UPDATE on published_versions
    let updateError: Error | null = null;
    try {
      await db
        .update(publishedVersions)
        .set({ publicSlug: "malicious-slug-change" })
        .where(eq(publishedVersions.id, pub.publishedVersionId));
    } catch (e) {
      updateError = e as Error;
    }
    expect(updateError).not.toBeNull();
    const updateMsg = `${updateError?.message} ${(updateError as { cause?: Error })?.cause?.message || ""}`;
    expect(updateMsg).toMatch(/immutable/i);

    // Attempt direct SQL DELETE on published_versions
    let deleteError: Error | null = null;
    try {
      await db
        .delete(publishedVersions)
        .where(eq(publishedVersions.id, pub.publishedVersionId));
    } catch (e) {
      deleteError = e as Error;
    }
    expect(deleteError).not.toBeNull();
    const deleteMsg = `${deleteError?.message} ${(deleteError as { cause?: Error })?.cause?.message || ""}`;
    expect(deleteMsg).toMatch(/immutable/i);
  });

  // ---------------------------------------------------------------------------
  // 6. Historical snapshot preservation
  // ---------------------------------------------------------------------------
  it("6. preserves historical published snapshots when working draft is subsequently modified", async () => {
    const { form } = await createForm({
      workspaceId: testWorkspaceId,
      name: "Snapshot Preservation Form",
      userId: editorUserId1,
      initialDefinition: testFormDefinition,
    });

    const pub = await publishForm({
      formId: form.id,
      expectedRevision: 0,
      operationId: crypto.randomUUID(),
      userId: editorUserId1,
    });

    // Admin updates the draft significantly (e.g. removes questions, updates title)
    const modifiedDefinition: FormDefinition = {
      schemaVersion: 1,
      title: "Completely Changed Draft Title",
      description: "Draft was heavily edited post-publish",
      questions: [
        {
          id: "q-new",
          type: "short_text",
          label: "New Question Only",
          required: false,
          visibility: null,
        },
      ],
    };

    await updateDraft({
      formId: form.id,
      expectedRevision: 1,
      definition: modifiedDefinition,
      theme: defaultTheme,
      userId: editorUserId1,
    });

    // Query published version: snapshot must remain 100% identical to original
    const [pubRecord] = await db
      .select()
      .from(publishedVersions)
      .where(eq(publishedVersions.id, pub.publishedVersionId));

    const snapshot = pubRecord?.definitionSnapshot as FormDefinition;
    expect(snapshot.title).toBe("Clinical Screening Intake");
    expect(snapshot.questions.length).toBe(3);
    expect(snapshot.questions[0]?.id).toBe("q-conditions");
  });

  // ---------------------------------------------------------------------------
  // 7. Unauthorized workspace access rejection
  // ---------------------------------------------------------------------------
  it("7. rejects unauthorized users from modifying drafts or publishing", async () => {
    const { form } = await createForm({
      workspaceId: testWorkspaceId,
      name: "Auth Guard Form",
      userId: editorUserId1,
      initialDefinition: testFormDefinition,
    });

    // User without workspace membership attempts update
    await expect(
      updateDraft({
        formId: form.id,
        expectedRevision: 0,
        definition: testFormDefinition,
        theme: defaultTheme,
        userId: unauthorizedUserId,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });

    // User without workspace membership attempts publish
    await expect(
      publishForm({
        formId: form.id,
        expectedRevision: 0,
        operationId: crypto.randomUUID(),
        userId: unauthorizedUserId,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Unauthorized patient session access rejection
  // ---------------------------------------------------------------------------
  it("8. rejects patient progress save and submit when using invalid credentials", async () => {
    const { form } = await createForm({
      workspaceId: testWorkspaceId,
      name: "Patient Auth Form",
      userId: editorUserId1,
      initialDefinition: testFormDefinition,
    });

    const pub = await publishForm({
      formId: form.id,
      expectedRevision: 0,
      operationId: crypto.randomUUID(),
      userId: editorUserId1,
    });

    const session = await createPatientSession({ publicSlug: pub.publicSlug });

    // Bogus capability token
    await expect(
      savePatientProgress({
        sessionId: session.sessionId,
        capabilityToken: "forged-invalid-capability-token-hex",
        expectedSessionRevision: 0,
        answers: { "q-conditions": "opt-no" },
      }),
    ).rejects.toMatchObject({
      code: "SESSION_UNAUTHORIZED",
      status: 401,
    });

    // Bogus capability token on submit
    await expect(
      submitPatientSession({
        sessionId: session.sessionId,
        capabilityToken: "forged-invalid-capability-token-hex",
        answers: { "q-conditions": "opt-no", "q-age": 30 },
      }),
    ).rejects.toMatchObject({
      code: "SESSION_UNAUTHORIZED",
      status: 401,
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Concurrent recovery-code redemption
  // ---------------------------------------------------------------------------
  it("9. rotates recovery code atomically during concurrent cross-browser redemption", async () => {
    const { form } = await createForm({
      workspaceId: testWorkspaceId,
      name: "Recovery Concurrency Form",
      userId: editorUserId1,
      initialDefinition: testFormDefinition,
    });

    const pub = await publishForm({
      formId: form.id,
      expectedRevision: 0,
      operationId: crypto.randomUUID(),
      userId: editorUserId1,
    });

    const session = await createPatientSession({ publicSlug: pub.publicSlug });

    // Two concurrent resume requests with the original recovery code
    const resume1 = resumePatientSession({
      sessionReference: session.sessionReference,
      recoveryCode: session.recoveryCode,
    });

    const resume2 = resumePatientSession({
      sessionReference: session.sessionReference,
      recoveryCode: session.recoveryCode,
    });

    const results = await Promise.allSettled([resume1, resume2]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Exactly one redemption should succeed
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // The winner received a rotated recovery code
    const winnerResult = (
      fulfilled[0] as PromiseFulfilledResult<Awaited<typeof resume1>>
    ).value;
    expect(winnerResult.newRecoveryCode).not.toBe(session.recoveryCode);

    // Old code is now permanently rejected
    await expect(
      resumePatientSession({
        sessionReference: session.sessionReference,
        recoveryCode: session.recoveryCode,
      }),
    ).rejects.toThrowError(AppError);
  });

  // ---------------------------------------------------------------------------
  // 10. Server-side hidden-answer pruning
  // ---------------------------------------------------------------------------
  it("10. automatically prunes hidden conditional answers on progress save and submission", async () => {
    const { form } = await createForm({
      workspaceId: testWorkspaceId,
      name: "Pruning Form",
      userId: editorUserId1,
      initialDefinition: testFormDefinition,
    });

    const pub = await publishForm({
      formId: form.id,
      expectedRevision: 0,
      operationId: crypto.randomUUID(),
      userId: editorUserId1,
    });

    const session = await createPatientSession({ publicSlug: pub.publicSlug });

    // Step 1: Patient answers Q1 = "yes" and supplies detail for Q2
    await savePatientProgress({
      sessionId: session.sessionId,
      capabilityToken: session.capabilityToken,
      expectedSessionRevision: 0,
      answers: {
        "q-conditions": "opt-yes",
        "q-condition-details": "Asthma and Hypertension",
        "q-age": 42,
      },
    });

    const [sessionAfterYes] = await db
      .select()
      .from(patientSessions)
      .where(eq(patientSessions.id, session.sessionId));
    const answers1 = sessionAfterYes?.answerJson as Record<string, unknown>;
    expect(answers1["q-condition-details"]).toBe("Asthma and Hypertension");

    // Step 2: Patient changes Q1 = "no". Q2 is now hidden!
    await savePatientProgress({
      sessionId: session.sessionId,
      capabilityToken: session.capabilityToken,
      expectedSessionRevision: 1,
      answers: {
        "q-conditions": "opt-no",
        "q-condition-details": "Asthma and Hypertension", // Sent by client, but now hidden
        "q-age": 42,
      },
    });

    const [sessionAfterNo] = await db
      .select()
      .from(patientSessions)
      .where(eq(patientSessions.id, session.sessionId));
    const answers2 = sessionAfterNo?.answerJson as Record<string, unknown>;

    // Invariant: hidden answer must be stripped server-side
    expect(answers2["q-conditions"]).toBe("opt-no");
    expect(answers2["q-condition-details"]).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // 11. Concurrent duplicate submissions (Row locking serialization)
  // ---------------------------------------------------------------------------
  it("11. prevents duplicate submissions under concurrent double-click races using row locks", async () => {
    const { form } = await createForm({
      workspaceId: testWorkspaceId,
      name: "Duplicate Submit Race Form",
      userId: editorUserId1,
      initialDefinition: testFormDefinition,
    });

    const pub = await publishForm({
      formId: form.id,
      expectedRevision: 0,
      operationId: crypto.randomUUID(),
      userId: editorUserId1,
    });

    const session = await createPatientSession({ publicSlug: pub.publicSlug });

    const validAnswers = {
      "q-conditions": "opt-no",
      "q-age": 35,
    };

    // Simulate immediate concurrent double-click
    const submit1 = submitPatientSession({
      sessionId: session.sessionId,
      capabilityToken: session.capabilityToken,
      answers: validAnswers,
    });

    const submit2 = submitPatientSession({
      sessionId: session.sessionId,
      capabilityToken: session.capabilityToken,
      answers: validAnswers,
    });

    const results = await Promise.all([submit1, submit2]);

    // Both requests must complete successfully
    expect(results[0]?.status).toBe("completed");
    expect(results[1]?.status).toBe("completed");

    // Exactly one submission row exists in submissions table
    const subs = await db
      .select()
      .from(submissions)
      .where(eq(submissions.sessionId, session.sessionId));
    expect(subs.length).toBe(1);

    // One result is the initial commit, the other is an idempotent replay
    const replayFlags = results.map((r) => r.isIdempotentReplay).sort();
    expect(replayFlags).toEqual([false, true]);
  });

  // ---------------------------------------------------------------------------
  // 12. Submission retry after successful commit
  // ---------------------------------------------------------------------------
  it("12. handles submission retry after successful commit as an idempotent replay", async () => {
    const { form } = await createForm({
      workspaceId: testWorkspaceId,
      name: "Retry Submit Form",
      userId: editorUserId1,
      initialDefinition: testFormDefinition,
    });

    const pub = await publishForm({
      formId: form.id,
      expectedRevision: 0,
      operationId: crypto.randomUUID(),
      userId: editorUserId1,
    });

    const session = await createPatientSession({ publicSlug: pub.publicSlug });

    const validAnswers = {
      "q-conditions": "opt-no",
      "q-age": 28,
    };

    // First submit
    const res1 = await submitPatientSession({
      sessionId: session.sessionId,
      capabilityToken: session.capabilityToken,
      answers: validAnswers,
    });
    expect(res1.isIdempotentReplay).toBe(false);

    // Repeated submit (e.g. network retry / browser refresh)
    const res2 = await submitPatientSession({
      sessionId: session.sessionId,
      capabilityToken: session.capabilityToken,
      answers: validAnswers,
    });
    expect(res2.isIdempotentReplay).toBe(true);
    expect(res2.submissionId).toBe(res1.submissionId);
    expect(res2.submittedAt.toISOString()).toBe(res1.submittedAt.toISOString());

    // Only 1 row in submissions
    const subRows = await db
      .select()
      .from(submissions)
      .where(eq(submissions.sessionId, session.sessionId));
    expect(subRows.length).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // 13. Form archival preserving historical responses
  // ---------------------------------------------------------------------------
  it("13. preserves historical responses when a form is archived and restricts hard deletion", async () => {
    const { form } = await createForm({
      workspaceId: testWorkspaceId,
      name: "Archival Test Form",
      userId: ownerUserId,
      initialDefinition: testFormDefinition,
    });

    const pub = await publishForm({
      formId: form.id,
      expectedRevision: 0,
      operationId: crypto.randomUUID(),
      userId: ownerUserId,
    });

    const session = await createPatientSession({ publicSlug: pub.publicSlug });

    await submitPatientSession({
      sessionId: session.sessionId,
      capabilityToken: session.capabilityToken,
      answers: {
        "q-conditions": "opt-no",
        "q-age": 55,
      },
    });

    // Owner archives the form
    await archiveForm(form.id, ownerUserId);

    // Verify form has archived_at timestamp
    const [archivedForm] = await db
      .select()
      .from(forms)
      .where(eq(forms.id, form.id));
    expect(archivedForm?.archivedAt).not.toBeNull();

    // Verify submission still exists and is untouched
    const [sub] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.sessionId, session.sessionId));
    expect(sub).toBeDefined();

    // Attempt hard deletion: must be blocked because published versions exist
    await expect(
      deleteUnpublishedForm(form.id, ownerUserId),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
  });

  // ---------------------------------------------------------------------------
  // 14. Invalid or unknown answer rejection
  // ---------------------------------------------------------------------------
  it("14. rejects invalid or unknown answers during submission and maintains in_progress state", async () => {
    const { form } = await createForm({
      workspaceId: testWorkspaceId,
      name: "Validation Rejection Form",
      userId: editorUserId1,
      initialDefinition: testFormDefinition,
    });

    const pub = await publishForm({
      formId: form.id,
      expectedRevision: 0,
      operationId: crypto.randomUUID(),
      userId: editorUserId1,
    });

    const session = await createPatientSession({ publicSlug: pub.publicSlug });

    // Invalid answers:
    // 1. "q-age" is negative (min is 0)
    // 2. "q-conditions" has unknown option ID "opt-unknown"
    const invalidAnswers = {
      "q-conditions": "opt-unknown",
      "q-age": -5,
    };

    await expect(
      submitPatientSession({
        sessionId: session.sessionId,
        capabilityToken: session.capabilityToken,
        answers: invalidAnswers,
      }),
    ).rejects.toMatchObject({
      code: "INVALID_ANSWER",
      status: 422,
    });

    // Session must remain in_progress
    const [persistedSession] = await db
      .select()
      .from(patientSessions)
      .where(eq(patientSessions.id, session.sessionId));
    expect(persistedSession?.status).toBe("in_progress");

    // Zero rows in submissions
    const subRows = await db
      .select()
      .from(submissions)
      .where(eq(submissions.sessionId, session.sessionId));
    expect(subRows.length).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 15. Response administration access restricted to authorized workspace members
  // ---------------------------------------------------------------------------
  it("15. restricts responses access strictly to authorized workspace members", async () => {
    const { form } = await createForm({
      workspaceId: testWorkspaceId,
      name: "Response Reading RBAC Form",
      userId: editorUserId1,
      initialDefinition: testFormDefinition,
    });

    const pub = await publishForm({
      formId: form.id,
      expectedRevision: 0,
      operationId: crypto.randomUUID(),
      userId: editorUserId1,
    });

    const session = await createPatientSession({ publicSlug: pub.publicSlug });

    const submission = await submitPatientSession({
      sessionId: session.sessionId,
      capabilityToken: session.capabilityToken,
      answers: {
        "q-conditions": "opt-no",
        "q-age": 32,
      },
    });

    // Authorized editor can read submissions
    const list = await listFormSubmissions({
      formId: form.id,
      userId: editorUserId1,
    });
    expect(list.length).toBe(1);
    expect(list[0]?.id).toBe(submission.submissionId);

    // Authorized editor can read submission detail
    const detail = await getSubmissionDetail({
      formId: form.id,
      submissionId: submission.submissionId,
      userId: editorUserId1,
    });
    expect(detail.id).toBe(submission.submissionId);
    expect((detail.answerSnapshot as Record<string, unknown>)["q-age"]).toBe(
      32,
    );

    // Unauthorized user cannot list submissions
    await expect(
      listFormSubmissions({
        formId: form.id,
        userId: unauthorizedUserId,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });

    // Unauthorized user cannot read submission detail
    await expect(
      getSubmissionDetail({
        formId: form.id,
        submissionId: submission.submissionId,
        userId: unauthorizedUserId,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
  });
  it("rename advances the revision and rejects a stale editor save", async () => {
    const { form } = await createForm({
      workspaceId: testWorkspaceId,
      name: "Before",
      userId: ownerUserId,
      initialDefinition: testFormDefinition,
      initialTheme: defaultTheme,
    });
    await renameForm({
      formId: form.id,
      name: "After",
      expectedRevision: 0,
      userId: editorUserId1,
    });
    await expect(
      updateDraft({
        formId: form.id,
        expectedRevision: 0,
        definition: testFormDefinition,
        theme: defaultTheme,
        userId: editorUserId2,
      }),
    ).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
    const [draft] = await db
      .select()
      .from(formDrafts)
      .where(eq(formDrafts.formId, form.id));
    expect(draft?.revision).toBe(1);
    expect(draft?.definitionJson).toMatchObject({ title: "After" });
  });

  it("concurrent retries of one publication return the same version", async () => {
    const { form } = await createForm({
      workspaceId: testWorkspaceId,
      name: "Retry publication",
      userId: ownerUserId,
      initialDefinition: testFormDefinition,
      initialTheme: defaultTheme,
    });
    const request = {
      formId: form.id,
      expectedRevision: 0,
      operationId: crypto.randomUUID(),
      userId: ownerUserId,
    };
    const results = await Promise.all([
      publishForm(request),
      publishForm(request),
    ]);
    expect(results[0]?.publishedVersionId).toBe(results[1]?.publishedVersionId);
    expect(results.filter((result) => result.isIdempotentReplay)).toHaveLength(
      1,
    );
    const { form: other } = await createForm({
      workspaceId: testWorkspaceId,
      name: "Other form",
      userId: ownerUserId,
      initialDefinition: testFormDefinition,
      initialTheme: defaultTheme,
    });
    await expect(
      publishForm({ ...request, formId: other.id }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("failed recovery attempts persist and expired recovery codes are rejected", async () => {
    const { form } = await createForm({
      workspaceId: testWorkspaceId,
      name: "Recovery policy",
      userId: ownerUserId,
      initialDefinition: testFormDefinition,
      initialTheme: defaultTheme,
    });
    const published = await publishForm({
      formId: form.id,
      expectedRevision: 0,
      operationId: crypto.randomUUID(),
      userId: ownerUserId,
    });
    const session = await createPatientSession({
      publicSlug: published.publicSlug,
    });
    for (let attempt = 0; attempt < 5; attempt++) {
      await expect(
        resumePatientSession({
          sessionReference: session.sessionReference,
          recoveryCode: "wrong",
        }),
      ).rejects.toMatchObject({ status: 401 });
    }
    const [saved] = await db
      .select()
      .from(patientSessions)
      .where(eq(patientSessions.id, session.sessionId));
    expect(saved?.recoveryAttemptsCount).toBe(5);
    await expect(
      resumePatientSession({
        sessionReference: session.sessionReference,
        recoveryCode: session.recoveryCode,
      }),
    ).rejects.toMatchObject({ status: 429 });
    await db
      .update(patientSessions)
      .set({ recoveryExpiresAt: new Date(0) })
      .where(eq(patientSessions.id, session.sessionId));
    await expect(
      resumePatientSession({
        sessionReference: session.sessionReference,
        recoveryCode: session.recoveryCode,
      }),
    ).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
  });
});
