import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NotSignedInError, verifiedUserId } from "./verify";

/** For pages: the verified user id, or null for guests (or when Supabase isn't configured). */
export async function signedInUserId(): Promise<string | null> {
  try {
    return await verifiedUserId(await createSupabaseServerClient());
  } catch (error) {
    if (error instanceof NotSignedInError || (error instanceof Error && error.name === "SupabaseEnvError")) return null;
    throw error;
  }
}
