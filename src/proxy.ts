import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Next 16 "Proxy" (formerly Middleware): refreshes the Supabase session on every page request so
 * Server Components and Server Actions see a valid session cookie. It only refreshes; it doesn't
 * gate any page (guests can use the whole app). Without Supabase env vars it does nothing.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  let env;
  try {
    env = getSupabaseEnv();
  } catch {
    return response;
  }

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Verifies the JWT (refreshing it if needed). Don't add code between client creation and this call.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  // Skip static files and images; run on pages, Server Actions and route handlers.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|brand/|illustrations/).*)"],
};
