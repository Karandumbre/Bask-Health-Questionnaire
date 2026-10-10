import { NextResponse } from "next/server";
import { createClient, getServerVerifiedUser } from "@/lib/supabase/server";
import { getUserWorkspaces } from "@/lib/auth/admin";
import { handleRouteError } from "@/lib/errors/route-handler";

/**
 * GET /api/auth/me
 * Returns authenticated session status, verified user identity, and active workspaces.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const user = await getServerVerifiedUser(supabase);

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        workspaces: [],
      });
    }

    const workspaces = await getUserWorkspaces(user.id, user.email);

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      workspaces,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
