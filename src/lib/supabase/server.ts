import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a server-side Supabase client bound to Next.js cookies().
 * Use in Server Components, Server Actions, and Route Handlers.
 */
export async function createClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignored if called from a Server Component (where cookies cannot be set)
        }
      },
    },
  });
}

export interface VerifiedAuthUser {
  id: string;
  email: string | null;
  role?: string;
  claims: Record<string, unknown>;
}

/**
 * Server-authoritative authentication verification.
 * Prioritizes auth.getClaims() for cryptographic JWT validation without network hop,
 * falls back to auth.getUser() to revalidate directly against the Supabase Auth server.
 * NEVER trusts auth.getSession() alone because getSession() does not verify token signatures.
 */
export async function getServerVerifiedUser(
  supabase: SupabaseClient
): Promise<VerifiedAuthUser | null> {
  // 1. Try auth.getClaims() first (Supabase modern claims validation)
  try {
    if (typeof supabase.auth.getClaims === "function") {
      const { data, error } = await supabase.auth.getClaims();
      if (!error && data?.claims && typeof data.claims.sub === "string") {
        return {
          id: data.claims.sub,
          email: typeof data.claims.email === "string" ? data.claims.email : null,
          role: typeof data.claims.role === "string" ? data.claims.role : undefined,
          claims: data.claims,
        };
      }
    }
  } catch {
    // If getClaims fails or is unsupported by the current session state, fall back to getUser()
  }

  // 2. Authoritative server verification fallback via auth.getUser()
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (!userError && userData?.user) {
      return {
        id: userData.user.id,
        email: userData.user.email ?? null,
        role: userData.user.role,
        claims: (userData.user.app_metadata as Record<string, unknown>) ?? {},
      };
    }
  } catch {
    return null;
  }

  return null;
}

