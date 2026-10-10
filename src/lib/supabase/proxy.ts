import { getSupabaseConfig } from "./config";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 Proxy session refresher.
 * Intercepts incoming requests at the network edge, refreshes expired Supabase Auth tokens,
 * and passes the updated cookie headers along to both the downstream route and the client browser response.
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const config = getSupabaseConfig();
  if (!config) return supabaseResponse;
  const { url: supabaseUrl, key: supabaseKey } = config;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([name, value]) =>
          supabaseResponse.headers.set(name, value),
        );
      },
    },
  });

  // Re-validate or refresh session using server verification
  // IMPORTANT: Do NOT use auth.getSession() here for authorization decisions.
  // getUser() sends a request to Supabase Auth to refresh token if necessary.
  try {
    await supabase.auth.getUser();
  } catch {
    // Refresh is best-effort here. Protected pages and API handlers still
    // verify identity themselves; a refresh outage must not block public pages.
  }

  return supabaseResponse;
}
