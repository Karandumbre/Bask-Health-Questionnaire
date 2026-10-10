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
  verifyCapabilityToken,
} from "@/lib/security/credentials";
import { FormDefinition } from "@/features/forms/domain/types";
import { PatientAnswers } from "../domain/types";
import { validateSessionProgress } from "../domain/validation";

const SESSION_PEPPER =
  process.env.APP_SESSION_PEPPER || "intake-studio-default-pepper-key-32b";

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
      "Intake form not found or is no longer accepting submissions.",
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

  const credentialHash = hashCapabilityToken(capabilityToken, SESSION_PEPPER);
  const recoveryHash = hashRecoveryCode(
    normalizeRecoveryCode(recoveryCode),
    SESSION_PEPPER,
  );

  const now = new Date();
  const recoveryExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

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
      "Failed to initialize patient session.",
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
    throw AppError.sessionUnauthorized("Session not found.");
  }

  if (new Date() > session.expiresAt) {
    throw new AppError("SESSION_EXPIRED", "Intake session has expired.", 410);
  }

  const isValid = verifyCapabilityToken(
    capabilityToken,
    session.credentialHash,
    SESSION_PEPPER,
  );
  if (!isValid) {
    throw AppError.sessionUnauthorized("Invalid session credentials.");
  }

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

  return await db.transaction(async (tx) => {
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
        "Invalid session reference or recovery code.",
      );
    }

    const { session, version } = sessionWithVersion;

    if (session.status === "completed") {
      throw AppError.sessionCompleted(
        "Intake session has already been completed.",
      );
    }

    const now = Date.now();
    if (new Date() > session.expiresAt) {
      throw new AppError("SESSION_EXPIRED", "Intake session has expired.", 410);
    }

    // 2. Sliding window rate limiting check
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

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
      SESSION_PEPPER,
    );

    if (!isValid) {
      // Record failed attempt
      await tx
        .update(patientSessions)
        .set({
          recoveryAttemptsCount: session.recoveryAttemptsCount + 1,
          recoveryLastAttemptAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(patientSessions.id, session.id));

      throw AppError.sessionUnauthorized(
        "Invalid session reference or recovery code.",
      );
    }

    // 4. Atomic rotation: issue fresh recovery code & fresh capability token
    const newRecoveryCode = generateRecoveryCode();
    const newCapabilityToken = generateCapabilityToken();

    const newRecoveryHash = hashRecoveryCode(
      normalizeRecoveryCode(newRecoveryCode),
      SESSION_PEPPER,
    );
    const newCredentialHash = hashCapabilityToken(
      newCapabilityToken,
      SESSION_PEPPER,
    );

    const [updatedSession] = await tx
      .update(patientSessions)
      .set({
        recoveryHash: newRecoveryHash,
        recoveryAttemptsCount: 0,
        recoveryLastAttemptAt: null,
        credentialHash: newCredentialHash,
        updatedAt: new Date(),
      })
      .where(eq(patientSessions.id, session.id))
      .returning();

    if (!updatedSession) {
      throw new AppError(
        "INTERNAL_ERROR",
        "Failed to rotate recovery credentials.",
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
}

/**
 * Persists in-progress patient answers with optimistic concurrency control.
 * Prunes answers for any questions that became hidden when parent answers changed.
 */
export async function savePatientProgress(params: SaveProgressParams) {
  const { sessionId, capabilityToken, expectedSessionRevision, answers } =
    params;

  // 1. Authenticate capability cookie
  const session = await authenticatePatientSession(sessionId, capabilityToken);

  if (session.status === "completed") {
    throw AppError.sessionCompleted(
      "Cannot modify answers for a completed intake session.",
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
      "Associated published version not found.",
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
      "Patient session was updated by another request. Please reload.",
    );
  }

  return {
    success: true,
    sessionRevision: updated.revision,
    sanitizedAnswers: validation.sanitizedAnswers,
  };
}
