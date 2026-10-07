"use server";

/**
 * Account actions. The user id always comes from the server-verified session (`requireUserId()`).
 * Usernames are set here with the secret key, after the server's checks (src/lib/usernames), so
 * they can't be skipped from the browser; deleting the account needs the secret key too.
 */
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUserId } from "@/lib/auth/server";
import { deleteStripeCustomer } from "@/lib/pro/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { setReminderEmails } from "@/lib/reminders/server";
import { setUsername, suggestUsername, type UsernameResult } from "@/lib/usernames/server";

/** Sets the learner's public username (sign-up's pick, or a change: first free, then every 30 days). */
export async function setUsernameAction(name: string): Promise<UsernameResult> {
  const userId = await requireUserId();
  const parsed = z.string().max(64).safeParse(name);
  if (!parsed.success) return { ok: false, error: "Try a different username." };
  return setUsername(userId, parsed.data);
}

/** A fresh suggestion nobody has yet ("Shuffle"). */
export async function suggestUsernameAction(): Promise<string> {
  await requireUserId();
  return suggestUsername();
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
 * Turns reminder emails on or off for the signed-in learner (opt-in only; turning them on records
 * when consent was given). Learners can't write their profile row themselves.
 */
export async function setReminderEmailsAction(on: boolean): Promise<void> {
  const userId = await requireUserId();
  await setReminderEmails(userId, z.boolean().parse(on));
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

