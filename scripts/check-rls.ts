/**
 * `npm run check:rls`: proves one user can't read or write another user's rows, and that users
 * can't write their own XP or premium flag, against the LINKED Supabase project.
 *
 * - Creates two throwaway users (…@example.com, confirmed, no emails are sent) and signs each in
 *   with an admin-generated magic-link token.
 * - As user A, tries to read and modify user B's rows, and to write XP / is_premium directly.
 * - Deletes both users at the end and checks the cascade removed all their rows.
 *
 * Needs SUPABASE_SECRET_KEY in .env.local. Never prints keys or tokens.
 */
import fs from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { parseSecretKey, parseSupabaseEnv } from "../src/lib/supabase/env";

for (const file of [".env.local", ".env"]) if (fs.existsSync(file)) process.loadEnvFile(file);

const env = parseSupabaseEnv({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
const secret = parseSecretKey(process.env.SUPABASE_SECRET_KEY);
const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient<Database>(env.url, secret, noSession);

type Client = SupabaseClient<Database>;
const results: { check: string; ok: boolean; detail?: string }[] = [];
const record = (check: string, ok: boolean, detail?: string) => results.push({ check, ok, detail });

async function makeUser(tag: string): Promise<{ id: string; email: string; client: Client }> {
  const email = `rls-check-${Date.now()}-${tag}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { avatar_url: "https://example.com/a.png", full_name: "Real Name", note: "kept" },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) throw new Error(`generateLink failed: ${link.error.message}`);
  const client = createClient<Database>(env.url, env.publishableKey, noSession);
  const { error: otpError } = await client.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: "magiclink" });
  if (otpError) throw new Error(`verifyOtp failed: ${otpError.message}`);
  return { id: data.user.id, email, client };
}

/** A write "failed safely" if it errored or changed nothing. */
function blocked(result: { error: unknown; data?: unknown[] | null; count?: number | null }) {
  return Boolean(result.error) || (Array.isArray(result.data) && result.data.length === 0) || result.count === 0;
}

async function main() {
  console.log(`Checking Row Level Security on ${new URL(env.url).host}…\n`);
  const a = await makeUser("a");
  const b = await makeUser("b");

  try {
    // Seed B's data with the admin client (as the Server Actions would).
    const now = new Date().toISOString();
    await admin.from("card_completions").insert({ user_id: b.id, lesson_id: "bits-and-binary", card_id: "make-5", completed_at: now, xp: 10 });
    await admin.from("lesson_completions").insert({ user_id: b.id, lesson_id: "bits-and-binary", completed_at: now, xp: 20 });
    await admin.from("quiz_attempts").insert({ user_id: b.id, quiz_id: "binary-and-data-quiz", attempted_at: now, score: 1, passed: true, xp: 50 });
    await admin.from("profiles").update({ display_name: "Bee" }).eq("id", b.id);

    // Triggers
    const profileA = await admin.from("profiles").select("id, is_premium").eq("id", a.id).maybeSingle();
    record("New users get a profile row (trigger)", profileA.data?.id === a.id && profileA.data.is_premium === false);
    const meta = (await admin.auth.admin.getUserById(a.id)).data.user?.user_metadata ?? {};
    record("Avatar and real-name metadata are stripped (trigger)", !("avatar_url" in meta) && !("full_name" in meta) && meta.note === "kept");

    // Reads: A sees only A's rows.
    for (const table of ["card_completions", "lesson_completions", "quiz_attempts"] as const) {
      const all = await a.client.from(table).select("user_id");
      const theirs = await a.client.from(table).select("user_id").eq("user_id", b.id);
      record(`A can't read B's ${table}`, !all.error && (all.data ?? []).every((r) => r.user_id === a.id) && (theirs.data ?? []).length === 0);
    }
    const bProfile = await a.client.from("profiles").select("id").eq("id", b.id);
    record("A can't read B's profile", (bProfile.data ?? []).length === 0);
    const ownProfile = await a.client.from("profiles").select("id").eq("id", a.id);
    record("A can read their own profile (control)", (ownProfile.data ?? []).length === 1);

    // Writes into B's rows.
    record(
      "A can't insert rows for B",
      blocked(await a.client.from("card_completions").insert({ user_id: b.id, lesson_id: "x", card_id: "y", completed_at: now, xp: 10 }).select()),
    );
    record("A can't update B's XP", blocked(await a.client.from("card_completions").update({ xp: 20 }).eq("user_id", b.id).select()));
    record("A can't delete B's rows", blocked(await a.client.from("quiz_attempts").delete().eq("user_id", b.id).select()));
    record("A can't rename B", blocked(await a.client.from("profiles").update({ display_name: "Hacked" }).eq("id", b.id).select()));

    // Writes to A's own XP and premium flag.
    record(
      "A can't insert their own XP",
      blocked(await a.client.from("card_completions").insert({ user_id: a.id, lesson_id: "x", card_id: "y", completed_at: now, xp: 20 }).select()),
    );
    record(
      "A can't insert their own quiz pass",
      blocked(
        await a.client
          .from("quiz_attempts")
          .insert({ user_id: a.id, quiz_id: "q", attempted_at: now, score: 1, passed: true, xp: 50 })
          .select(),
      ),
    );
    record("A can't make themselves premium", blocked(await a.client.from("profiles").update({ is_premium: true }).eq("id", a.id).select()));
    record("A can't change learning_mode directly", blocked(await a.client.from("profiles").update({ learning_mode: "explore" }).eq("id", a.id).select()));
    record("A can't change sound_enabled directly", blocked(await a.client.from("profiles").update({ sound_enabled: false }).eq("id", a.id).select()));
    const profileDefaults = await admin.from("profiles").select("sound_enabled").eq("id", a.id).single();
    record("New profiles have sound on by default", profileDefaults.data?.sound_enabled === true);
    record("A can't change coach_seen directly", blocked(await a.client.from("profiles").update({ coach_seen: ["sort_bins"] }).eq("id", a.id).select()));
    const coachDefaults = await admin.from("profiles").select("coach_seen").eq("id", a.id).single();
    record("New profiles have seen no coach panels", Array.isArray(coachDefaults.data?.coach_seen) && coachDefaults.data.coach_seen.length === 0);

    // Daily goals and streaks: the XP ledger and met days are read-only for learners.
    const day = now.slice(0, 10);
    const event = (userId: string, cardId: string, kind = "card") => ({
      user_id: userId, at: now, day, time_zone: "Australia/Sydney", kind, lesson_id: "bits-and-binary", card_id: cardId, xp: 10,
    });
    const seedB = await admin.from("xp_events").insert(event(b.id, "make-5"));
    const seedBDay = await admin.from("goal_days").insert({ user_id: b.id, day, time_zone: "Australia/Sydney", goal: 20 });
    const seedA = await admin.from("xp_events").insert(event(a.id, "make-5"));
    record("The server can record XP events and met days (control)", !seedB.error && !seedBDay.error && !seedA.error);
    for (const table of ["xp_events", "goal_days"] as const) {
      const all = await a.client.from(table).select("user_id");
      const theirs = await a.client.from(table).select("user_id").eq("user_id", b.id);
      record(`A can't read B's ${table}`, !all.error && (all.data ?? []).every((r) => r.user_id === a.id) && (theirs.data ?? []).length === 0);
    }
    const ownEvents = await a.client.from("xp_events").select("xp").eq("user_id", a.id);
    record("A can read their own XP events (control)", (ownEvents.data ?? []).length === 1);
    record("A can't add XP events for themselves", blocked(await a.client.from("xp_events").insert(event(a.id, "extra")).select()));
    record(
      "A can't mark a day as met themselves",
      blocked(await a.client.from("goal_days").insert({ user_id: a.id, day, time_zone: "Australia/Sydney", goal: 20 }).select()),
    );
    record("A can't change their XP events", blocked(await a.client.from("xp_events").update({ xp: 50 }).eq("user_id", a.id).select()));
    record(
      "A can't change or delete B's streak data",
      blocked(await a.client.from("goal_days").update({ goal: 100 }).eq("user_id", b.id).select()) &&
        blocked(await a.client.from("goal_days").delete().eq("user_id", b.id).select()) &&
        blocked(await a.client.from("xp_events").delete().eq("user_id", b.id).select()),
    );
    record(
      "A can't set their own daily goal or time zone directly",
      blocked(await a.client.from("profiles").update({ daily_goal: 20 }).eq("id", a.id).select()) &&
        blocked(await a.client.from("profiles").update({ daily_goal_chosen: true }).eq("id", a.id).select()) &&
        blocked(await a.client.from("profiles").update({ time_zone: "UTC" }).eq("id", a.id).select()),
    );
    const goalDefaults = await admin.from("profiles").select("daily_goal, daily_goal_chosen, time_zone").eq("id", a.id).single();
    record(
      "New profiles start on Regular (50), not yet chosen, no time zone",
      goalDefaults.data?.daily_goal === 50 && goalDefaults.data.daily_goal_chosen === false && goalDefaults.data.time_zone === null,
    );
    const badGoal = await admin.from("profiles").update({ daily_goal: 75 }).eq("id", a.id).select();
    const badXp = await admin.from("xp_events").insert({ ...event(a.id, "big"), xp: 51 });
    const badKind = await admin.from("xp_events").insert(event(a.id, "odd", "bonus"));
    record("Only the three goals, XP up to 50 and known kinds are allowed (even for the server)", Boolean(badGoal.error && badXp.error && badKind.error));
    const practice1 = await admin.from("xp_events").insert(event(a.id, "make-5", "practice"));
    const practice2 = await admin.from("xp_events").insert(event(a.id, "make-5", "practice"));
    record("Practice counts once per card per day (unique index)", !practice1.error && practice2.error?.code === "23505");
    const tooMany = await admin.from("profiles").update({ coach_seen: Array.from({ length: 33 }, (_, i) => `k${i}`) }).eq("id", a.id).select();
    record("coach_seen is capped at 32 entries (even for the server)", Boolean(tooMany.error));
    record("A can't set age_confirmed directly", blocked(await a.client.from("profiles").update({ age_confirmed: true }).eq("id", a.id).select()));
    const ageDefault = await admin.from("profiles").select("age_confirmed").eq("id", a.id).single();
    record("New profiles start with age not confirmed", ageDefault.data?.age_confirmed === false);
    const rename = await a.client.from("profiles").update({ display_name: "Ace" }).eq("id", a.id).select("display_name");
    record("A can change their own display name (control)", !rename.error && rename.data?.[0]?.display_name === "Ace");

    // B's data is untouched.
    const bCard = await admin.from("card_completions").select("xp").eq("user_id", b.id).single();
    const bName = await admin.from("profiles").select("display_name, is_premium").eq("id", b.id).single();
    const bQuiz = await admin.from("quiz_attempts").select("id").eq("user_id", b.id);
    record("B's data is unchanged afterwards", bCard.data?.xp === 10 && bName.data?.display_name === "Bee" && (bQuiz.data ?? []).length === 1);

    // Signed-out visitors see nothing.
    const anon = createClient<Database>(env.url, env.publishableKey, noSession);
    let anonClean = true;
    for (const table of ["profiles", "card_completions", "lesson_completions", "quiz_attempts", "xp_events", "goal_days"] as const) {
      const r = await anon.from(table).select("*");
      if (!r.error && (r.data ?? []).length > 0) anonClean = false;
    }
    record("Signed-out visitors can't read any rows", anonClean);

    // Feedback: anyone can send it, nobody but the service role can read it back.
    const session = crypto.randomUUID();
    const sent = await anon.from("feedback").insert({ message: "check:rls test", session_id: session, rating: 4, lesson_id: "whats-in-the-box" });
    record("A signed-out visitor can send feedback", !sent.error);
    const sentSignedIn = await a.client.from("feedback").insert({ message: "check:rls test (signed in)", session_id: session });
    record("A signed-in learner can send feedback", !sentSignedIn.error);
    const anonRead = await anon.from("feedback").select("*");
    const userRead = await a.client.from("feedback").select("*");
    record("Nobody but the service role can read feedback", (Boolean(anonRead.error) || (anonRead.data ?? []).length === 0) && (Boolean(userRead.error) || (userRead.data ?? []).length === 0));
    record("Feedback can't be changed or deleted", blocked(await anon.from("feedback").update({ message: "x" }).eq("session_id", session).select()) && blocked(await a.client.from("feedback").delete().eq("session_id", session).select()));
    const forged = await anon.from("feedback").insert({ message: "x", session_id: session, created_at: "2000-01-01T00:00:00Z" } as never);
    record("Feedback can't set its own id or time", Boolean(forged.error));
    const tooLong = await anon.from("feedback").insert({ message: "x".repeat(1001), session_id: crypto.randomUUID() });
    const badRating = await anon.from("feedback").insert({ message: "ok", rating: 6, session_id: crypto.randomUUID() });
    const badLesson = await anon.from("feedback").insert({ message: "ok", lesson_id: "Not A Lesson!", session_id: crypto.randomUUID() });
    record("Feedback rejects long messages, bad ratings and bad lesson ids", Boolean(tooLong.error && badRating.error && badLesson.error));
    let limited = false;
    for (let i = 0; i < 6 && !limited; i++) {
      const r = await anon.from("feedback").insert({ message: `rate ${i}`, session_id: session });
      limited = Boolean(r.error);
    }
    record("Feedback is rate-limited per session (5 an hour)", limited);
    await admin.from("feedback").delete().like("message", "%check:rls test%");
    await admin.from("feedback").delete().eq("session_id", session);
  } finally {
    // Delete both users; ON DELETE CASCADE must remove every row.
    for (const user of [a, b]) await admin.auth.admin.deleteUser(user.id);
    let leftovers = 0;
    for (const table of ["card_completions", "lesson_completions", "quiz_attempts", "xp_events", "goal_days"] as const) {
      const r = await admin.from(table).select("user_id").in("user_id", [a.id, b.id]);
      leftovers += (r.data ?? []).length;
    }
    const profiles = await admin.from("profiles").select("id").in("id", [a.id, b.id]);
    leftovers += (profiles.data ?? []).length;
    record("Deleting a user removes all their rows (cascade)", leftovers === 0);
  }

  for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.check}${r.detail ? ` (${r.detail})` : ""}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed ? `\n${failed} check(s) FAILED` : `\nAll ${results.length} checks passed.`);
  process.exitCode = failed ? 1 : 0;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
