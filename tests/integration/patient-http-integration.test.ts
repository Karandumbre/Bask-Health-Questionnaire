import { describe, it, expect, beforeAll } from "vitest";
import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { assertTestDatabaseIsolation } from "@/lib/db/test-db-isolation";
import { db } from "@/lib/db";
import {
  workspaces,
  adminMemberships,
  patientSessions,
  submissions,
} from "@/lib/db/schema";
import { createForm } from "@/features/forms/server/draft-service";
import { publishForm } from "@/features/forms/server/publish-service";
import { POST as startSessionRoute } from "@/app/api/patient/forms/[slug]/session/route";
import { PUT as saveProgressRoute } from "@/app/api/patient/session/progress/route";
import { POST as resumeSessionRoute } from "@/app/api/patient/session/resume/route";
import { POST as submitSessionRoute } from "@/app/api/patient/session/submit/route";
import { getSessionCookieName } from "@/features/patients/server/patient-cookies";
import type { FormDefinition } from "@/features/forms/domain/types";
import { THEME_PRESET_OCEAN } from "@/features/themes/domain/theme-tokens";

describe("Patient HTTP & Database Integration Guarantees (Phase 3B)", () => {
  const testWorkspaceId = crypto.randomUUID();
  const ownerUserId = crypto.randomUUID();

  // Clinically realistic conditional form definition
  const testFormDefinition: FormDefinition = {
    schemaVersion: 1,
    title: "Cardiology Intake Assessment",
    description: "Phase 3B HTTP Verification Form",
    questions: [
      {
        id: "q-chest-pain",
        type: "single_select",
        label: "Do you experience chest pain or discomfort?",
        required: true,
        visibility: null,
        options: [
          { id: "opt-cp-yes", label: "Yes" },
          { id: "opt-cp-no", label: "No" },
        ],
      },
      {
        id: "q-chest-pain-details",
        type: "short_text",
        label: "Describe the onset and frequency of the discomfort",
        required: true,
        visibility: {
          parentQuestionId: "q-chest-pain",
          equalsOptionId: "opt-cp-yes",
        },
      },
      {
        id: "q-systolic-bp",
        type: "number",
        label: "Latest Systolic Blood Pressure (mmHg)",
        required: true,
        visibility: null,
        validation: {
          min: 60,
          max: 250,
          integerOnly: true,
        },
      },
      {
        id: "q-consent",
        type: "checkbox",
        label: "I certify that all medical history is accurate",
        required: true,
        visibility: null,
      },
    ],
  };

  let publicSlugV1: string;
  let publishedVersionIdV1: string;

  beforeAll(async () => {
    assertTestDatabaseIsolation();

    // 1. Create isolated test workspace and membership
    await db.insert(workspaces).values({
      id: testWorkspaceId,
      name: "Phase 3B Clinical Testing",
    });

    await db.insert(adminMemberships).values({
      workspaceId: testWorkspaceId,
      userId: ownerUserId,
      role: "owner",
    });

    // 2. Create and publish Form 1
    const { form } = await createForm({
      workspaceId: testWorkspaceId,
      name: "Cardiology Intake Assessment",
      userId: ownerUserId,
      initialDefinition: testFormDefinition,
      initialTheme: THEME_PRESET_OCEAN,
    });

    const pub = await publishForm({
      formId: form.id,
      expectedRevision: 0,
      operationId: crypto.randomUUID(),
      userId: ownerUserId,
    });

    publicSlugV1 = pub.publicSlug;
    publishedVersionIdV1 = pub.publishedVersionId;
  });

  // Helper to create NextRequest with origin and optional cookies
  function createPatientRequest(
    url: string,
    options: {
      method?: string;
      body?: unknown;
      cookieHeader?: string;
    } = {},
  ) {
    const { method = "GET", body, cookieHeader } = options;
    const headers = new Headers();
    headers.set("origin", "http://localhost:3000");
    headers.set("host", "localhost:3000");
    if (body) {
      headers.set("content-type", "application/json");
    }
    if (cookieHeader) {
      headers.set("cookie", cookieHeader);
    }

    return new NextRequest(new URL(url, "http://localhost:3000"), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // ---------------------------------------------------------------------------
  // 1. Patient starts a session pinned to published version 1
  // ---------------------------------------------------------------------------
  it("1. starts a session pinned to published version 1 via HTTP with HttpOnly cookie", async () => {
    const req = createPatientRequest(
      `http://localhost:3000/api/patient/forms/${publicSlugV1}/session`,
      { method: "POST" },
    );

    const res = await startSessionRoute(req, {
      params: Promise.resolve({ slug: publicSlugV1 }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.sessionId).toBeDefined();
    expect(body.data.recoveryCode).toMatch(
      /^BK-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/,
    );
    expect(body.data.versionNumber).toBe(1);

    // Verify set-cookie header
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain(getSessionCookieName(publicSlugV1));
    expect(setCookie).toContain("HttpOnly");

    // Verify database row is pinned to publishedVersionIdV1
    const [sessionRow] = await db
      .select()
      .from(patientSessions)
      .where(eq(patientSessions.id, body.data.sessionId));
    expect(sessionRow).toBeDefined();
    expect(sessionRow!.publishedVersionId).toBe(publishedVersionIdV1);
    expect(sessionRow!.status).toBe("in_progress");
  });

  // ---------------------------------------------------------------------------
  // 2. Patient saves incomplete progress
  // ---------------------------------------------------------------------------
  it("2. saves incomplete progress via HTTP and increments session revision", async () => {
    // Start session
    const startReq = createPatientRequest(
      `http://localhost:3000/api/patient/forms/${publicSlugV1}/session`,
      { method: "POST" },
    );
    const startRes = await startSessionRoute(startReq, {
      params: Promise.resolve({ slug: publicSlugV1 }),
    });
    const startBody = await startRes.json();
    const setCookie = startRes.headers.get("set-cookie")!;

    // Save incomplete progress (e.g. only answering chest pain Yes)
    const progressReq = createPatientRequest(
      "http://localhost:3000/api/patient/session/progress",
      {
        method: "PUT",
        cookieHeader: setCookie,
        body: {
          publicSlug: publicSlugV1,
          expectedSessionRevision: 0,
          answers: {
            "q-chest-pain": "opt-cp-yes",
          },
        },
      },
    );

    const progressRes = await saveProgressRoute(progressReq);
    expect(progressRes.status).toBe(200);
    const progressBody = await progressRes.json();
    expect(progressBody.success).toBe(true);
    expect(progressBody.data.sessionRevision).toBe(1);
    expect(progressBody.data.sanitizedAnswers["q-chest-pain"]).toBe(
      "opt-cp-yes",
    );

    // Verify database row
    const [sessionRow] = await db
      .select()
      .from(patientSessions)
      .where(eq(patientSessions.id, startBody.data.sessionId));
    expect(sessionRow).toBeDefined();
    expect(sessionRow!.revision).toBe(1);
    expect(sessionRow!.answerJson).toEqual({ "q-chest-pain": "opt-cp-yes" });
  });

  // ---------------------------------------------------------------------------
  // 3. Patient resumes in a separate browser context using recovery credentials
  // ---------------------------------------------------------------------------
  it("3. resumes in a separate browser context using recovery credentials", async () => {
    // Browser 1 starts and saves progress
    const startReq = createPatientRequest(
      `http://localhost:3000/api/patient/forms/${publicSlugV1}/session`,
      { method: "POST" },
    );
    const startRes = await startSessionRoute(startReq, {
      params: Promise.resolve({ slug: publicSlugV1 }),
    });
    const startBody = await startRes.json();
    const { sessionReference, recoveryCode, sessionId } = startBody.data;
    const cookie1 = startRes.headers.get("set-cookie")!;

    await saveProgressRoute(
      createPatientRequest(
        "http://localhost:3000/api/patient/session/progress",
        {
          method: "PUT",
          cookieHeader: cookie1,
          body: {
            publicSlug: publicSlugV1,
            expectedSessionRevision: 0,
            answers: {
              "q-chest-pain": "opt-cp-no",
              "q-systolic-bp": 120,
            },
          },
        },
      ),
    );

    // Browser 2 (no cookies) redempts recovery code
    const resumeReq = createPatientRequest(
      "http://localhost:3000/api/patient/session/resume",
      {
        method: "POST",
        body: {
          sessionReference,
          recoveryCode,
        },
      },
    );

    const resumeRes = await resumeSessionRoute(resumeReq);
    expect(resumeRes.status).toBe(200);
    const resumeBody = await resumeRes.json();
    expect(resumeBody.success).toBe(true);
    expect(resumeBody.data.sessionId).toBe(sessionId);
    expect(resumeBody.data.currentAnswers["q-chest-pain"]).toBe("opt-cp-no");
    expect(resumeBody.data.currentAnswers["q-systolic-bp"]).toBe(120);

    // Verify fresh recovery code and cookie issued
    expect(resumeBody.data.newRecoveryCode).not.toBe(recoveryCode);
    const cookie2 = resumeRes.headers.get("set-cookie")!;
    expect(cookie2).toContain(getSessionCookieName(publicSlugV1));

    // Browser 2 can now continue saving progress with cookie2
    const progressReq2 = createPatientRequest(
      "http://localhost:3000/api/patient/session/progress",
      {
        method: "PUT",
        cookieHeader: cookie2,
        body: {
          publicSlug: publicSlugV1,
          expectedSessionRevision: 1,
          answers: {
            "q-chest-pain": "opt-cp-no",
            "q-systolic-bp": 125,
          },
        },
      },
    );
    const progressRes2 = await saveProgressRoute(progressReq2);
    expect(progressRes2.status).toBe(200);
  });

  // ---------------------------------------------------------------------------
  // 4. Invalid recovery codes cannot access another session
  // ---------------------------------------------------------------------------
  it("4. rejects invalid recovery codes and tracks failed attempts", async () => {
    const startReq = createPatientRequest(
      `http://localhost:3000/api/patient/forms/${publicSlugV1}/session`,
      { method: "POST" },
    );
    const startRes = await startSessionRoute(startReq, {
      params: Promise.resolve({ slug: publicSlugV1 }),
    });
    const startBody = await startRes.json();
    const { sessionReference, sessionId } = startBody.data;

    // Attempt resume with wrong recovery code
    const invalidResumeReq = createPatientRequest(
      "http://localhost:3000/api/patient/session/resume",
      {
        method: "POST",
        body: {
          sessionReference,
          recoveryCode: "BK-XXXX-YYYY-ZZZZ",
        },
      },
    );

    const invalidRes = await resumeSessionRoute(invalidResumeReq);
    expect(invalidRes.status).toBe(401);
    const invalidBody = await invalidRes.json();
    expect(invalidBody.success).toBe(false);

    // Verify recovery attempts incremented in database
    const [sessionRow] = await db
      .select()
      .from(patientSessions)
      .where(eq(patientSessions.id, sessionId));
    expect(sessionRow).toBeDefined();
    expect(sessionRow!.recoveryAttemptsCount).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // 5. Concurrent recovery attempts cannot both redeem the same code
  // ---------------------------------------------------------------------------
  it("5. prevents concurrent recovery attempts from both redeeming the same code", async () => {
    const startReq = createPatientRequest(
      `http://localhost:3000/api/patient/forms/${publicSlugV1}/session`,
      { method: "POST" },
    );
    const startRes = await startSessionRoute(startReq, {
      params: Promise.resolve({ slug: publicSlugV1 }),
    });
    const startBody = await startRes.json();
    const { sessionReference, recoveryCode } = startBody.data;

    // Two simultaneous resume requests with identical one-time code
    const [res1, res2] = await Promise.all([
      resumeSessionRoute(
        createPatientRequest(
          "http://localhost:3000/api/patient/session/resume",
          {
            method: "POST",
            body: { sessionReference, recoveryCode },
          },
        ),
      ),
      resumeSessionRoute(
        createPatientRequest(
          "http://localhost:3000/api/patient/session/resume",
          {
            method: "POST",
            body: { sessionReference, recoveryCode },
          },
        ),
      ),
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses).toContain(200);
    // The second request must fail because the code was rotated atomically
    expect(statuses.filter((s) => s === 200).length).toBe(1);
    expect(statuses.some((s) => s === 401 || s === 403 || s === 429)).toBe(
      true,
    );
  });

  // ---------------------------------------------------------------------------
  // 6. Changing a conditional parent removes hidden answers from persisted progress
  // ---------------------------------------------------------------------------
  it("6. automatically removes hidden answers from persisted progress when conditional parent changes", async () => {
    const startReq = createPatientRequest(
      `http://localhost:3000/api/patient/forms/${publicSlugV1}/session`,
      { method: "POST" },
    );
    const startRes = await startSessionRoute(startReq, {
      params: Promise.resolve({ slug: publicSlugV1 }),
    });
    const startBody = await startRes.json();
    const cookie = startRes.headers.get("set-cookie")!;

    // Step 1: Save progress with parent Yes and child details
    await saveProgressRoute(
      createPatientRequest(
        "http://localhost:3000/api/patient/session/progress",
        {
          method: "PUT",
          cookieHeader: cookie,
          body: {
            publicSlug: publicSlugV1,
            expectedSessionRevision: 0,
            answers: {
              "q-chest-pain": "opt-cp-yes",
              "q-chest-pain-details": "Substernal pressure after exertion",
            },
          },
        },
      ),
    );

    // Step 2: Change parent to No
    const updateRes = await saveProgressRoute(
      createPatientRequest(
        "http://localhost:3000/api/patient/session/progress",
        {
          method: "PUT",
          cookieHeader: cookie,
          body: {
            publicSlug: publicSlugV1,
            expectedSessionRevision: 1,
            answers: {
              "q-chest-pain": "opt-cp-no",
              "q-chest-pain-details": "Substernal pressure after exertion",
            },
          },
        },
      ),
    );

    expect(updateRes.status).toBe(200);
    const updateBody = await updateRes.json();
    expect(updateBody.data.sanitizedAnswers["q-chest-pain"]).toBe("opt-cp-no");
    expect(
      updateBody.data.sanitizedAnswers["q-chest-pain-details"],
    ).toBeUndefined();

    // Verify DB answers
    const [sessionRow] = await db
      .select()
      .from(patientSessions)
      .where(eq(patientSessions.id, startBody.data.sessionId));
    expect(sessionRow).toBeDefined();
    expect(sessionRow!.answerJson).toEqual({
      "q-chest-pain": "opt-cp-no",
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Hidden answers sent directly to the API are not persisted
  // ---------------------------------------------------------------------------
  it("7. prunes malicious hidden answers sent directly to the API", async () => {
    const startReq = createPatientRequest(
      `http://localhost:3000/api/patient/forms/${publicSlugV1}/session`,
      { method: "POST" },
    );
    const startRes = await startSessionRoute(startReq, {
      params: Promise.resolve({ slug: publicSlugV1 }),
    });
    const startBody = await startRes.json();
    const cookie = startRes.headers.get("set-cookie")!;

    // Send hidden question answer when parent is No
    const maliciousReq = createPatientRequest(
      "http://localhost:3000/api/patient/session/progress",
      {
        method: "PUT",
        cookieHeader: cookie,
        body: {
          publicSlug: publicSlugV1,
          expectedSessionRevision: 0,
          answers: {
            "q-chest-pain": "opt-cp-no",
            "q-chest-pain-details": "MALICIOUS_INJECTED_VALUE",
            "q-systolic-bp": 118,
          },
        },
      },
    );

    const maliciousRes = await saveProgressRoute(maliciousReq);
    expect(maliciousRes.status).toBe(200);
    const maliciousBody = await maliciousRes.json();
    expect(
      maliciousBody.data.sanitizedAnswers["q-chest-pain-details"],
    ).toBeUndefined();

    // Verify database does not contain the pruned field
    const [sessionRow] = await db
      .select()
      .from(patientSessions)
      .where(eq(patientSessions.id, startBody.data.sessionId));
    expect(sessionRow).toBeDefined();
    expect(sessionRow!.answerJson).not.toHaveProperty("q-chest-pain-details");
    expect(sessionRow!.answerJson).toEqual({
      "q-chest-pain": "opt-cp-no",
      "q-systolic-bp": 118,
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Two simultaneous submissions produce exactly one response
  // ---------------------------------------------------------------------------
  it("8. ensures two simultaneous submissions produce exactly one response record", async () => {
    const startReq = createPatientRequest(
      `http://localhost:3000/api/patient/forms/${publicSlugV1}/session`,
      { method: "POST" },
    );
    const startRes = await startSessionRoute(startReq, {
      params: Promise.resolve({ slug: publicSlugV1 }),
    });
    const startBody = await startRes.json();
    const cookie = startRes.headers.get("set-cookie")!;
    const sessionId = startBody.data.sessionId;

    const validSubmissionPayload = {
      publicSlug: publicSlugV1,
      answers: {
        "q-chest-pain": "opt-cp-no",
        "q-systolic-bp": 120,
        "q-consent": true,
      },
    };

    // Fire two parallel submit requests (simulating double click race)
    const [submitRes1, submitRes2] = await Promise.all([
      submitSessionRoute(
        createPatientRequest(
          "http://localhost:3000/api/patient/session/submit",
          {
            method: "POST",
            cookieHeader: cookie,
            body: validSubmissionPayload,
          },
        ),
      ),
      submitSessionRoute(
        createPatientRequest(
          "http://localhost:3000/api/patient/session/submit",
          {
            method: "POST",
            cookieHeader: cookie,
            body: validSubmissionPayload,
          },
        ),
      ),
    ]);

    expect(submitRes1.status).toBe(200);
    expect(submitRes2.status).toBe(200);

    const body1 = await submitRes1.json();
    const body2 = await submitRes2.json();

    // Both requests must converge to the exact same submissionId
    expect(body1.data.submissionId).toBe(body2.data.submissionId);

    // Verify database contains EXACTLY ONE submission row for this session
    const matchingSubmissions = await db
      .select()
      .from(submissions)
      .where(eq(submissions.sessionId, sessionId));
    expect(matchingSubmissions).toHaveLength(1);
    expect(matchingSubmissions[0]!.id).toBe(body1.data.submissionId);
  });

  // ---------------------------------------------------------------------------
  // 9. Retrying after a lost success response returns the original confirmation
  // ---------------------------------------------------------------------------
  it("9. returns the original confirmation on idempotent retry after lost success response", async () => {
    const startReq = createPatientRequest(
      `http://localhost:3000/api/patient/forms/${publicSlugV1}/session`,
      { method: "POST" },
    );
    const startRes = await startSessionRoute(startReq, {
      params: Promise.resolve({ slug: publicSlugV1 }),
    });
    const cookie = startRes.headers.get("set-cookie")!;

    const payload = {
      publicSlug: publicSlugV1,
      answers: {
        "q-chest-pain": "opt-cp-yes",
        "q-chest-pain-details": "Occasional palpitations",
        "q-systolic-bp": 130,
        "q-consent": true,
      },
    };

    // First submit attempt
    const initialRes = await submitSessionRoute(
      createPatientRequest("http://localhost:3000/api/patient/session/submit", {
        method: "POST",
        cookieHeader: cookie,
        body: payload,
      }),
    );
    expect(initialRes.status).toBe(200);
    const initialBody = await initialRes.json();
    const originalSubmissionId = initialBody.data.submissionId;

    // Retry submit attempt (e.g. client lost connection before receiving response)
    const retryRes = await submitSessionRoute(
      createPatientRequest("http://localhost:3000/api/patient/session/submit", {
        method: "POST",
        cookieHeader: cookie,
        body: payload,
      }),
    );
    expect(retryRes.status).toBe(200);
    const retryBody = await retryRes.json();

    expect(retryBody.data.submissionId).toBe(originalSubmissionId);
    expect(retryBody.data.isIdempotentReplay).toBe(true);
    expect(retryBody.data.status).toBe("completed");
  });

  // ---------------------------------------------------------------------------
  // 10. Completed answers cannot be silently modified
  // ---------------------------------------------------------------------------
  it("10. rejects progress modifications after session has been completed", async () => {
    const startReq = createPatientRequest(
      `http://localhost:3000/api/patient/forms/${publicSlugV1}/session`,
      { method: "POST" },
    );
    const startRes = await startSessionRoute(startReq, {
      params: Promise.resolve({ slug: publicSlugV1 }),
    });
    const cookie = startRes.headers.get("set-cookie")!;
    const startBody = await startRes.json();
    const sessionId = startBody.data.sessionId;

    // Complete session
    await submitSessionRoute(
      createPatientRequest("http://localhost:3000/api/patient/session/submit", {
        method: "POST",
        cookieHeader: cookie,
        body: {
          publicSlug: publicSlugV1,
          answers: {
            "q-chest-pain": "opt-cp-no",
            "q-systolic-bp": 115,
            "q-consent": true,
          },
        },
      }),
    );

    // Attempt to modify progress after completion
    const modifyReq = createPatientRequest(
      "http://localhost:3000/api/patient/session/progress",
      {
        method: "PUT",
        cookieHeader: cookie,
        body: {
          publicSlug: publicSlugV1,
          expectedSessionRevision: 0,
          answers: {
            "q-chest-pain": "opt-cp-yes",
            "q-systolic-bp": 180,
          },
        },
      },
    );

    const modifyRes = await saveProgressRoute(modifyReq);
    expect(modifyRes.status).toBeGreaterThanOrEqual(400);

    // Verify database answer has not been modified
    const [sub] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.sessionId, sessionId));
    expect(sub).toBeDefined();
    expect(sub!.answerSnapshot).toEqual({
      "q-chest-pain": "opt-cp-no",
      "q-systolic-bp": 115,
      "q-consent": true,
    });
  });

  // ---------------------------------------------------------------------------
  // 11. Simultaneous sessions across different forms and versions remain isolated
  // ---------------------------------------------------------------------------
  it("11. keeps simultaneous sessions across different forms and versions strictly isolated", async () => {
    // Create Form B with different questions
    const formBDef: FormDefinition = {
      schemaVersion: 1,
      title: "Dermatology Intake",
      questions: [
        {
          id: "q-skin-type",
          type: "single_select",
          label: "Skin Sensitivity",
          required: true,
          visibility: null,
          options: [
            { id: "opt-dry", label: "Dry" },
            { id: "opt-oily", label: "Oily" },
          ],
        },
      ],
    };

    const { form: formB } = await createForm({
      workspaceId: testWorkspaceId,
      name: "Dermatology Intake",
      userId: ownerUserId,
      initialDefinition: formBDef,
      initialTheme: THEME_PRESET_OCEAN,
    });

    const pubB = await publishForm({
      formId: formB.id,
      expectedRevision: 0,
      operationId: crypto.randomUUID(),
      userId: ownerUserId,
    });

    // Start Session A on Form A and Session B on Form B
    const [resA, resB] = await Promise.all([
      startSessionRoute(
        createPatientRequest(
          `http://localhost:3000/api/patient/forms/${publicSlugV1}/session`,
          {
            method: "POST",
          },
        ),
        { params: Promise.resolve({ slug: publicSlugV1 }) },
      ),
      startSessionRoute(
        createPatientRequest(
          `http://localhost:3000/api/patient/forms/${pubB.publicSlug}/session`,
          {
            method: "POST",
          },
        ),
        { params: Promise.resolve({ slug: pubB.publicSlug }) },
      ),
    ]);

    expect(resA.status).toBe(201);
    expect(resB.status).toBe(201);

    const bodyA = await resA.json();
    const bodyB = await resB.json();

    const cookieA = resA.headers.get("set-cookie")!;
    const cookieB = resB.headers.get("set-cookie")!;

    // Verify session tokens are distinct
    expect(bodyA.data.sessionId).not.toBe(bodyB.data.sessionId);
    expect(cookieA).toContain(getSessionCookieName(publicSlugV1));
    expect(cookieB).toContain(getSessionCookieName(pubB.publicSlug));

    // Attempt cross-access: Try to save progress to Form B using Cookie A
    const crossAccessReq = createPatientRequest(
      "http://localhost:3000/api/patient/session/progress",
      {
        method: "PUT",
        cookieHeader: cookieA, // Cookie only has slug A
        body: {
          publicSlug: pubB.publicSlug, // targeting slug B
          expectedSessionRevision: 0,
          answers: { "q-skin-type": "opt-dry" },
        },
      },
    );

    const crossAccessRes = await saveProgressRoute(crossAccessReq);
    // Should be unauthorized because cookie for slug B is not present
    expect(crossAccessRes.status).toBe(401);
  });
});
