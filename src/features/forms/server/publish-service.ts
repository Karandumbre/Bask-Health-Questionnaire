import { APP_MESSAGES } from "@/lib/constants/messages";
import { lockActiveForm } from "./form-lock";
import { revisionSchema } from "@/lib/validation/primitives";
import "server-only";
import crypto from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  forms,
  formDrafts,
  publishedVersions,
  publicationOperations,
  auditEvents,
} from "@/lib/db/schema";
import { requireFormWorkspaceAccess } from "@/lib/auth/admin";
import { AppError } from "@/lib/errors";
import { FormDefinition } from "../domain/types";
import { validateFormForPublish } from "../domain/validation";

export interface PublishFormParams {
  formId: string;
  expectedRevision: number;
  operationId: string;
  userId: string;
}

export interface PublishResult {
  publishedVersionId: string;
  versionNumber: number;
  publicSlug: string;
  publicUrl: string;
  publishedAt: Date;
  isIdempotentReplay: boolean;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "form"
  );
}

/**
 * Publishes a form draft as an immutable version snapshot.
 * Guarantees:
 * 1. Transactional isolation with SELECT ... FOR UPDATE row locks.
 * 2. Idempotency on operationId (returns identical result if repeated).
 * 3. Strict monotonic version number progression (v1, v2, v3...).
 * 4. Clinical validation of all questions, choice sets, and visibility conditions.
 * 5. Rejection of stale drafts with HTTP 409 PUBLISH_CONFLICT.
 */
export async function publishForm(
  params: PublishFormParams,
): Promise<PublishResult> {
  revisionSchema.parse(params.expectedRevision);
  const { formId, expectedRevision, operationId, userId } = params;

  // 1. Authorize workspace editor
  await requireFormWorkspaceAccess(formId, userId, "editor");

  // 2. Check publication operation idempotency
  const [existingOp] = await db
    .select({
      operationId: publicationOperations.operationId,
      formId: publicationOperations.formId,
      publishedVersionId: publicationOperations.publishedVersionId,
      versionNumber: publishedVersions.versionNumber,
      publicSlug: publishedVersions.publicSlug,
      publishedAt: publishedVersions.publishedAt,
    })
    .from(publicationOperations)
    .innerJoin(
      publishedVersions,
      eq(publicationOperations.publishedVersionId, publishedVersions.id),
    )
    .where(eq(publicationOperations.operationId, operationId))
    .limit(1);

  if (existingOp) {
    if (existingOp.formId !== formId)
      throw new AppError(
        "INVALID_FORM",
        APP_MESSAGES.PUBLICATION_OPERATION_BELONGS_TO_A_DIFFERENT_FORM,
        409,
      );
    return {
      publishedVersionId: existingOp.publishedVersionId,
      versionNumber: existingOp.versionNumber,
      publicSlug: existingOp.publicSlug,
      publicUrl: `/intake/${existingOp.publicSlug}`,
      publishedAt: existingOp.publishedAt,
      isIdempotentReplay: true,
    };
  }

  // 3. Execute transactional publication with row locks
  return await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${operationId}, 1))`,
    );
    const lockedForm = await lockActiveForm(tx, formId);

    const [replay] = await tx
      .select({
        formId: publicationOperations.formId,
        publishedVersionId: publishedVersions.id,
        versionNumber: publishedVersions.versionNumber,
        publicSlug: publishedVersions.publicSlug,
        publishedAt: publishedVersions.publishedAt,
      })
      .from(publicationOperations)
      .innerJoin(
        publishedVersions,
        eq(publicationOperations.publishedVersionId, publishedVersions.id),
      )
      .where(eq(publicationOperations.operationId, operationId))
      .limit(1);
    if (replay) {
      if (replay.formId !== formId)
        throw new AppError(
          "INVALID_FORM",
          APP_MESSAGES.PUBLICATION_OPERATION_BELONGS_TO_A_DIFFERENT_FORM,
          409,
        );
      return {
        ...replay,
        publicUrl: `/intake/${replay.publicSlug}`,
        isIdempotentReplay: true,
      };
    }

    // Lock the draft row
    const [lockedDraft] = await tx
      .select()
      .from(formDrafts)
      .where(eq(formDrafts.formId, formId))
      .for("update")
      .limit(1);

    if (!lockedDraft) {
      throw new AppError(
        "NOT_FOUND",
        APP_MESSAGES.WORKING_DRAFT_NOT_FOUND_FOR_THIS_FORM,
        404,
        {
          resourceType: "draft",
        },
      );
    }

    // Stale revision check (CAS)
    if (lockedDraft.revision !== expectedRevision) {
      throw new AppError(
        "PUBLISH_CONFLICT",
        APP_MESSAGES.DRAFT_REVISION_HAS_CHANGED_PLEASE_REVIEW_THE_UPDATED_DRAFT,
        409,
        {
          expectedRevision,
          currentRevision: lockedDraft.revision,
        },
      );
    }

    // Clinical validation of form definition
    const definition = lockedDraft.definitionJson as FormDefinition;
    const validation = validateFormForPublish(definition);
    if (!validation.valid) {
      throw AppError.invalidForm(validation.errors);
    }

    // Monotonically increment version number
    const nextVersionNumber = lockedForm.latestPublishedVersionNumber + 1;

    // Generate stable unique public slug
    const randomSuffix = crypto.randomBytes(3).toString("hex");
    const baseSlug = slugify(lockedForm.name);
    const publicSlug = `${baseSlug}-v${nextVersionNumber}-${randomSuffix}`;

    // Insert immutable published version snapshot
    const [version] = await tx
      .insert(publishedVersions)
      .values({
        formId,
        versionNumber: nextVersionNumber,
        publicSlug,
        definitionSnapshot: lockedDraft.definitionJson,
        themeSnapshot: lockedDraft.themeJson,
        draftRevision: lockedDraft.revision,
        publishedBy: userId,
      })
      .returning();

    if (!version) {
      throw new AppError(
        "INTERNAL_ERROR",
        APP_MESSAGES.FAILED_TO_CREATE_PUBLISHED_VERSION_SNAPSHOT,
        500,
      );
    }

    // Register idempotency operation
    await tx.insert(publicationOperations).values({
      operationId,
      formId,
      draftRevision: lockedDraft.revision,
      publishedVersionId: version.id,
    });

    // Update form's latest version pointer
    await tx
      .update(forms)
      .set({
        latestPublishedVersionNumber: nextVersionNumber,
        updatedAt: new Date(),
      })
      .where(eq(forms.id, formId));

    // Advance draft revision so subsequent edits or publishes require new changes
    await tx
      .update(formDrafts)
      .set({
        revision: lockedDraft.revision + 1,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(formDrafts.id, lockedDraft.id));

    // Record audit event
    await tx.insert(auditEvents).values({
      workspaceId: lockedForm.workspaceId,
      actorUserId: userId,
      eventType: "FORM_PUBLISHED",
      entityType: "published_version",
      entityId: version.id,
      metadataJson: {
        formId,
        versionNumber: nextVersionNumber,
        publicSlug,
      },
    });

    return {
      publishedVersionId: version.id,
      versionNumber: version.versionNumber,
      publicSlug: version.publicSlug,
      publicUrl: `/intake/${version.publicSlug}`,
      publishedAt: version.publishedAt,
      isIdempotentReplay: false,
    };
  });
}
