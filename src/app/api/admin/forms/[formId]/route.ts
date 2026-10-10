import { APP_MESSAGES } from "@/lib/constants/messages";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import {
  getFormDraft,
  updateDraft,
  renameForm,
  deleteUnpublishedForm,
  archiveForm,
} from "@/features/forms/server/draft-service";
import { verifyRequestOrigin } from "@/lib/security/csrf";
import { handleRouteError } from "@/lib/errors/route-handler";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { parseRequestJson } from "@/lib/http/request-validation";
import {
  renameFormSchema,
  saveDraftSchema,
} from "@/features/forms/domain/request-schemas";

interface RouteContext {
  params: Promise<{ formId: string }>;
}

/**
 * GET /api/admin/forms/[formId]
 * Fetches form details and current working draft with definition and theme.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAdmin();
    const { formId } = await context.params;

    const data = await getFormDraft(formId, user.id);

    return NextResponse.json({
      success: true,
      form: data.form,
      draft: data.draft,
      definition: data.definition,
      theme: data.theme,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * PATCH /api/admin/forms/[formId]
 * Updates draft definition, theme, or renames form.
 * Enforces SEC-01 RBAC and SEC-03 Origin verification.
 * Enforces Compare-And-Swap revision checks, throwing HTTP 409 REVISION_CONFLICT on stale edits.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    verifyRequestOrigin(request);
    const user = await requireAdmin();
    const { formId } = await context.params;

    const body = await parseRequestJson(
      request,
      z.record(z.string(), z.unknown()),
    );

    // Branch 1: Rename form if only name is provided
    if (typeof body.name === "string" && body.definition === undefined) {
      const updatedForm = await renameForm({
        formId,
        ...renameFormSchema.parse(body),
        userId: user.id,
      });

      return NextResponse.json({
        success: true,
        form: updatedForm,
      });
    }

    const result = await updateDraft({
      formId,
      userId: user.id,
      ...saveDraftSchema.parse(body),
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * DELETE /api/admin/forms/[formId]
 * Permanently deletes unpublished forms or archives forms with existing publications.
 * Enforces SEC-01 and SEC-03.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    verifyRequestOrigin(request);
    const user = await requireAdmin();
    const { formId } = await context.params;

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action"); // 'archive' or 'delete'

    if (action === "archive") {
      const archived = await archiveForm(formId, user.id);
      return NextResponse.json({
        success: true,
        action: "archived",
        form: archived,
      });
    }

    try {
      const deleted = await deleteUnpublishedForm(formId, user.id);
      return NextResponse.json({
        success: true,
        action: "deleted",
        form: deleted,
      });
    } catch (err) {
      // If the form cannot be deleted due to published history, fall back to archival
      if (err instanceof AppError && err.code === "FORBIDDEN") {
        const archived = await archiveForm(formId, user.id);
        return NextResponse.json({
          success: true,
          action: "archived",
          form: archived,
          note: APP_MESSAGES.FORM_HAD_PUBLISHED_VERSIONS_ARCHIVED_INSTEAD_OF_HARD_DELETED,
        });
      }
      throw err;
    }
  } catch (error) {
    return handleRouteError(error);
  }
}
