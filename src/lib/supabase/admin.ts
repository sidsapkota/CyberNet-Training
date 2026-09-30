import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseEnv, parseSecretKey } from "./env";

/**
 * Supabase client with the SECRET key. It bypasses Row Level Security, so:
 * - `server-only` above makes any import from client code fail the build;
 * - only Server Actions use it, and only after getting the user id from a server-verified
 *   session (`requireUserId()` in `src/lib/auth/server.ts`), never from the client.
 */
export function createSupabaseAdminClient(): SupabaseClient<Database> {
  const { url } = getSupabaseEnv();
  const secretKey = parseSecretKey(process.env.SUPABASE_SECRET_KEY);
  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
