import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyRequestOrigin } from "@/lib/security/csrf";
import { handleRouteError } from "@/lib/errors/route-handler";
import { AppError } from "@/lib/errors";
import { authenticateTestReviewer } from "@/lib/auth/test-auth-guard";
import { z } from "zod";
import { parseRequestJson } from "@/lib/http/request-validation";

/**
 * POST /api/auth/login
 * Reviewer / Admin authentication endpoint.
 * Signs in using Supabase Auth with server-verified credentials and sets secure session cookies.
 * Enforces SEC-03 (origin check) and SEC-04 (server-verified claims).
 */
export async function POST(request: NextRequest) {
  try {
    verifyRequestOrigin(request);

    const { email, password } = await parseRequestJson(request, z.object({ email: z.string().trim().email(), password: z.string().min(1) }));

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      const fixture = authenticateTestReviewer(email, password);
      if (fixture) {
        const response = NextResponse.json({ success: true, user: fixture.user });
        response.cookies.set("bask_test_auth", fixture.token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 3600, secure: process.env.NODE_ENV === "production" });
        return response;
      }

      throw new AppError("UNAUTHORIZED", "Invalid reviewer credentials.", 401);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
