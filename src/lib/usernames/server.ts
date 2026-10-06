import "server-only";
/**
 * Usernames on the server, with the secret key (learners can't write their profile row). Callers
 * pass a verified user id (requireUserId()). Every name, typed or generated, goes through
 * `checkUsername`; the database enforces the shape and uniqueness ignoring case again.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkUsername, USERNAME_MESSAGES } from "./check";
import { generateUsername } from "./generate";
import { isUsernameChange, nextUsernameChange } from "./rules";

type Admin = ReturnType<typeof createSupabaseAdminClient>;

export type UsernameResult = { ok: true; username: string } | { ok: false; error: string };

/** `ilike` treats `_` and `%` as wildcards; usernames can contain `_`. */
const exactPattern = (name: string) => name.replace(/[\\%_]/g, (c) => `\\${c}`);

async function isTaken(admin: Admin, name: string, exceptUserId?: string): Promise<boolean> {
  let query = admin.from("profiles").select("id").ilike("username", exactPattern(name)).limit(1);
  if (exceptUserId) query = query.neq("id", exceptUserId);
  const { data, error } = await query;
  if (error) throw new Error(`Couldn't check the username: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

/** A generated username nobody has yet. */
export async function suggestUsername(admin: Admin = createSupabaseAdminClient()): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const name = generateUsername();
    if (!(await isTaken(admin, name))) return name;
  }
  throw new Error("Couldn't find a free username.");
}

/**
 * Sets the learner's username after the checks. Choosing the first one (sign-up), or replacing a
 * name the app generated (`username_generated`), doesn't count as a change; after that the first
 * change is free, then one every 30 days.
 */
export async function setUsername(userId: string, input: string, now = new Date()): Promise<UsernameResult> {
  const checked = checkUsername(input);
  if (!checked.ok) return { ok: false, error: checked.message };
  const admin = createSupabaseAdminClient();
  const { data: row, error: readError } = await admin.from("profiles").select("username, username_changed_at, username_generated").eq("id", userId).maybeSingle();
  if (readError) throw new Error(`Couldn't read the profile: ${readError.message}`);
  const current = row?.username ?? null;
  const generated = row?.username_generated ?? false;
  // Keeping a generated name makes it theirs (a pick, not a change).
  if (current === checked.username && !generated) return { ok: true, username: current };

  const isChange = isUsernameChange(current, generated);
  if (isChange) {
    const next = nextUsernameChange(row?.username_changed_at ?? null, now);
    if (next) {
      return { ok: false, error: `You can change your username again on ${new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long" }).format(next)}.` };
    }
  }
  const update = isChange
    ? { username: checked.username, username_changed_at: now.toISOString(), username_generated: false }
    : { username: checked.username, username_generated: false };
  const { error } = await admin.from("profiles").update(update).eq("id", userId);
  if (error?.code === "23505") return { ok: false, error: USERNAME_MESSAGES.taken };
  if (error) throw new Error(`Couldn't save the username: ${error.message}`);
  return { ok: true, username: checked.username };
}

/**
 * The learner's username, giving them a generated one first if they have none (flagged as
 * generated, so their first real pick stays free). Only for placing a learner in a league (the
 * cron and XP placement): pages that only read league data never call it.
 */
export async function ensureUsername(admin: Admin, userId: string): Promise<string> {
  const { data, error } = await admin.from("profiles").select("username").eq("id", userId).maybeSingle();
  if (error) throw new Error(`Couldn't read the profile: ${error.message}`);
  if (data?.username) return data.username;
  for (let attempt = 0; attempt < 8; attempt++) {
    const name = generateUsername();
    const saved = await admin.from("profiles").update({ username: name, username_generated: true }).eq("id", userId).is("username", null).select("username");
    if (!saved.error) {
      if (saved.data?.length) return name;
      // Someone (a parallel request) set it first: use theirs.
      const again = await admin.from("profiles").select("username").eq("id", userId).maybeSingle();
      if (again.data?.username) return again.data.username;
    } else if (saved.error.code !== "23505") throw new Error(`Couldn't give a username: ${saved.error.message}`);
  }
  throw new Error("Couldn't find a free username.");
}

/**
 * Swaps a username for a generated one (after reports, or when the safety scan rejects it). The
 * learner can choose a new one straight away. Only replaces `current`, so a name the learner
 * changed in the meantime is left alone.
 */
export async function replaceUsername(admin: Admin, userId: string, current: string): Promise<boolean> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const name = generateUsername();
    const { data, error } = await admin
      .from("profiles")
      .update({ username: name, username_changed_at: null, username_generated: true })
      .match({ id: userId, username: current })
      .select("id");
    if (!error) return (data?.length ?? 0) > 0;
    if (error.code !== "23505") throw new Error(`Couldn't replace the username: ${error.message}`);
  }
  return false;
}
