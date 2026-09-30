import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { verifiedUserId } from "./verify";

/**
 * The signed-in user's id, verified by the Supabase Auth server from the request's session
 * cookie. Every Server Action that writes with the secret key calls this first. Throws
 * `NotSignedInError` for guests or invalid sessions.
 */
export async function requireUserId(): Promise<string> {
  return verifiedUserId(await createSupabaseServerClient());
}
