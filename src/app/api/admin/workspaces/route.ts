import { NextResponse } from "next/server";
import { requireAdmin, getUserWorkspaces } from "@/lib/auth/admin";
import { handleRouteError } from "@/lib/errors/route-handler";

/**
 * GET /api/admin/workspaces
 * Retrieves all active workspaces for the authenticated administrative user.
 * Provisions an initial workspace if none exists (e.g. for reviewers).
 */
export async function GET() {
  try {
    const user = await requireAdmin();
    const workspaces = await getUserWorkspaces(user.id, user.email);

    return NextResponse.json({
      success: true,
      workspaces,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
