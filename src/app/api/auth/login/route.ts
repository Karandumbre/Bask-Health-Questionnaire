import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyRequestOrigin } from "@/lib/security/csrf";
import { handleRouteError } from "@/lib/errors/route-handler";
import { AppError } from "@/lib/errors";

/**
 * POST /api/auth/login
 * Reviewer / Admin authentication endpoint.
 * Signs in using Supabase Auth with server-verified credentials and sets secure session cookies.
 * Enforces SEC-03 (origin check) and SEC-04 (server-verified claims).
 */
export async function POST(request: NextRequest) {
  try {
    verifyRequestOrigin(request);

    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      throw new AppError("UNAUTHORIZED", "Email and password are required.", 400);
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
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
