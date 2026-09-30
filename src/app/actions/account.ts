"use server";

/**
 * Account actions. The user id always comes from the server-verified session (`requireUserId()`).
 * Display names are updated with the user's own session, so RLS and the column grant apply;
 * deleting the account needs the secret key.
 */
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/server";
import { DisplayNameSchema } from "@/lib/auth/profile";
import { deleteStripeCustomer } from "@/lib/pro/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DisplayNameResult = { ok: true; displayName: string } | { ok: false; error: string };

export async function updateDisplayNameAction(name: string): Promise<DisplayNameResult> {
  const userId = await requireUserId();
  const parsed = DisplayNameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Try a different name." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("profiles").update({ display_name: parsed.data }).eq("id", userId);
  if (error) return { ok: false, error: "Couldn't save your name. Try again." };
  return { ok: true, displayName: parsed.data };
}

/**
 * Deletes the auth user. Every table references auth.users with ON DELETE CASCADE, so the profile
 * and all progress are deleted with it. Then the session cookies are cleared.
 */
export async function deleteAccountAction(): Promise<void> {
  const userId = await requireUserId();
  // Deleting the Stripe customer cancels any subscription at once, so nobody is billed for a
  // deleted account. Done first: if it fails, the account stays and the learner can try again.
  await deleteStripeCustomer(userId);
  const { error } = await createSupabaseAdminClient().auth.admin.deleteUser(userId);
  if (error) throw new Error(`Couldn't delete the account: ${error.message}`);
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/?account=deleted");
}

/**
 * Records that the signed-in learner confirmed they're 13 or older (accounts are 13+). Only the
 * fact is stored, never a date of birth. Learners can't write this column themselves.
 */
export async function confirmAgeAction(): Promise<void> {
  const userId = await requireUserId();
  const { error } = await createSupabaseAdminClient().from("profiles").update({ age_confirmed: true }).eq("id", userId);
  if (error) throw new Error(`Couldn't save the age confirmation: ${error.message}`);
}

