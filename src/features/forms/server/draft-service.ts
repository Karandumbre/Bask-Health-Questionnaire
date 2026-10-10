import { lockActiveForm } from "./form-lock";
import { revisionSchema } from "@/lib/validation/primitives";
import "server-only";
import { eq, and, isNull, desc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  forms,
  formDrafts,
  publishedVersions,
  auditEvents,
} from "@/lib/db/schema";
import {
  requireWorkspaceMembership,
  requireFormWorkspaceAccess,
} from "@/lib/auth/admin";
import { AppError } from "@/lib/errors";
import {
  FormDefinition,
  FormDefinitionSchema,
  ThemeDefinition,
  ThemeDefinitionSchema,
} from "../domain/types";

export interface CreateFormParams {
  workspaceId: string;
  name: string;
  userId: string;
  initialDefinition?: FormDefinition;
  initialTheme?: ThemeDefinition;
}

export interface UpdateDraftParams {
  formId: string;
  expectedRevision: number;
  definition: FormDefinition;
  theme: ThemeDefinition;
  userId: string;
}

export interface RenameFormParams {
  formId: string;
  name: string;
  userId: string;
  expectedRevision: number;
}

import { THEME_PRESET_OCEAN } from "@/features/themes/domain/theme-tokens";

const DEFAULT_THEME: ThemeDefinition = THEME_PRESET_OCEAN;

/**
 * Creates a new clinical form and its initial working draft (revision 0).
 */
export async function createForm(params: CreateFormParams) {
  const { workspaceId, name, userId, initialDefinition, initialTheme } = params;

  // 1. Authorize workspace access
  await requireWorkspaceMembership(userId, workspaceId, "editor");

  const validatedName = name.trim();
  if (!validatedName) {
    throw new AppError("INVALID_FORM", "Form name cannot be empty.", 400);
  }

  const definition = FormDefinitionSchema.parse(
    initialDefinition ?? {
      schemaVersion: 1,
      title: validatedName,
      description: "",
      questions: [],
    },
  );

  const theme = ThemeDefinitionSchema.parse(initialTheme ?? DEFAULT_THEME);

  return await db.transaction(async (tx) => {
    // 2. Insert form container
    const [form] = await tx
      .insert(forms)
      .values({
        workspaceId,
        name: validatedName,
        createdBy: userId,
      })
      .returning();

    if (!form) {
      throw new AppError(
        "INTERNAL_ERROR",
        "Failed to create form container.",
        500,
      );
    }

    // 3. Insert initial working draft
    const [draft] = await tx
      .insert(formDrafts)
      .values({
        formId: form.id,
        definitionJson: definition,
        themeJson: theme,
        revision: 0,
        updatedBy: userId,
      })
      .returning();

    // 4. Record non-sensitive audit event
    await tx.insert(auditEvents).values({
      workspaceId,
      actorUserId: userId,
      eventType: "FORM_CREATED",
      entityType: "form",
      entityId: form.id,
      metadataJson: { formName: form.name },
    });

    return {
      form,
      draft,
    };
  });
}

/**
 * Lists all non-archived forms within a workspace.
 */
export async function listWorkspaceForms(workspaceId: string, userId: string) {
  await requireWorkspaceMembership(userId, workspaceId);

  const formList = await db
    .select({
      id: forms.id,
      workspaceId: forms.workspaceId,
      name: forms.name,
      latestPublishedVersionNumber: forms.latestPublishedVersionNumber,
      createdAt: forms.createdAt,
      updatedAt: forms.updatedAt,
      draftRevision: formDrafts.revision,
      draftUpdatedAt: formDrafts.updatedAt,
    })
    .from(forms)
    .leftJoin(formDrafts, eq(forms.id, formDrafts.formId))
    .where(and(eq(forms.workspaceId, workspaceId), isNull(forms.archivedAt)))
    .orderBy(desc(forms.updatedAt));

  return formList;
}

/**
 * Retrieves the working draft aggregate for a specific form.
 */
export async function getFormDraft(formId: string, userId: string) {
  const { form } = await requireFormWorkspaceAccess(formId, userId);

  const [draft] = await db
    .select()
    .from(formDrafts)
    .where(eq(formDrafts.formId, formId))
    .limit(1);

  if (!draft) {
    throw new AppError(
      "NOT_FOUND",
      "Working draft not found for this form.",
      404,
      {
        resourceType: "draft",
      },
    );
  }

  return {
    form,
    draft,
    definition: FormDefinitionSchema.parse(draft.definitionJson),
    theme: ThemeDefinitionSchema.parse(draft.themeJson),
  };
}

/**
 * Renames a form and updates its draft title.
 */
export async function renameForm(params: RenameFormParams) {
  revisionSchema.parse(params.expectedRevision);
  const { formId, name, userId } = params;
  await requireFormWorkspaceAccess(formId, userId, "editor");

  const newName = name.trim();
  if (!newName) {
    throw new AppError("INVALID_FORM", "Form name cannot be empty.", 400);
  }

  return await db.transaction(async (tx) => {
    // Lock form then draft in the same order as publication and autosave.
    await lockActiveForm(tx, formId);
    const [draft] = await tx
      .select()
      .from(formDrafts)
      .where(eq(formDrafts.formId, formId))
      .for("update");
    if (!draft)
      throw new AppError("NOT_FOUND", "Working draft not found.", 404);
    if (draft.revision !== params.expectedRevision) {
      throw AppError.revisionConflict(params.expectedRevision, draft.revision);
    }
    const definition = FormDefinitionSchema.parse(draft.definitionJson);
    await tx
      .update(formDrafts)
      .set({
        definitionJson: { ...definition, title: newName },
        revision: draft.revision + 1,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(formDrafts.id, draft.id));
    const [updatedForm] = await tx
      .update(forms)
      .set({ name: newName, updatedAt: new Date() })
      .where(eq(forms.id, formId))
      .returning();
    return updatedForm;
  });
}

/**
 * Updates a form draft using Optimistic Concurrency Control (CAS).
 * Enforces expectedRevision matching; throws HTTP 409 REVISION_CONFLICT if stale.
 * Prevents silent overwrites between multiple administrators.
 */
export async function updateDraft(params: UpdateDraftParams) {
  revisionSchema.parse(params.expectedRevision);
  const { formId, expectedRevision, definition, theme, userId } = params;

  // 1. Authorize workspace member
  await requireFormWorkspaceAccess(formId, userId, "editor");

  const parsedDefinition = FormDefinitionSchema.parse(definition);
  const parsedTheme = ThemeDefinitionSchema.parse(theme);
  return db.transaction(async (tx) => {
    await lockActiveForm(tx, formId);
    const [updatedDraft] = await tx
      .update(formDrafts)
      .set({
        definitionJson: parsedDefinition,
        themeJson: parsedTheme,
        revision: expectedRevision + 1,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(formDrafts.formId, formId),
          eq(formDrafts.revision, expectedRevision),
        ),
      )
      .returning();
    if (!updatedDraft) {
      const [current] = await tx
        .select()
        .from(formDrafts)
        .where(eq(formDrafts.formId, formId))
        .limit(1);
      if (!current)
        throw new AppError("NOT_FOUND", "Working draft not found.", 404);
      throw AppError.revisionConflict(expectedRevision, current.revision);
    }
    await tx
      .update(forms)
      .set({ name: parsedDefinition.title, updatedAt: new Date() })
      .where(eq(forms.id, formId));
    return {
      success: true,
      draft: updatedDraft,
      revision: updatedDraft.revision,
      updatedAt: updatedDraft.updatedAt,
    };
  });
}

/**
 * Archives a form (soft delete). Preserves all historical versions and responses.
 * Requires "owner" role.
 */
export async function archiveForm(formId: string, userId: string) {
  const { form } = await requireFormWorkspaceAccess(formId, userId, "owner");

  const [archived] = await db
    .update(forms)
    .set({
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(forms.id, formId))
    .returning();

  await db.insert(auditEvents).values({
    workspaceId: form.workspaceId,
    actorUserId: userId,
    eventType: "FORM_ARCHIVED",
    entityType: "form",
    entityId: formId,
    metadataJson: { formName: form.name },
  });

  return archived;
}

/**
 * Deletes an unpublished form draft permanently if and only if it has never been published.
 * If the form has any published versions, hard deletion is prohibited and throws FORBIDDEN.
 */
export async function deleteUnpublishedForm(formId: string, userId: string) {
  await requireFormWorkspaceAccess(formId, userId, "owner");

  return db.transaction(async (tx) => {
    await lockActiveForm(tx, formId);
    const [versionCount] = await tx.select({ val: count() }).from(publishedVersions).where(eq(publishedVersions.formId, formId));
    if ((versionCount?.val ?? 0) > 0) throw new AppError("FORBIDDEN", "Forms with published versions cannot be deleted. Archive the form instead.", 403, { resourceType: "form" });
    await tx.delete(formDrafts).where(eq(formDrafts.formId, formId));
    const [deletedForm] = await tx
      .delete(forms)
      .where(eq(forms.id, formId))
      .returning();
    return deletedForm;
  });
}
