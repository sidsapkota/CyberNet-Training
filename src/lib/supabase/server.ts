import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers (App Router).
 * Create one per request; it reads and writes the auth session via Next.js cookies.
 * Throws `SupabaseEnvError` with setup instructions if the env vars are missing.
 *
 * Not used anywhere yet: auth and data land in a later task.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  const { url, publishableKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. Safe to ignore
          // once session-refreshing middleware (proxy) is added with auth.
        }
      },
    },
  });
}
