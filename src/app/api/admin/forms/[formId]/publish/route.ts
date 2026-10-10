import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireAdmin, requireFormWorkspaceAccess } from "@/lib/auth/admin";
import { publishForm } from "@/features/forms/server/publish-service";
import { verifyRequestOrigin } from "@/lib/security/csrf";
import { handleRouteError } from "@/lib/errors/route-handler";
import { AppError } from "@/lib/errors";

interface RouteContext {
  params: Promise<{ formId: string }>;
}

/**
 * POST /api/admin/forms/[formId]/publish
 * Publishes the form draft as an immutable snapshot.
 * Enforces SEC-01 RBAC, SEC-03 Origin verification, and transactional row locking.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    verifyRequestOrigin(request);
    const user = await requireAdmin();
    const { formId } = await context.params;

    await requireFormWorkspaceAccess(formId, user.id, "editor");

    const body = await request.json().catch(() => ({}));
    if (typeof body.expectedRevision !== "number") {
      throw new AppError(
        "INVALID_FORM",
        "expectedRevision (integer) is required to publish a draft snapshot.",
        400,
      );
    }

    const operationId =
      typeof body.operationId === "string" && body.operationId.trim()
        ? body.operationId.trim()
        : crypto.randomUUID();

    const result = await publishForm({
      formId,
      expectedRevision: body.expectedRevision,
      operationId,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
