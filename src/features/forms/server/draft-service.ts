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
}

const DEFAULT_THEME: ThemeDefinition = {
  presetName: "Ocean",
  isCustomShuffle: false,
  light: {
    background: "#F8FAFC",
    surface: "#FFFFFF",
    text: "#0F172A",
    textMuted: "#64748B",
    border: "#E2E8F0",
    primary: "#0284C7",
    primaryForeground: "#FFFFFF",
    focusRing: "#38BDF8",
    error: "#EF4444",
  },
  dark: {
    background: "#0B1120",
    surface: "#1E293B",
    text: "#F8FAFC",
    textMuted: "#94A3B8",
    border: "#334155",
    primary: "#38BDF8",
    primaryForeground: "#0B1120",
    focusRing: "#7DD3FC",
    error: "#F87171",
  },
};

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

  const definition: FormDefinition = initialDefinition ?? {
    schemaVersion: 1,
    title: validatedName,
    description: "",
    questions: [],
  };

  const theme: ThemeDefinition = initialTheme ?? DEFAULT_THEME;

  // Validate structures permissively for drafting
  FormDefinitionSchema.parse(definition);
  ThemeDefinitionSchema.parse(theme);

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
    definition: draft.definitionJson as FormDefinition,
    theme: draft.themeJson as ThemeDefinition,
  };
}

/**
 * Renames a form and updates its draft title.
 */
export async function renameForm(params: RenameFormParams) {
  const { formId, name, userId } = params;
  await requireFormWorkspaceAccess(formId, userId, "editor");

  const newName = name.trim();
  if (!newName) {
    throw new AppError("INVALID_FORM", "Form name cannot be empty.", 400);
  }

  return await db.transaction(async (tx) => {
    const [updatedForm] = await tx
      .update(forms)
      .set({
        name: newName,
        updatedAt: new Date(),
      })
      .where(eq(forms.id, formId))
      .returning();

    // Also update title in draft definition if present
    const [draft] = await tx
      .select()
      .from(formDrafts)
      .where(eq(formDrafts.formId, formId));

    if (draft) {
      const def = draft.definitionJson as FormDefinition;
      const updatedDef: FormDefinition = { ...def, title: newName };
      await tx
        .update(formDrafts)
        .set({
          definitionJson: updatedDef,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(formDrafts.id, draft.id));
    }

    return updatedForm;
  });
}

/**
 * Updates a form draft using Optimistic Concurrency Control (CAS).
 * Enforces expectedRevision matching; throws HTTP 409 REVISION_CONFLICT if stale.
 * Prevents silent overwrites between multiple administrators.
 */
export async function updateDraft(params: UpdateDraftParams) {
  const { formId, expectedRevision, definition, theme, userId } = params;

  // 1. Authorize workspace member
  await requireFormWorkspaceAccess(formId, userId, "editor");

  // Permissive parse for draft persistence
  FormDefinitionSchema.parse(definition);
  ThemeDefinitionSchema.parse(theme);

  // 2. Perform atomic Compare-And-Swap update
  const [updatedDraft] = await db
    .update(formDrafts)
    .set({
      definitionJson: definition,
      themeJson: theme,
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

  // 3. If no row updated, revision collision occurred -> HTTP 409
  if (!updatedDraft) {
    const [currentDraft] = await db
      .select()
      .from(formDrafts)
      .where(eq(formDrafts.formId, formId))
      .limit(1);

    const currentRev = currentDraft ? currentDraft.revision : -1;
    throw AppError.revisionConflict(
      expectedRevision,
      currentRev,
      "Draft has been updated by another administrator. Please reload to review changes.",
    );
  }

  // Also touch form's updatedAt
  await db
    .update(forms)
    .set({ updatedAt: new Date() })
    .where(eq(forms.id, formId));

  return {
    success: true,
    draft: updatedDraft,
    revision: updatedDraft.revision,
    updatedAt: updatedDraft.updatedAt,
  };
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

  // Check if any published version exists
  const [versionCountResult] = await db
    .select({ val: count() })
    .from(publishedVersions)
    .where(eq(publishedVersions.formId, formId));

  const pubCount = versionCountResult ? versionCountResult.val : 0;
  if (pubCount > 0) {
    throw new AppError(
      "FORBIDDEN",
      "Forms with published versions cannot be deleted. Archive the form instead to preserve audit records.",
      403,
      { resourceType: "form" },
    );
  }

  return await db.transaction(async (tx) => {
    await tx.delete(formDrafts).where(eq(formDrafts.formId, formId));
    const [deletedForm] = await tx
      .delete(forms)
      .where(eq(forms.id, formId))
      .returning();
    return deletedForm;
  });
}
