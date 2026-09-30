"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

let browserClient: SupabaseClient<Database> | undefined;

/**
 * Supabase client for Client Components. One shared instance per browser tab.
 * Throws `SupabaseEnvError` with setup instructions if the env vars are missing.
 *
 * Not used anywhere yet: auth and data land in a later task.
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (!browserClient) {
    const { url, publishableKey } = getSupabaseEnv();
    browserClient = createBrowserClient<Database>(url, publishableKey);
  }
  return browserClient;
}
