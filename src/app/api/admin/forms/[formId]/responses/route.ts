import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import {
  listFormSubmissions,
  getSubmissionDetail,
} from "@/features/forms/server/response-service";
import { paginationSchema } from "@/lib/http/request-validation";
import { handleRouteError } from "@/lib/errors/route-handler";

interface RouteContext {
  params: Promise<{ formId: string }>;
}

/**
 * GET /api/admin/forms/[formId]/responses
 * Lists or retrieves responses for the specified form.
 * Enforces SEC-01 workspace RBAC.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAdmin();
    const { formId } = await context.params;


    const searchParams = request.nextUrl.searchParams;
    const submissionId = searchParams.get("submissionId");
    const { limit, offset } = paginationSchema.parse({
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    if (submissionId) {
      const detail = await getSubmissionDetail({
        formId,
        submissionId,
        userId: user.id,
      });
      return NextResponse.json({ success: true, submission: detail });
    }

    const rows = await listFormSubmissions({
      formId,
      userId: user.id,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      submissions: rows,
      limit,
      offset,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
