import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { verifyRequestOrigin } from "@/lib/security/csrf";
import { handleRouteError } from "@/lib/errors/route-handler";

/**
 * POST /api/auth/logout
 * Signs out the current reviewer session and clears auth cookies.
 */
export async function POST(request: NextRequest) {
  try {
    verifyRequestOrigin(request);
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw new AppError("INTERNAL_ERROR", "Unable to sign out. Please retry.", 500);

    const response = NextResponse.json({
      success: true,
      message: "Session ended successfully.",
    });
    response.cookies.delete("bask_test_auth");
    response.cookies.delete("bask_test_user");
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
