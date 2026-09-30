import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { verifiedUser, verifiedUserId } from "./verify";

/**
 * The signed-in user's id, verified by the Supabase Auth server from the request's session
 * cookie. Every Server Action that writes with the secret key calls this first. Throws
 * `NotSignedInError` for guests or invalid sessions.
 */
export async function requireUserId(): Promise<string> {
  return verifiedUserId(await createSupabaseServerClient());
}

/** Like `requireUserId()`, plus when the account was created (the early-user Pro grant needs it). */
export async function requireUser(): Promise<{ id: string; createdAt: string | null }> {
  return verifiedUser(await createSupabaseServerClient());
}
