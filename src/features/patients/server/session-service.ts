import { APP_MESSAGES } from "@/lib/constants/messages";
import { revisionSchema } from "@/lib/validation/primitives";
import "server-only";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { patientSessions, publishedVersions, forms } from "@/lib/db/schema";
import { AppError } from "@/lib/errors";
import {
  generateSessionReference,
  generateRecoveryCode,
  normalizeRecoveryCode,
  hashRecoveryCode,
  verifyRecoveryCode,
  generateCapabilityToken,
  hashCapabilityToken,
} from "@/lib/security/credentials";
import { FormDefinition } from "@/features/forms/domain/types";
import { PatientAnswers } from "../domain/types";
import { validateSessionProgress } from "../domain/validation";

import {
  getSessionPepper,
  verifySessionAccess,
  SESSION_DURATION_MS,
  RECOVERY_DURATION_MS,
  RECOVERY_MAX_ATTEMPTS,
  RECOVERY_LOCKOUT_MS,
} from "./session-policy";

export interface CreateSessionParams {
  publicSlug: string;
}

export interface CreateSessionResult {
  sessionId: string;
  sessionReference: string;
  recoveryCode: string;
  capabilityToken: string;
  publicSlug: string;
  versionNumber: number;
  definition: FormDefinition;
  theme: unknown;
  currentAnswers: PatientAnswers;
  sessionRevision: number;
}

export interface ResumeSessionParams {
  sessionReference: string;
  recoveryCode: string;
}

export interface ResumeSessionResult {
  sessionId: string;
  sessionReference: string;
  newRecoveryCode: string;
  newCapabilityToken: string;
  publicSlug: string;
  versionNumber: number;
  definition: FormDefinition;
  theme: unknown;
  currentAnswers: PatientAnswers;
  sessionRevision: number;
}

export interface SaveProgressParams {
  sessionId: string;
  capabilityToken: string;
  expectedSessionRevision: number;
  answers: PatientAnswers;
}

/**
 * Initializes a new patient intake session pinned to a specific published version.
 * Issues a random public session reference, an HttpOnly capability token,
 * and a high-entropy one-time recovery code.
 */
export async function createPatientSession(
  params: CreateSessionParams,
): Promise<CreateSessionResult> {
  const { publicSlug } = params;

  // 1. Fetch published version snapshot
  const [versionWithForm] = await db
    .select({
      version: publishedVersions,
      formArchivedAt: forms.archivedAt,
    })
    .from(publishedVersions)
    .innerJoin(forms, eq(publishedVersions.formId, forms.id))
    .where(
      and(
        eq(publishedVersions.publicSlug, publicSlug),
        isNull(forms.archivedAt),
      ),
    )
    .limit(1);

  if (!versionWithForm) {
    throw new AppError(
      "NOT_FOUND",
      APP_MESSAGES.INTAKE_FORM_NOT_FOUND_OR_IS_NO_LONGER_ACCEPTING,
      404,
      {
        resourceType: "published_version",
      },
    );
  }

  const { version } = versionWithForm;

  // 2. Generate credentials
  const sessionReference = generateSessionReference();
  const recoveryCode = generateRecoveryCode();
  const capabilityToken = generateCapabilityToken();

  const credentialHash = hashCapabilityToken(
    capabilityToken,
    getSessionPepper(),
  );
  const recoveryHash = hashRecoveryCode(
    normalizeRecoveryCode(recoveryCode),
    getSessionPepper(),
  );

  const now = new Date();
  const recoveryExpiresAt = new Date(now.getTime() + RECOVERY_DURATION_MS); // 7 days
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS); // 30 days

  // 3. Persist session
  const [session] = await db
    .insert(patientSessions)
    .values({
      sessionReference,
      publishedVersionId: version.id,
      status: "in_progress",
      answerJson: {},
      revision: 0,
      credentialHash,
      recoveryHash,
      recoveryAttemptsCount: 0,
      recoveryExpiresAt,
      expiresAt,
    })
    .returning();

  if (!session) {
    throw new AppError(
      "INTERNAL_ERROR",
      APP_MESSAGES.FAILED_TO_INITIALIZE_PATIENT_SESSION,
      500,
    );
  }

  return {
    sessionId: session.id,
    sessionReference,
    recoveryCode,
    capabilityToken,
    publicSlug: version.publicSlug,
    versionNumber: version.versionNumber,
    definition: version.definitionSnapshot as FormDefinition,
    theme: version.themeSnapshot,
    currentAnswers: {},
    sessionRevision: 0,
  };
}

/**
 * Authenticates a patient session using the HttpOnly capability token cookie.
 */
export async function authenticatePatientSession(
  sessionId: string,
  capabilityToken: string,
) {
  const [session] = await db
    .select()
    .from(patientSessions)
    .where(eq(patientSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw AppError.sessionUnauthorized(APP_MESSAGES.SESSION_NOT_FOUND);
  }

  verifySessionAccess(session, capabilityToken);

  return session;
}

/**
 * Resumes an in-progress session across devices using the public reference and recovery code.
 * Implements:
 * 1. Rate limiting (max 5 failed attempts per 15 minutes window)
 * 2. Constant-time recovery code verification
 * 3. Atomic recovery code rotation upon successful redemption
 * 4. Issue of a fresh capability token for the new browser session
 */
export async function resumePatientSession(
  params: ResumeSessionParams,
): Promise<ResumeSessionResult> {
  const { sessionReference, recoveryCode } = params;

  const result = await db.transaction(async (tx) => {
    // 1. Locate and lock session row FOR UPDATE
    const [sessionWithVersion] = await tx
      .select({
        session: patientSessions,
        version: publishedVersions,
      })
      .from(patientSessions)
      .innerJoin(
        publishedVersions,
        eq(patientSessions.publishedVersionId, publishedVersions.id),
      )
      .where(eq(patientSessions.sessionReference, sessionReference))
      .for("update")
      .limit(1);

    if (!sessionWithVersion) {
      throw AppError.sessionUnauthorized(
        APP_MESSAGES.INVALID_SESSION_REFERENCE_OR_RECOVERY_CODE,
      );
    }

    const { session, version } = sessionWithVersion;

    if (session.status === "completed") {
      throw AppError.sessionCompleted(
        APP_MESSAGES.INTAKE_SESSION_HAS_ALREADY_BEEN_COMPLETED,
      );
    }

    const now = Date.now();
    if (new Date() > session.expiresAt) {
      throw new AppError(
        "SESSION_EXPIRED",
        APP_MESSAGES.INTAKE_SESSION_HAS_EXPIRED,
        410,
      );
    }

    if (now >= session.recoveryExpiresAt.getTime()) {
      throw new AppError(
        "SESSION_EXPIRED",
        APP_MESSAGES.RECOVERY_CODE_HAS_EXPIRED,
        410,
      );
    }

    // 2. Sliding window rate limiting check
    const MAX_ATTEMPTS = RECOVERY_MAX_ATTEMPTS;
    const LOCKOUT_MS = RECOVERY_LOCKOUT_MS; // 15 minutes

    if (session.recoveryAttemptsCount >= MAX_ATTEMPTS) {
      if (session.recoveryLastAttemptAt) {
        const elapsed = now - session.recoveryLastAttemptAt.getTime();
        if (elapsed < LOCKOUT_MS) {
          const retryAfterSeconds = Math.ceil((LOCKOUT_MS - elapsed) / 1000);
          throw AppError.resumeRateLimited(retryAfterSeconds);
        }
      }
    }

    // 3. Constant-time recovery code verification
    const isValid = verifyRecoveryCode(
      recoveryCode,
      session.recoveryHash,
      getSessionPepper(),
    );

    if (!isValid) {
      // Record failed attempt
      await tx
        .update(patientSessions)
        .set({
          recoveryAttemptsCount:
            (session.recoveryLastAttemptAt &&
            now - session.recoveryLastAttemptAt.getTime() < LOCKOUT_MS
              ? session.recoveryAttemptsCount
              : 0) + 1,
          recoveryLastAttemptAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(patientSessions.id, session.id));

      // Return the failure so the attempt counter commits before throwing.
      return {
        error: AppError.sessionUnauthorized(
          APP_MESSAGES.INVALID_SESSION_REFERENCE_OR_RECOVERY_CODE,
        ),
      };
    }

    // 4. Atomic rotation: issue fresh recovery code & fresh capability token
    const newRecoveryCode = generateRecoveryCode();
    const newCapabilityToken = generateCapabilityToken();

    const newRecoveryHash = hashRecoveryCode(
      normalizeRecoveryCode(newRecoveryCode),
      getSessionPepper(),
    );
    const newCredentialHash = hashCapabilityToken(
      newCapabilityToken,
      getSessionPepper(),
    );

    const [updatedSession] = await tx
      .update(patientSessions)
      .set({
        recoveryHash: newRecoveryHash,
        recoveryAttemptsCount: 0,
        recoveryLastAttemptAt: null,
        recoveryExpiresAt: new Date(now + RECOVERY_DURATION_MS),
        credentialHash: newCredentialHash,
        updatedAt: new Date(),
      })
      .where(eq(patientSessions.id, session.id))
      .returning();

    if (!updatedSession) {
      throw new AppError(
        "INTERNAL_ERROR",
        APP_MESSAGES.FAILED_TO_ROTATE_RECOVERY_CREDENTIALS,
        500,
      );
    }

    return {
      sessionId: updatedSession.id,
      sessionReference: updatedSession.sessionReference,
      newRecoveryCode,
      newCapabilityToken,
      publicSlug: version.publicSlug,
      versionNumber: version.versionNumber,
      definition: version.definitionSnapshot as FormDefinition,
      theme: version.themeSnapshot,
      currentAnswers: updatedSession.answerJson as PatientAnswers,
      sessionRevision: updatedSession.revision,
    };
  });
  if ("error" in result && result.error) throw result.error;
  if ("error" in result)
    throw new AppError("INTERNAL_ERROR", APP_MESSAGES.RECOVERY_FAILED, 500);
  return result;
}

/**
 * Persists in-progress patient answers with optimistic concurrency control.
 * Prunes answers for any questions that became hidden when parent answers changed.
 */
export async function savePatientProgress(params: SaveProgressParams) {
  revisionSchema.parse(params.expectedSessionRevision);
  const { sessionId, capabilityToken, expectedSessionRevision, answers } =
    params;

  // 1. Authenticate capability cookie
  const session = await authenticatePatientSession(sessionId, capabilityToken);

  if (session.status === "completed") {
    throw AppError.sessionCompleted(
      APP_MESSAGES.CANNOT_MODIFY_ANSWERS_FOR_A_COMPLETED_INTAKE_SESSION,
    );
  }

  // 2. Fetch published version questions
  const [version] = await db
    .select()
    .from(publishedVersions)
    .where(eq(publishedVersions.id, session.publishedVersionId))
    .limit(1);

  if (!version) {
    throw new AppError(
      "NOT_FOUND",
      APP_MESSAGES.ASSOCIATED_PUBLISHED_VERSION_NOT_FOUND,
      404,
    );
  }

  const definition = version.definitionSnapshot as FormDefinition;

  // 3. Validate and prune hidden answers
  const validation = validateSessionProgress(answers, definition.questions);
  if (!validation.valid) {
    throw AppError.invalidAnswer(validation.errors);
  }

  // 4. Atomic Compare-And-Swap update on session revision
  const [updated] = await db
    .update(patientSessions)
    .set({
      answerJson: validation.sanitizedAnswers,
      revision: expectedSessionRevision + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(patientSessions.id, sessionId),
        eq(patientSessions.revision, expectedSessionRevision),
        eq(patientSessions.status, "in_progress"),
      ),
    )
    .returning();

  if (!updated) {
    const [current] = await db
      .select({ revision: patientSessions.revision })
      .from(patientSessions)
      .where(eq(patientSessions.id, sessionId))
      .limit(1);

    const currentRev = current ? current.revision : -1;
    throw AppError.revisionConflict(
      expectedSessionRevision,
      currentRev,
      APP_MESSAGES.PATIENT_SESSION_WAS_UPDATED_BY_ANOTHER_REQUEST_PLEASE_RELOAD,
    );
  }

  return {
    success: true,
    sessionRevision: updated.revision,
    sanitizedAnswers: validation.sanitizedAnswers,
  };
}
