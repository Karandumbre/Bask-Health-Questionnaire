import { APPLICATION } from "@/lib/constants/application";
import { APP_MESSAGES } from "@/lib/constants/messages";
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
    if (error)
      throw new AppError(
        "INTERNAL_ERROR",
        APP_MESSAGES.UNABLE_TO_SIGN_OUT_PLEASE_RETRY,
        500,
      );

    const response = NextResponse.json({
      success: true,
      message: APP_MESSAGES.SESSION_ENDED_SUCCESSFULLY,
    });
    response.cookies.delete(APPLICATION.testAuthCookieName);
    response.cookies.delete("bask_test_user");
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
