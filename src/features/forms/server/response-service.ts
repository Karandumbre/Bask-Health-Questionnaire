import "server-only";
import { eq, desc, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  submissions,
  patientSessions,
  publishedVersions,
} from "@/lib/db/schema";
import { requireFormWorkspaceAccess } from "@/lib/auth/admin";
import { AppError } from "@/lib/errors";

export interface ListSubmissionsParams {
  formId: string;
  userId: string;
  limit?: number;
  offset?: number;
}

export interface GetSubmissionDetailParams {
  formId: string;
  submissionId: string;
  userId: string;
}

/**
 * Lists clinical submissions for a form within an authorized workspace.
 * Requires editor or owner role in the workspace owning the form.
 * Anonymous or cross-tenant callers are strictly rejected.
 */
export async function listFormSubmissions(params: ListSubmissionsParams) {
  const { formId, userId, limit = 50, offset = 0 } = params;

  // 1. Authorize workspace access
  await requireFormWorkspaceAccess(formId, userId, "editor");

  // 2. Fetch submissions strictly scoped to this form through published versions
  const rows = await db
    .select({
      id: submissions.id,
      sessionId: submissions.sessionId,
      sessionReference: patientSessions.sessionReference,
      publishedVersionId: submissions.publishedVersionId,
      versionNumber: publishedVersions.versionNumber,
      answerSnapshot: submissions.answerSnapshot,
      submittedAt: submissions.submittedAt,
    })
    .from(submissions)
    .innerJoin(
      publishedVersions,
      eq(submissions.publishedVersionId, publishedVersions.id),
    )
    .innerJoin(patientSessions, eq(submissions.sessionId, patientSessions.id))
    .where(eq(publishedVersions.formId, formId))
    .orderBy(desc(submissions.submittedAt))
    .limit(limit)
    .offset(offset);

  return rows;
}

/**
 * Retrieves detailed submission data including the immutable published snapshot
 * that was presented to the patient at time of intake.
 */
export async function getSubmissionDetail(params: GetSubmissionDetailParams) {
  const { formId, submissionId, userId } = params;

  // 1. Authorize workspace access
  await requireFormWorkspaceAccess(formId, userId, "editor");

  // 2. Fetch specific submission
  const [detail] = await db
    .select({
      id: submissions.id,
      sessionId: submissions.sessionId,
      sessionReference: patientSessions.sessionReference,
      publishedVersionId: submissions.publishedVersionId,
      versionNumber: publishedVersions.versionNumber,
      definitionSnapshot: publishedVersions.definitionSnapshot,
      themeSnapshot: publishedVersions.themeSnapshot,
      answerSnapshot: submissions.answerSnapshot,
      submittedAt: submissions.submittedAt,
    })
    .from(submissions)
    .innerJoin(
      publishedVersions,
      eq(submissions.publishedVersionId, publishedVersions.id),
    )
    .innerJoin(patientSessions, eq(submissions.sessionId, patientSessions.id))
    .where(
      and(
        eq(submissions.id, submissionId),
        eq(publishedVersions.formId, formId),
      ),
    )
    .limit(1);

  if (!detail) {
    throw new AppError("NOT_FOUND", "Submission record not found.", 404, {
      resourceType: "submission",
    });
  }

  return detail;
}
