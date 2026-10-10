import { NextRequest, NextResponse } from "next/server";
import {
  requireAdmin,
  getUserWorkspaces,
  requireWorkspaceMembership,
} from "@/lib/auth/admin";
import {
  createForm,
  listWorkspaceForms,
} from "@/features/forms/server/draft-service";
import { verifyRequestOrigin } from "@/lib/security/csrf";
import { handleRouteError } from "@/lib/errors/route-handler";
import { parseRequestJson } from "@/lib/http/request-validation";
import { createFormSchema } from "@/features/forms/domain/request-schemas";
import { AppError } from "@/lib/errors";

/**
 * GET /api/admin/forms?workspaceId=...
 * Lists forms in the designated workspace. Enforces SEC-01 RBAC isolation.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const searchParams = request.nextUrl.searchParams;
    let workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      const userWorkspaces = await getUserWorkspaces(user.id, user.email);
      const firstWs = userWorkspaces[0];
      if (!firstWs) {
        return NextResponse.json({ success: true, forms: [] });
      }
      workspaceId = firstWs.workspaceId;
    }

    await requireWorkspaceMembership(user.id, workspaceId);
    const forms = await listWorkspaceForms(workspaceId, user.id);

    return NextResponse.json({
      success: true,
      workspaceId,
      forms,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * POST /api/admin/forms
 * Creates a new clinical form container and initial working draft (revision 0).
 * Enforces SEC-01 (membership check) and SEC-03 (origin check).
 */
export async function POST(request: NextRequest) {
  try {
    verifyRequestOrigin(request);
    const user = await requireAdmin();

    const body = await parseRequestJson(request, createFormSchema);
    let workspaceId = body.workspaceId;

    if (!workspaceId) {
      const userWorkspaces = await getUserWorkspaces(user.id, user.email);
      const firstWs = userWorkspaces[0];
      if (!firstWs) {
        throw new AppError(
          "FORBIDDEN",
          "No active clinical workspace available.",
          403,
        );
      }
      workspaceId = firstWs.workspaceId;
    }

    const name =
      typeof body.name === "string" ? body.name : "Untitled Clinical Intake";

    const result = await createForm({
      workspaceId,
      name,
      userId: user.id,
      initialDefinition: body.initialDefinition,
      initialTheme: body.initialTheme,
    });

    return NextResponse.json(
      {
        success: true,
        form: result.form,
        draft: result.draft,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
