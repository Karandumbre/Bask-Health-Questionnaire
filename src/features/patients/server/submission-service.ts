import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { patientSessions, publishedVersions, submissions } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import { verifyCapabilityToken } from "@/lib/security/credentials";
import { FormDefinition } from "@/features/forms/domain/types";
import { PatientAnswers } from "../domain/types";
import { validateSessionSubmission } from "../domain/validation";

const SESSION_PEPPER = process.env.APP_SESSION_PEPPER || "intake-studio-default-pepper-key-32b";

export interface SubmitSessionParams {
  sessionId: string;
  capabilityToken: string;
  answers: PatientAnswers;
}

export interface SubmissionResult {
  submissionId: string;
  sessionId: string;
  publishedVersionId: string;
  status: "completed";
  submittedAt: Date;
  answerSnapshot: PatientAnswers;
  isIdempotentReplay: boolean;
}

/**
 * Strictly executes final intake submission.
 * Guarantees:
 * 1. Transactional isolation with SELECT ... FOR UPDATE on patient session.
 * 2. Idempotent retry handling: if already completed, returns existing submission.
 * 3. Exact-once submission guarantee backed by UNIQUE(session_id) constraint.
 * 4. Strict server-side validation against the pinned published version.
 * 5. Automatic pruning of hidden answers so no extraneous data is persisted.
 * 6. Historical immutability protected by database triggers.
 */
export async function submitPatientSession(
  params: SubmitSessionParams
): Promise<SubmissionResult> {
  const { sessionId, capabilityToken, answers } = params;

  return await db.transaction(async (tx) => {
    // 1. Lock the patient session row
    const [lockedSession] = await tx
      .select()
      .from(patientSessions)
      .where(eq(patientSessions.id, sessionId))
      .for("update")
      .limit(1);

    if (!lockedSession) {
      throw AppError.sessionUnauthorized("Session not found.");
    }

    // 2. Validate capability cookie token
    const isValid = verifyCapabilityToken(
      capabilityToken,
      lockedSession.credentialHash,
      SESSION_PEPPER
    );
    if (!isValid) {
      throw AppError.sessionUnauthorized("Invalid session credentials.");
    }

    if (new Date() > lockedSession.expiresAt) {
      throw new AppError("SESSION_EXPIRED", "Intake session has expired.", 410);
    }

    // 3. Idempotent replay check: If already completed, fetch existing submission
    if (lockedSession.status === "completed") {
      const [existingSubmission] = await tx
        .select()
        .from(submissions)
        .where(eq(submissions.sessionId, sessionId))
        .limit(1);

      if (existingSubmission) {
        return {
          submissionId: existingSubmission.id,
          sessionId: existingSubmission.sessionId,
          publishedVersionId: existingSubmission.publishedVersionId,
          status: "completed",
          submittedAt: existingSubmission.submittedAt,
          answerSnapshot: existingSubmission.answerSnapshot as PatientAnswers,
          isIdempotentReplay: true,
        };
      }
    }

    // 4. Fetch the pinned published version snapshot
    const [version] = await tx
      .select()
      .from(publishedVersions)
      .where(eq(publishedVersions.id, lockedSession.publishedVersionId))
      .limit(1);

    if (!version) {
      throw new AppError("NOT_FOUND", "Associated published version not found.", 404);
    }

    const definition = version.definitionSnapshot as FormDefinition;

    // 5. Complete server-authoritative validation & hidden-answer pruning
    const validation = validateSessionSubmission(answers, definition.questions);
    if (!validation.valid) {
      throw AppError.invalidAnswer(validation.errors);
    }

    const completedAt = new Date();

    // 6. Insert into submissions (Protected by UNIQUE(session_id))
    const [submission] = await tx
      .insert(submissions)
      .values({
        sessionId: lockedSession.id,
        publishedVersionId: version.id,
        answerSnapshot: validation.sanitizedAnswers,
        submittedAt: completedAt,
      })
      .returning();

    if (!submission) {
      throw new AppError("INTERNAL_ERROR", "Failed to record submission.", 500);
    }

    // 7. Transition session status to completed
    await tx
      .update(patientSessions)
      .set({
        status: "completed",
        completedAt,
        answerJson: validation.sanitizedAnswers,
        updatedAt: completedAt,
      })
      .where(eq(patientSessions.id, sessionId));

    return {
      submissionId: submission.id,
      sessionId: submission.sessionId,
      publishedVersionId: submission.publishedVersionId,
      status: "completed",
      submittedAt: submission.submittedAt,
      answerSnapshot: submission.answerSnapshot as PatientAnswers,
      isIdempotentReplay: false,
    };
  });
}

