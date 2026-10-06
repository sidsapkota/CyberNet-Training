/**
 * `npm run check:rls`: proves one user can't read or write another user's rows, and that users
 * can't write their own XP or premium flag, against the LINKED Supabase project.
 *
 * - Creates two throwaway users (…@example.com, confirmed, no emails are sent) and signs each in
 *   with an admin-generated magic-link token.
 * - As user A, tries to read and modify user B's rows, and to write XP or Pro directly.
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
  const c = await makeUser("c");
  // Leagues: the database's open switch is global (previews share it with production), so it's
  // only flipped for a moment and always put back; test learners use Quantum leagues, where no
  // real learner can be placed, and every league made here is deleted afterwards.
  const leagueState = (await admin.from("league_state").select("opened_at").single()).data;
  const testLeagues: string[] = [];
  const PAST_WEEK = "2001-01-01"; // a Monday long ago, for the placement and settling checks

  try {
    // Seed B's data with the admin client (as the Server Actions would).
    const now = new Date().toISOString();
    await admin.from("card_completions").insert({ user_id: b.id, lesson_id: "bits-and-binary", card_id: "make-5", completed_at: now, xp: 10 });
    await admin.from("lesson_completions").insert({ user_id: b.id, lesson_id: "bits-and-binary", completed_at: now, xp: 20 });
    await admin.from("quiz_attempts").insert({ user_id: b.id, quiz_id: "binary-and-data-quiz", attempted_at: now, score: 1, passed: true, xp: 50 });
    const bUsername = `RlsB_${Date.now().toString(36).slice(-8)}`;
    await admin.from("profiles").update({ username: bUsername }).eq("id", b.id);

    // Triggers
    const profileA = await admin.from("profiles").select("id").eq("id", a.id).maybeSingle();
    record("New users get a profile row (trigger)", profileA.data?.id === a.id);
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
    record("A can't rename B", blocked(await a.client.from("profiles").update({ username: "Hacked_name" }).eq("id", b.id).select()));

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
    // Usernames go only through the server's checks (a Server Action with the secret key).
    record("A can't set their own username directly", blocked(await a.client.from("profiles").update({ username: "Picked_direct" }).eq("id", a.id).select()));
    record("A can't change their old display name either", blocked(await a.client.from("profiles").update({ display_name: "Ace" }).eq("id", a.id).select()));
    const dupe = await admin.from("profiles").update({ username: bUsername.toUpperCase() }).eq("id", a.id).select();
    record("Usernames are unique ignoring case (even for the server)", dupe.error?.code === "23505");
    const badShape = await admin.from("profiles").update({ username: "no spaces!" }).eq("id", a.id).select();
    record("The database rejects a badly shaped username", Boolean(badShape.error));

    // Avatars and rewards: cosmetic, but only the server writes them.
    // A is a free learner: equipping the Pro crown straight through the API must fail (only the
    // server writes outfits, after checking each item is unlocked).
    record("A (free) can't equip the Pro crown directly", blocked(await a.client.from("profiles").update({ outfit: ["crown"] }).eq("id", a.id).select()));
    record("A can't write any outfit directly, even free items", blocked(await a.client.from("profiles").update({ outfit: ["cap"] }).eq("id", a.id).select()));
    const outfitAfter = (await admin.from("profiles").select("outfit").eq("id", a.id).single()).data?.outfit ?? null;
    record("…and A's outfit is unchanged", Array.isArray(outfitAfter) && outfitAfter.length === 0, JSON.stringify(outfitAfter));
    record("A can't give themselves a reward item", blocked(await a.client.from("reward_items_owned").insert({ user_id: a.id, item_id: "beanie", source: "spin" }).select()));
    record("A can't give themselves a spin", blocked(await a.client.from("reward_spins").insert({ user_id: a.id, earned_for: "streak:7" }).select()));
    await admin.from("reward_items_owned").insert([{ user_id: a.id, item_id: "beanie", source: "spin" }, { user_id: b.id, item_id: "visor", source: "spin" }]);
    await admin.from("reward_spins").insert([{ user_id: a.id, earned_for: "streak:7" }, { user_id: b.id, earned_for: "streak:7" }]);
    const myItems = await a.client.from("reward_items_owned").select("user_id, item_id");
    const mySpins = await a.client.from("reward_spins").select("user_id");
    record("A reads only their own reward items and spins", !myItems.error && (myItems.data ?? []).length === 1 && (myItems.data ?? []).every((r) => r.user_id === a.id) && (mySpins.data ?? []).every((r) => r.user_id === a.id));
    record("A can't use a spin themselves", blocked(await a.client.from("reward_spins").update({ spun_at: new Date().toISOString(), item_id: "headset" }).eq("user_id", a.id).select()));
    const badOutfit = await admin.from("profiles").update({ outfit: ["Not An Item!"] }).eq("id", a.id).select();
    record("The database rejects a badly shaped outfit item", Boolean(badOutfit.error));
    const longOutfit = await admin.from("profiles").update({ outfit: ["cap", "glasses", "scarf", "hoodie", "cape", "beanie"] }).eq("id", a.id).select();
    record("The database rejects an outfit of more than 5 items", Boolean(longOutfit.error));
    const dupeOutfit = await admin.from("profiles").update({ outfit: ["cap", "cap"] }).eq("id", a.id).select();
    record("The database rejects duplicate outfit items", Boolean(dupeOutfit.error));
    const nullOutfit = await admin.from("profiles").update({ outfit: ["cap", null] as unknown as string[] }).eq("id", a.id).select();
    record("The database rejects a NULL outfit item", Boolean(nullOutfit.error));
    const goodOutfit = await admin.from("profiles").update({ outfit: ["cap", "glasses"] }).eq("id", a.id).select();
    record("The server can save a well-formed outfit", !goodOutfit.error);
    const badSpin = await admin.from("reward_spins").insert({ user_id: a.id, earned_for: "bought:1" }).select();
    record("Spins can only be earned for modules, courses or streaks", Boolean(badSpin.error));

    // CyberNet Pro: learners read their own subscription and grant, and nothing else; only the
    // server (webhook and Server Actions) writes any of it.
    const later = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const sub = (userId: string, id: string) => ({
      id, user_id: userId, customer_id: `cus_rls${id.slice(4)}`, status: "active", price_id: "price_rlscheck",
      billing_interval: "month", current_period_end: later, started_at: now,
    });
    const tag = Date.now().toString(36);
    const seedPro = [
      await admin.from("stripe_customers").insert({ user_id: b.id, customer_id: `cus_rlsb${tag}` }),
      await admin.from("subscriptions").insert(sub(b.id, `sub_rlsb${tag}`)),
      await admin.from("subscriptions").insert(sub(a.id, `sub_rlsa${tag}`)),
      await admin.from("pro_grants").insert({ user_id: b.id, reason: "early_user", starts_at: now, expires_at: later }),
      await admin.from("stripe_events").insert({ id: `evt_rls${tag}`, type: "check.rls" }),
    ];
    record("The server can write Pro rows (control)", seedPro.every((r) => !r.error), seedPro.find((r) => r.error)?.error?.message);
    for (const table of ["subscriptions", "pro_grants"] as const) {
      const theirs = await a.client.from(table).select("user_id").eq("user_id", b.id);
      record(`A can't read B's ${table}`, !theirs.error && (theirs.data ?? []).length === 0);
    }
    const ownSub = await a.client.from("subscriptions").select("id").eq("user_id", a.id);
    record("A can read their own subscription (control)", (ownSub.data ?? []).length === 1);
    let serverOnlyHidden = true;
    for (const table of ["stripe_customers", "stripe_events"] as const) {
      const r = await a.client.from(table).select("*");
      if (!r.error && (r.data ?? []).length > 0) serverOnlyHidden = false;
    }
    record("Learners can't read Stripe customers or webhook events", serverOnlyHidden);
    record(
      "A can't give themselves Pro (subscription or grant)",
      blocked(await a.client.from("subscriptions").insert(sub(a.id, `sub_rlsx${tag}`)).select()) &&
        blocked(await a.client.from("subscriptions").update({ status: "active", current_period_end: "2099-01-01T00:00:00Z" }).eq("user_id", a.id).select()) &&
        blocked(await a.client.from("pro_grants").insert({ user_id: a.id, reason: "early_user", starts_at: now, expires_at: "2099-01-01T00:00:00Z" }).select()),
    );
    record(
      "A can't change or delete B's Pro",
      blocked(await a.client.from("subscriptions").update({ status: "canceled" }).eq("user_id", b.id).select()) &&
        blocked(await a.client.from("subscriptions").delete().eq("user_id", b.id).select()) &&
        blocked(await a.client.from("pro_grants").delete().eq("user_id", b.id).select()),
    );
    record(
      "A can't mark webhook events as handled or link a Stripe customer",
      blocked(await a.client.from("stripe_events").insert({ id: `evt_rlsx${tag}`, type: "x" }).select()) &&
        blocked(await a.client.from("stripe_customers").insert({ user_id: a.id, customer_id: `cus_rlsx${tag}` }).select()),
    );
    const badStatus = await admin.from("subscriptions").insert({ ...sub(a.id, `sub_rlsy${tag}`), status: "free_forever" });
    const badGrant = await admin.from("pro_grants").insert({ user_id: a.id, reason: "early_user", starts_at: later, expires_at: now });
    record("Subscriptions only take Stripe's statuses, and grants must end after they start", Boolean(badStatus.error && badGrant.error));
    await admin.from("stripe_events").delete().eq("id", `evt_rls${tag}`);

    // B's data is untouched.
    const bCard = await admin.from("card_completions").select("xp").eq("user_id", b.id).single();
    const bName = await admin.from("profiles").select("username").eq("id", b.id).single();
    const bQuiz = await admin.from("quiz_attempts").select("id").eq("user_id", b.id);
    record("B's data is unchanged afterwards", bCard.data?.xp === 10 && bName.data?.username === bUsername && (bQuiz.data ?? []).length === 1);

    // Leagues: others in your own league are visible only through league_standings(), with public
    // fields only; everything else is server-only.
    const lt = Date.now().toString(36).slice(-6);
    const week = (await admin.rpc("league_week")).data as string;
    // Leaderboards show each learner's username.
    for (const [id, name] of [[a.id, `RlsAce${lt}`], [b.id, `RlsBee${lt}`], [c.id, `RlsCee${lt}`]] as const) {
      await admin.from("profiles").update({ username: name }).eq("id", id);
    }
    const player = (id: string) => ({ user_id: id, tier: "quantum" });
    const seedPlayers = await admin.from("league_players").insert([player(a.id), player(b.id), player(c.id)]);
    const xpAt = new Date().toISOString();
    const xp = (id: string, amount: number) => ({ user_id: id, at: xpAt, day: xpAt.slice(0, 10), time_zone: "Australia/Sydney", kind: "card", lesson_id: "bits-and-binary", card_id: `rls-${lt}`, xp: amount });
    await admin.from("xp_events").insert([xp(a.id, 10), xp(b.id, 30), xp(c.id, 50)]);
    const join = (id: string, w = week, cap = 30) => admin.rpc("join_league", { p_user: id, p_week: w, p_tier: "quantum", p_bands: ["light", "regular", "keen"], p_cap: cap });
    const leagueA = await join(a.id);
    const leagueB = await join(b.id);
    if (leagueA.data) testLeagues.push(leagueA.data);
    // C gets a league of their own (keen band), so A and B can't see them.
    const own = await admin.from("leagues").insert({ week, tier: "quantum", band: "keen" }).select("id").single();
    if (own.data) {
      testLeagues.push(own.data.id);
      await admin.from("league_members").insert({ week, user_id: c.id, league_id: own.data.id });
    }
    record("The server can place learners in leagues (control)", !seedPlayers.error && !leagueA.error && leagueA.data === leagueB.data && Boolean(own.data));

    const closed = leagueState?.opened_at ? null : await a.client.rpc("league_standings");
    if (closed) record("Before leagues open, standings show nothing", !closed.error && (closed.data ?? []).length === 0);
    await admin.from("league_state").update({ opened_at: new Date().toISOString() }).eq("id", true);

    // Weekly XP must equal the ledger's total for this week, practice left out (league XP never
    // counts replays: 20261008100000_league_xp_no_practice). Other checks above earned XP too.
    const weekStart = (await admin.rpc("league_week")).data as string;
    const ledger = (await admin.from("xp_events").select("user_id, xp, at").in("user_id", [a.id, b.id]).neq("kind", "practice")).data ?? [];
    const startMs = Date.parse(`${weekStart}T00:00:00+10:00`) - 3_600_000; // Sydney Monday, either offset
    const weekXp = (id: string) => ledger.filter((e) => e.user_id === id && Date.parse(e.at) >= startMs).reduce((sum, e) => sum + e.xp, 0);
    const standingsA = await a.client.rpc("league_standings");
    const rowsA = standingsA.data ?? [];
    record(
      "A sees their own league: usernames, outfits, tier, weekly XP and Pro only",
      !standingsA.error &&
        rowsA.length === 2 &&
        rowsA.every((r) => Object.keys(r).sort().join() === "avatar,handle,is_me,outfit,pro,rank,tier,weekly_xp") &&
        rowsA[0]?.handle === `RlsBee${lt}` && rowsA[0]?.weekly_xp === weekXp(b.id) && rowsA[1]?.weekly_xp === weekXp(a.id) && rowsA[1]?.is_me === true,
      standingsA.error?.message ?? JSON.stringify(rowsA),
    );
    record("A can't see learners in other leagues", !rowsA.some((r) => r.handle === `RlsCee${lt}`));
    await admin.from("league_players").update({ pro_cosmetic_until: new Date(Date.now() + 86_400_000).toISOString() }).eq("user_id", b.id);
    record("The Pro cosmetic shows only while it lasts", ((await a.client.rpc("league_standings")).data ?? []).find((r) => r.handle === `RlsBee${lt}`)?.pro === true);
    await admin.from("league_players").update({ show_on_leaderboards: false }).eq("user_id", b.id);
    const hiddenA = (await a.client.rpc("league_standings")).data ?? [];
    const hiddenB = (await b.client.rpc("league_standings")).data ?? [];
    record("Hidden learners disappear from others' standings (but still see themselves)", hiddenA.length === 1 && hiddenB.some((r) => r.is_me));
    await admin.from("league_players").update({ show_on_leaderboards: true }).eq("user_id", b.id);

    const ownPlayer = await a.client.from("league_players").select("user_id");
    record("A can read only their own player row", !ownPlayer.error && (ownPlayer.data ?? []).length === 1 && ownPlayer.data?.[0]?.user_id === a.id);
    let serverOnlyLeagues = true;
    for (const table of ["leagues", "league_members", "league_weeks", "league_state", "handle_reports"] as const) {
      const r = await a.client.from(table).select("*");
      if (!r.error && (r.data ?? []).length > 0) serverOnlyLeagues = false;
    }
    record("Learners can't read leagues, members, weeks, state or reports directly", serverOnlyLeagues);
    record(
      "A can't change their own tier or visibility, or anyone's",
      blocked(await a.client.from("league_players").update({ tier: "mainframe" }).eq("user_id", a.id).select()) &&
        blocked(await a.client.from("league_players").update({ show_on_leaderboards: false }).eq("user_id", b.id).select()),
    );
    record(
      "A can't join, leave or create leagues, or open them",
      blocked(await a.client.from("league_members").insert({ week, user_id: a.id, league_id: own.data?.id ?? "" }).select()) &&
        blocked(await a.client.from("league_members").delete().eq("user_id", a.id).select()) &&
        blocked(await a.client.from("leagues").insert({ week, tier: "packet", band: "light" }).select()) &&
        blocked(await a.client.from("league_state").update({ opened_at: null }).eq("id", true).select()),
    );
    const callJoin = await a.client.rpc("join_league", { p_user: a.id, p_week: week, p_tier: "quantum", p_bands: ["light"], p_cap: 30 });
    const callSettle = await a.client.rpc("finalize_league_week", { p_week: PAST_WEEK, p_results: [] });
    record("A can't call the server's join or settle functions", Boolean(callJoin.error && callSettle.error));
    record(
      "A can't file reports or results directly",
      blocked(await a.client.from("handle_reports").insert({ reporter_id: a.id, reported_user_id: b.id, handle: `RlsBee${lt}`, reason: "rude" }).select()) &&
        blocked(await a.client.from("league_results").insert({ week, user_id: a.id, league_id: own.data?.id ?? "", rank: 1, weekly_xp: 999, from_tier: "quantum", to_tier: "quantum" }).select()),
    );

    // Placement: fill to the cap, then a new league; one league per learner per week.
    const p1 = await join(a.id, PAST_WEEK, 2);
    const p2 = await join(b.id, PAST_WEEK, 2);
    const p3 = await join(c.id, PAST_WEEK, 2);
    const again = await join(a.id, PAST_WEEK, 2);
    record("Leagues fill to the cap before a new one opens, one per learner per week", Boolean(p1.data) && p1.data === p2.data && p3.data !== p1.data && again.data === p1.data);
    // Settling: once only, in one transaction; results readable by their learner only.
    const results = [{ user_id: b.id, league_id: p1.data, rank: 1, weekly_xp: 30, from_tier: "quantum", to_tier: "quantum" }];
    const settle1 = await admin.rpc("finalize_league_week", { p_week: PAST_WEEK, p_results: results });
    const settle2 = await admin.rpc("finalize_league_week", { p_week: PAST_WEEK, p_results: results });
    record("A week settles once (a second run changes nothing)", !settle1.error && settle2.error?.code === "23505");
    const resultB = await b.client.from("league_results").select("rank").eq("week", PAST_WEEK);
    const resultA = await a.client.from("league_results").select("rank").eq("user_id", b.id);
    record("Learners read only their own results", (resultB.data ?? []).length === 1 && (resultA.data ?? []).length === 0);

    const anonLeague = createClient<Database>(env.url, env.publishableKey, noSession);
    const anonOpen = await anonLeague.rpc("leagues_open");
    const anonStandings = await anonLeague.rpc("league_standings");
    record("Signed-out visitors can ask if leagues are open, but can't read standings", anonOpen.data === true && Boolean(anonStandings.error));

    // Certificates: owners read their own; the public check shows a valid one's public fields only.
    const ct = Date.now().toString(32).toUpperCase().replace(/[ILOU]/g, "X").slice(-4).padStart(4, "0");
    const certB = `CNT-B${ct.slice(1)}-0000-0001`;
    const certBOld = `CNT-B${ct.slice(1)}-0000-0002`;
    const certA = `CNT-A${ct.slice(1)}-0000-0003`;
    const seedCerts = [
      await admin.from("certificates").insert({ id: certBOld, user_id: b.id, course_id: "stay-safe-online", name: "Bee Old", completed_on: "2026-10-01", revoked_at: new Date(Date.now() + 1000).toISOString() }),
      await admin.from("certificates").insert({ id: certB, user_id: b.id, course_id: "stay-safe-online", name: "Bee", completed_on: "2026-10-01" }),
      await admin.from("certificates").insert({ id: certA, user_id: a.id, course_id: "stay-safe-online", name: "Ace", completed_on: "2026-10-01" }),
    ];
    record("The server can issue certificates (control)", seedCerts.every((r) => !r.error), seedCerts.find((r) => r.error)?.error?.message);
    const twoActive = await admin.from("certificates").insert({ id: `CNT-C${ct.slice(1)}-0000-0004`, user_id: b.id, course_id: "stay-safe-online", name: "Bee Two", completed_on: "2026-10-01" });
    record("Only one valid certificate per learner per course", twoActive.error?.code === "23505");
    const badId = await admin.from("certificates").insert({ id: "CNT-OOOO-0000-0005", user_id: a.id, course_id: "x", name: "Ace", completed_on: "2026-10-01" });
    record("Certificate IDs must use the readable alphabet", Boolean(badId.error));
    const ownCerts = await a.client.from("certificates").select("id, user_id");
    record("A reads only their own certificates", !ownCerts.error && (ownCerts.data ?? []).length === 1 && ownCerts.data?.[0]?.id === certA);
    record(
      "Nobody can issue, change or withdraw certificates directly",
      blocked(await a.client.from("certificates").insert({ id: `CNT-D${ct.slice(1)}-0000-0006`, user_id: a.id, course_id: "x", name: "Fake", completed_on: "2026-10-01" }).select()) &&
        blocked(await a.client.from("certificates").update({ name: "Changed" }).eq("id", certA).select()) &&
        blocked(await a.client.from("certificates").update({ revoked_at: new Date().toISOString() }).eq("id", certB).select()) &&
        blocked(await a.client.from("certificates").delete().eq("id", certA).select()),
    );
    const anonCheck = createClient<Database>(env.url, env.publishableKey, noSession);
    const valid = await anonCheck.rpc("verify_certificate", { p_id: certB.toLowerCase() });
    record(
      "The public check shows a valid certificate's name, course and date only",
      !valid.error && valid.data?.length === 1 && Object.keys(valid.data[0] ?? {}).sort().join() === "completed_on,course_id,name" && valid.data[0]?.name === "Bee",
      valid.error?.message,
    );
    const revoked = await anonCheck.rpc("verify_certificate", { p_id: certBOld });
    const unknown = await anonCheck.rpc("verify_certificate", { p_id: "CNT-ZZZZ-ZZZZ-ZZZZ" });
    record("Withdrawn and unknown certificates show nothing", !revoked.error && (revoked.data ?? []).length === 0 && !unknown.error && (unknown.data ?? []).length === 0);

    // Daily lesson limit: the server counts new lessons with open_lesson (secret key only); learners
    // read only their own opens; the time zone that dates the day changes at most once every 7 days.
    const open = (user: string, lesson: string, tz?: string) =>
      admin.rpc("open_lesson", { p_user: user, p_lesson: lesson, p_limit: 3, ...(tz ? { p_time_zone: tz } : {}) });
    const opens = [await open(b.id, "rls-lesson-one"), await open(b.id, "rls-lesson-two"), await open(b.id, "rls-lesson-three")];
    const fourth = await open(b.id, "rls-lesson-four");
    const reopen = await open(b.id, "rls-lesson-two");
    record(
      "open_lesson allows 3 new lessons a day, refuses the 4th, and reopening is free",
      opens.every((r) => !r.error && r.data?.[0]?.allowed === true) && fourth.data?.[0]?.allowed === false && fourth.data?.[0]?.used === 3 && reopen.data?.[0]?.allowed === true,
      (opens.find((r) => r.error) ?? fourth).error?.message,
    );
    const ownOpens = await b.client.from("lesson_opens").select("user_id, lesson_id");
    const theirOpens = await a.client.from("lesson_opens").select("user_id").eq("user_id", b.id);
    record("Learners read only their own lesson opens", !ownOpens.error && (ownOpens.data ?? []).length === 3 && (theirOpens.data ?? []).length === 0);
    record(
      "Learners can't add, change or remove lesson opens",
      blocked(await a.client.from("lesson_opens").insert({ user_id: a.id, day: "2026-10-01", lesson_id: "free-lesson" }).select()) &&
        blocked(await b.client.from("lesson_opens").delete().eq("user_id", b.id).select()) &&
        blocked(await b.client.from("lesson_opens").update({ day: "2001-01-01" }).eq("user_id", b.id).select()),
    );
    const anonLessons = createClient<Database>(env.url, env.publishableKey, noSession);
    const userCall = await a.client.rpc("open_lesson", { p_user: a.id, p_lesson: "free-lesson", p_limit: 99 });
    const anonCall = await anonLessons.rpc("open_lesson", { p_user: a.id, p_lesson: "free-lesson", p_limit: 99 });
    record("Only the server can call open_lesson", Boolean(userCall.error && anonCall.error));
    record("Learners can't set their time zone directly", blocked(await a.client.from("profiles").update({ time_zone: "Pacific/Kiritimati" }).eq("id", a.id).select()));

    const eightDaysAgo = new Date(Date.now() - 8 * 86_400_000).toISOString();
    const zoneOf = async () => (await admin.from("profiles").select("time_zone, time_zone_changed_at").eq("id", c.id).single()).data;
    await admin.from("profiles").update({ time_zone_changed_at: eightDaysAgo }).eq("id", c.id);
    await admin.from("profiles").update({ time_zone: "Europe/London" }).eq("id", c.id);
    const first = await zoneOf();
    await admin.from("profiles").update({ time_zone: "Asia/Tokyo" }).eq("id", c.id);
    const tooSoon = await zoneOf();
    const viaOpen = await open(c.id, "rls-lesson-one", "Asia/Tokyo");
    const afterOpen = await zoneOf();
    record(
      "A time zone change within 7 days is ignored (even by the server and open_lesson)",
      first?.time_zone === "Europe/London" && tooSoon?.time_zone === "Europe/London" && afterOpen?.time_zone === "Europe/London" && !viaOpen.error,
      JSON.stringify({ first, tooSoon, afterOpen }),
    );
    const londonDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    record("open_lesson dates the day in the learner's saved time zone", viaOpen.data?.[0]?.day === londonDay, `${viaOpen.data?.[0]?.day} vs ${londonDay}`);
    await admin.from("profiles").update({ time_zone_changed_at: eightDaysAgo }).eq("id", c.id);
    await admin.from("profiles").update({ time_zone: "Asia/Tokyo" }).eq("id", c.id);
    record("After 7 days the time zone can change again", (await zoneOf())?.time_zone === "Asia/Tokyo");

    // Mistake review: only the server records mistakes (record_mistake, secret key only); a repeat
    // miss counts up and reopens a cleared one; learners read only their own and can't change them.
    const miss = (user: string, card: string) => admin.rpc("record_mistake", { p_user: user, p_lesson: "rls-lesson-one", p_card: card });
    const misses = [await miss(b.id, "card-a"), await miss(b.id, "card-b"), await miss(b.id, "card-a")];
    const countA = async () =>
      (await admin.from("card_mistakes").select("misses, cleared_at").match({ user_id: b.id, card_id: "card-a" }).single()).data;
    const twice = await countA();
    await admin.from("card_mistakes").update({ cleared_at: new Date().toISOString() }).match({ user_id: b.id, card_id: "card-a" });
    await miss(b.id, "card-a");
    const reopened = await countA();
    record(
      "record_mistake counts repeat misses and reopens a cleared mistake",
      misses.every((m) => !m.error) && twice?.misses === 2 && twice.cleared_at === null && reopened?.misses === 3 && reopened.cleared_at === null,
      misses.find((m) => m.error)?.error?.message ?? JSON.stringify({ twice, reopened }),
    );
    const badMiss = await admin.rpc("record_mistake", { p_user: b.id, p_lesson: "Not A Lesson!", p_card: "card-a" });
    record("Mistakes reject ids that aren't kebab-case", Boolean(badMiss.error));
    const ownMistakes = await b.client.from("card_mistakes").select("user_id, card_id");
    const theirMistakes = await a.client.from("card_mistakes").select("user_id").eq("user_id", b.id);
    record("Learners read only their own mistakes", !ownMistakes.error && (ownMistakes.data ?? []).length === 2 && (theirMistakes.data ?? []).length === 0);
    record(
      "Learners can't add, change or remove mistakes",
      blocked(await a.client.from("card_mistakes").insert({ user_id: a.id, lesson_id: "rls-lesson-one", card_id: "card-a" }).select()) &&
        blocked(await b.client.from("card_mistakes").update({ cleared_at: new Date().toISOString() }).eq("user_id", b.id).select()) &&
        blocked(await b.client.from("card_mistakes").delete().eq("user_id", b.id).select()),
    );
    const anonMistakes = createClient<Database>(env.url, env.publishableKey, noSession);
    const userMiss = await a.client.rpc("record_mistake", { p_user: a.id, p_lesson: "rls-lesson-one", p_card: "card-a" });
    const anonMiss = await anonMistakes.rpc("record_mistake", { p_user: a.id, p_lesson: "rls-lesson-one", p_card: "card-a" });
    record("Only the server can call record_mistake", Boolean(userMiss.error && anonMiss.error));

    // Founding Member: the counter is public (numbers only); only the server holds, claims and
    // refunds seats; learners read only their own seat; a claim is idempotent; a full house refuses
    // the next buyer; a refund frees the seat. (Test rows go with the test users at the end.)
    const anonSeats = createClient<Database>(env.url, env.publishableKey, noSession);
    const seatsNow = async () => (await anonSeats.rpc("founder_seats")).data?.[0];
    const before = await seatsNow();
    record("Anyone can read the founding seats counter (numbers only)", before?.total === 50, JSON.stringify(before));
    const soon = new Date(Date.now() + 30 * 60_000).toISOString();
    const userHold = await b.client.rpc("reserve_founder_seat", { p_user: b.id, p_session: "cs_test_rlsUser", p_expires: soon });
    const anonHold = await anonSeats.rpc("reserve_founder_seat", { p_user: b.id, p_session: "cs_test_rlsAnon", p_expires: soon });
    const userClaim = await b.client.rpc("claim_founder_seat", { p_user: b.id, p_session: "cs_test_rlsUser", p_payment: "pi_rlsUser", p_amount: 2900, p_currency: "aud" });
    const userRefund = await b.client.rpc("refund_founder_seat", { p_payment: "pi_rlsUser" });
    record("Only the server can hold, claim or refund a founding seat", Boolean(userHold.error && anonHold.error && userClaim.error && userRefund.error));
    const held = await admin.rpc("reserve_founder_seat", { p_user: b.id, p_session: "cs_test_rlsB1", p_expires: soon });
    const claim1 = await admin.rpc("claim_founder_seat", { p_user: b.id, p_session: "cs_test_rlsB1", p_payment: "pi_rlsB1", p_amount: 2900, p_currency: "aud" });
    const claim2 = await admin.rpc("claim_founder_seat", { p_user: b.id, p_session: "cs_test_rlsB1", p_payment: "pi_rlsB1", p_amount: 2900, p_currency: "aud" });
    const bSeats = (await admin.from("founding_members").select("id").eq("user_id", b.id)).data ?? [];
    const secondHold = await admin.rpc("reserve_founder_seat", { p_user: b.id, p_session: "cs_test_rlsB2", p_expires: soon });
    const afterClaim = await seatsNow();
    record(
      "A paid seat is claimed once (a repeat claim changes nothing), and its owner can't hold another",
      held.data === true && claim1.data === true && claim2.data === true && bSeats.length === 1 && secondHold.data === false && afterClaim?.sold === (before?.sold ?? 0) + 1,
      JSON.stringify({ held: held.data ?? held.error?.message, claim1: claim1.data ?? claim1.error?.message, seats: bSeats.length, again: secondHold.data, afterClaim }),
    );
    const ownSeat = await b.client.from("founding_members").select("user_id");
    const theirSeat = await a.client.from("founding_members").select("user_id").eq("user_id", b.id);
    record("Learners read only their own founding seat", !ownSeat.error && (ownSeat.data ?? []).length === 1 && (theirSeat.data ?? []).length === 0);
    record(
      "Learners can't add, change or remove founding seats or holds",
      blocked(await a.client.from("founding_members").insert({ user_id: a.id, checkout_session_id: "cs_test_rlsForged", amount_total: 0, currency: "aud" }).select()) &&
        blocked(await b.client.from("founding_members").update({ refunded_at: null }).eq("user_id", b.id).select()) &&
        blocked(await b.client.from("founding_members").delete().eq("user_id", b.id).select()) &&
        blocked(await a.client.from("founder_holds").insert({ checkout_session_id: "cs_test_rlsForged", user_id: a.id, expires_at: soon }).select()) &&
        blocked(await a.client.from("founder_holds").select("*")),
    );
    // Fill every remaining seat with holds (learner a's test sessions), then a new buyer is refused.
    const full = await seatsNow();
    const free = Math.max(0, (full?.total ?? 50) - (full?.sold ?? 0) - (full?.held ?? 0));
    const fillers = Array.from({ length: free }, (_, i) => ({ checkout_session_id: `cs_test_rlsFill${i}`, user_id: a.id, expires_at: soon }));
    const filled = fillers.length ? await admin.from("founder_holds").insert(fillers) : { error: null };
    const refused = await admin.rpc("reserve_founder_seat", { p_user: c.id, p_session: "cs_test_rlsC1", p_expires: soon });
    await admin.from("founder_holds").delete().eq("user_id", a.id);
    record("With every seat sold or held, the next buyer is refused", !filled.error && refused.data === false, filled.error?.message ?? String(refused.data ?? refused.error?.message));
    const refundedUser = await admin.rpc("refund_founder_seat", { p_payment: "pi_rlsB1" });
    const refundAgain = await admin.rpc("refund_founder_seat", { p_payment: "pi_rlsB1" });
    const afterRefund = await seatsNow();
    record(
      "A refund ends the seat and frees it (once)",
      refundedUser.data === b.id && refundAgain.data === null && afterRefund?.sold === before?.sold,
      JSON.stringify({ refunded: refundedUser.data ?? refundedUser.error?.message, afterRefund }),
    );
    record("Signed-out visitors can't list Founding Members", Boolean((await anonSeats.rpc("league_founders")).error));

    // "Send to a parent": links are server-only (no policies, no grants), and go with the learner.
    const linkRow = { user_id: b.id, token_hash: "a".repeat(64), expires_at: new Date(Date.now() + 86_400_000).toISOString() };
    const madeLink = await admin.from("founder_parent_links").insert(linkRow).select("id");
    record("The server can save a parent link", !madeLink.error, madeLink.error?.message);
    record(
      "Nobody but the server can read, add, change or remove parent links",
      blocked(await b.client.from("founder_parent_links").select("*")) &&
        blocked(await anonSeats.from("founder_parent_links").select("*")) &&
        blocked(await b.client.from("founder_parent_links").insert({ ...linkRow, token_hash: "b".repeat(64) }).select()) &&
        blocked(await anonSeats.from("founder_parent_links").insert({ ...linkRow, token_hash: "c".repeat(64) }).select()) &&
        blocked(await b.client.from("founder_parent_links").update({ paid_at: new Date().toISOString() }).eq("user_id", b.id).select()) &&
        blocked(await b.client.from("founder_parent_links").delete().eq("user_id", b.id).select()),
    );
    const badHash = await admin.from("founder_parent_links").insert({ ...linkRow, token_hash: "not-a-hash" });
    record("A parent link stores only a sha256 hash", Boolean(badHash.error));

    // Signed-out visitors see nothing.
    const anon = createClient<Database>(env.url, env.publishableKey, noSession);
    let anonClean = true;
    for (const table of [
      "profiles", "card_completions", "lesson_completions", "quiz_attempts", "xp_events", "goal_days",
      "subscriptions", "pro_grants", "stripe_customers", "stripe_events",
      "league_players", "leagues", "league_members", "league_results", "league_weeks", "league_state", "handle_reports",
      "certificates", "lesson_opens", "card_mistakes", "founding_members", "founder_holds",
    ] as const) {
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
    // Put the leagues switch back exactly as it was, and remove the test leagues.
    await admin.from("league_state").update({ opened_at: leagueState?.opened_at ?? null }).eq("id", true);
    await admin.from("league_weeks").delete().eq("week", PAST_WEEK);
    await admin.from("leagues").delete().eq("week", PAST_WEEK);
    if (testLeagues.length) await admin.from("leagues").delete().in("id", testLeagues);
    // Delete the users; ON DELETE CASCADE must remove every row.
    for (const user of [a, b, c]) await admin.auth.admin.deleteUser(user.id);
    let leftovers = 0;
    for (const table of [
      "card_completions", "lesson_completions", "quiz_attempts", "xp_events", "goal_days",
      "subscriptions", "pro_grants", "stripe_customers", "league_players", "league_members", "league_results", "certificates", "lesson_opens", "card_mistakes",
      "founding_members", "founder_holds", "founder_parent_links",
    ] as const) {
      const r = await admin.from(table).select("user_id").in("user_id", [a.id, b.id, c.id]);
      leftovers += (r.data ?? []).length;
    }
    const profiles = await admin.from("profiles").select("id").in("id", [a.id, b.id, c.id]);
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
