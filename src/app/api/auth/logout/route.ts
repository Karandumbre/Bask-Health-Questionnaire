import { NextRequest, NextResponse } from "next/server";
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
    await supabase.auth.signOut();

    const response = NextResponse.json({
      success: true,
      message: "Session ended successfully.",
    });
    response.cookies.delete("bask_test_user");
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
