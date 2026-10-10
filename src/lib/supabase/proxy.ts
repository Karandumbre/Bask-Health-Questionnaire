import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 Proxy session refresher.
 * Intercepts incoming requests at the network edge, refreshes expired Supabase Auth tokens,
 * and passes the updated cookie headers along to both the downstream route and the client browser response.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
        Object.entries(headers).forEach(([name, value]) =>
          supabaseResponse.headers.set(name, value)
        );
      },
    },
  });

  // Re-validate or refresh session using server verification
  // IMPORTANT: Do NOT use auth.getSession() here for authorization decisions.
  // getUser() sends a request to Supabase Auth to refresh token if necessary.
  await supabase.auth.getUser();

  return supabaseResponse;
}
