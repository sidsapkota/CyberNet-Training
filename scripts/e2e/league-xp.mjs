// League XP can't be farmed: the reset-and-replay exploit, end to end on STAGING (refuses production).
// A throwaway learner in this week's league earns XP for a card in the real app, presses "Reset all
// progress", and earns it again. Then, and after a practice event is added:
// - league_standings() (read as the learner) and the server's weekly sum leave practice out;
// - weekly league XP never exceeds total XP (the invariant), for this learner and for every
//   learner in this week's staging leagues.
// The learner is deleted afterwards (cascade), and league_state is put back exactly as it was.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";
import { readEnvEntries } from "./lib/env.mjs";

const APP = path.resolve(import.meta.dirname, "../..");
const env = Object.fromEntries(
  readEnvEntries(APP),
);
if (env.NEXT_PUBLIC_SUPABASE_URL.includes("qyjmowpkdcunkfitbwca")) {
  console.error("e2e:league-xp writes league data: it runs on staging only, never production.");
  process.exit(1);
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const LESSON = "what-is-an-ip-address";
const card = JSON.parse(
  fs.readFileSync(path.join(APP, "content/courses/how-the-internet-works/modules/02-ip-addresses/lessons/01-what-is-an-ip-address.json"), "utf8"),
).cards[0];
if (card.type !== "multiple_choice") throw new Error(`${LESSON} card 1 must be multiple choice for this test`);
const right = card.options.find((o) => o.id === card.correctOptionId).text;

const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};
const until = async (what, check, ms = 30000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await check()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${what}`);
};

/** Total XP, as the dashboard counts it: card and lesson completions plus each quiz's first pass. */
async function totalXp(userId) {
  const [cards, lessons, quizzes] = await Promise.all([
    admin.from("card_completions").select("xp").eq("user_id", userId),
    admin.from("lesson_completions").select("xp").eq("user_id", userId),
    admin.from("quiz_attempts").select("quiz_id, xp, attempted_at").eq("user_id", userId).order("attempted_at"),
  ]);
  const firstPass = new Map();
  for (const q of quizzes.data ?? []) if (!firstPass.has(q.quiz_id) && q.xp > 0) firstPass.set(q.quiz_id, q.xp);
  const sum = (rows) => (rows ?? []).reduce((s, r) => s + r.xp, 0);
  return sum(cards.data) + sum(lessons.data) + [...firstPass.values()].reduce((s, x) => s + x, 0);
}

/** This week's window (Monday 00:00 Sydney), from the database's own league_week(). */
async function weekWindow() {
  const { data } = await admin.rpc("league_week");
  return { week: data };
}

/** Weekly league XP the way the server sums it (src/lib/leagues/server.ts weeklyXp: no practice). */
async function serverWeeklyXp(userId, sinceIso) {
  const { data } = await admin.from("xp_events").select("xp, kind").eq("user_id", userId).neq("kind", "practice").gte("at", sinceIso);
  return (data ?? []).reduce((s, r) => s + r.xp, 0);
}

const email = `league-xp-e2e-${Date.now()}@example.com`;
let userId = null;
const { data: stateBefore } = await admin.from("league_state").select("opened_at").eq("id", true).maybeSingle();
const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  if (!stateBefore?.opened_at) await admin.from("league_state").update({ opened_at: new Date().toISOString() }).eq("id", true);
  const { week } = await weekWindow();
  const weekStart = new Date(`${week}T00:00:00+11:00`); // a little early is fine: nothing older exists for a new learner

  const { data: created, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  userId = created.user.id;
  await admin.from("profiles").update({ username: `E2e_${Math.random().toString(36).slice(2, 12)}`, age_confirmed: true }).eq("id", userId);
  await admin.from("league_players").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  const joined = await admin.rpc("join_league", { p_user: userId, p_week: week, p_tier: "packet", p_bands: ["light", "regular", "keen"], p_cap: 30 });
  if (joined.error) throw joined.error;

  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, colorScheme: "dark", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await prepare(page);
  page.on("dialog", (d) => void d.accept()); // "Reset all your progress and XP?"
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=/`);
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 30000 });

  const playCard = async () => {
    await page.goto(`${BASE}/lesson/${LESSON}`);
    await page.getByRole("radio", { name: right }).click({ timeout: 30000 });
    await page.getByRole("button", { name: "Check" }).click();
    await page.getByRole("button", { name: "Continue" }).waitFor({ timeout: 30000 });
  };
  const cardDone = async () => ((await admin.from("card_completions").select("card_id").match({ user_id: userId, lesson_id: LESSON, card_id: card.id })).data ?? []).length === 1;

  // 1. Earn the card's XP.
  await playCard();
  await until("the card to be saved", cardDone);
  const first = { total: await totalXp(userId), weekly: await serverWeeklyXp(userId, weekStart.toISOString()) };
  record("Earning a card pays its XP once", first.total === 10 && first.weekly === 10, JSON.stringify(first));

  // 2. Reset all progress (the dashboard button), then earn it again.
  await page.goto(`${BASE}/`);
  // A new learner first meets the one-time "Leagues are open!" celebration: close it as they would.
  const opening = page.getByRole("dialog").getByRole("button", { name: "Not now" });
  if (await opening.waitFor({ timeout: 8000 }).then(() => true, () => false)) await opening.click();
  await page.getByRole("button", { name: "Reset all progress" }).click({ timeout: 30000 });
  await until("progress and XP events to clear", async () => !(await cardDone()) && ((await admin.from("xp_events").select("id").eq("user_id", userId)).data ?? []).length === 0);
  record("Reset clears the card, its XP and its XP events", (await totalXp(userId)) === 0 && (await serverWeeklyXp(userId, weekStart.toISOString())) === 0);
  await playCard();
  await until("the replayed card to be saved", cardDone);
  const replay = { total: await totalXp(userId), weekly: await serverWeeklyXp(userId, weekStart.toISOString()) };
  record("Reset and replay: weekly league XP stays within total XP (no double pay)", replay.weekly <= replay.total && replay.weekly === 10, JSON.stringify(replay));

  // 3. A practice event (a replay of a finished card) never counts toward the league.
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());
  const practice = await admin.from("xp_events").insert({ user_id: userId, at: new Date().toISOString(), day, time_zone: "Australia/Sydney", kind: "practice", lesson_id: LESSON, card_id: card.id, xp: 5 });
  if (practice.error) throw practice.error;
  const viewer = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const link2 = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const signedIn = await viewer.auth.verifyOtp({ token_hash: link2.data.properties.hashed_token, type: "magiclink" });
  if (signedIn.error) throw signedIn.error;
  const standings = await viewer.rpc("league_standings");
  if (standings.error) throw standings.error;
  const me = (standings.data ?? []).find((r) => r.is_me);
  const total = await totalXp(userId);
  record("league_standings() leaves practice out (weekly 10 with a 5 XP practice event)", me?.weekly_xp === 10, `weekly ${me?.weekly_xp}`);
  record("The server's weekly sum agrees with league_standings()", (await serverWeeklyXp(userId, weekStart.toISOString())) === me?.weekly_xp);
  record("Invariant for this learner: weekly league XP ≤ total XP", (me?.weekly_xp ?? Infinity) <= total, `${me?.weekly_xp} ≤ ${total}`);

  // 4. The invariant for everyone in this week's staging leagues.
  const { data: members } = await admin.from("league_members").select("user_id").eq("week", week);
  const ids = [...new Set((members ?? []).map((m) => m.user_id))];
  let over = 0;
  for (const id of ids) if ((await serverWeeklyXp(id, weekStart.toISOString())) > (await totalXp(id))) over += 1;
  record(`Invariant for all ${ids.length} learners in this week's staging leagues`, over === 0, over ? `${over} over` : "");
  await ctx.close();
} finally {
  await browser.close();
  if (userId) await admin.auth.admin.deleteUser(userId);
  await admin.from("league_state").update({ opened_at: stateBefore?.opened_at ?? null }).eq("id", true);
  const { data: stateAfter } = await admin.from("league_state").select("opened_at").eq("id", true).maybeSingle();
  record("league_state put back exactly as it was", (stateAfter?.opened_at ?? null) === (stateBefore?.opened_at ?? null));
}
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} check(s) FAILED` : `\nAll ${results.length} checks passed.`);
process.exit(failed ? 1 : 0);
