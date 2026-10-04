// Staging rehearsal for opening leagues on production. Proves the week-end path that has never run
// live: seed a finished week with 14 players, call the REAL cron endpoint (/api/cron/leagues, the
// same thing Vercel calls hourly), and check finalize_league_week promoted the top 20% and that a
// second run changes nothing. Then (browser) a promoted learner and a packet learner each finish a
// lesson and land in the NEW week's league in the right tier, and a 0-XP learner sees a friendly
// /leagues, not an empty or broken page. Seeds and cleans up throwaway users; STAGING ONLY.
//
// Run with a staging dev server up (npm run dev, .env.local on staging with CRON_SECRET), then:
//   E2E_BROWSER=chrome node scripts/e2e/leagues-rehearsal.mjs
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";

const APP = path.resolve(import.meta.dirname, "../..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(APP, ".env.local"), "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const PROD_REF = "qyjmowpkdcunkfitbwca";
const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (url.includes(PROD_REF) || !/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url)) {
  console.error(`REFUSING: not a staging project URL (${url}).`);
  process.exit(2);
}
if (!env.CRON_SECRET) {
  console.error("REFUSING: no CRON_SECRET in .env.local (needed to call the cron endpoint).");
  process.exit(2);
}
const admin = createClient(url, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const TZ = "Australia/Sydney";
const nowIso = new Date().toISOString();
const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });

const results = [];
const ok = (name, pass, detail = "") => {
  results.push(pass);
  console.log(`${pass ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};

const addDays = (day, n) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

const userIds = [];
const leagueIds = [];
let priorOpenedAt = null;
let WEEK = null;
let LAST = null;

async function makeUser(name, { tier = "packet" } = {}) {
  const email = `rh-${name.toLowerCase()}-${Date.now()}-${Math.round(performance.now())}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  const id = data.user.id;
  userIds.push(id);
  await admin.from("profiles").update({ username: name, age_confirmed: true, time_zone: TZ }).eq("id", id);
  await admin.from("league_players").insert({ user_id: id, tier, show_on_leaderboards: true });
  return { id, email, name };
}

async function addXp(userId, total, atIso, day) {
  let left = total;
  const rows = [];
  while (left > 0) {
    const xp = Math.min(50, left);
    rows.push({ user_id: userId, at: atIso, day, time_zone: TZ, kind: "card", lesson_id: "seed-lesson", xp });
    left -= xp;
  }
  if (rows.length) {
    const { error } = await admin.from("xp_events").insert(rows);
    if (error) throw error;
  }
}

// A learner who earned XP this week but was never placed (simulates onXpEarned's after() being
// dropped): auth user + profile + xp_events, but NO league_players / league_members row.
async function makeRawEarner(name, { withUsername = true } = {}) {
  const email = `rh-raw-${name.toLowerCase()}-${Date.now()}-${Math.round(performance.now())}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  const id = data.user.id;
  userIds.push(id);
  await admin.from("profiles").update({ username: withUsername ? name : null, age_confirmed: true, time_zone: TZ }).eq("id", id);
  return { id, email, name };
}

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "chrome", headless: true });

async function signIn(email, next = "/") {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, colorScheme: "dark" });
  const page = await ctx.newPage();
  await page.route(/\/script\.js$|\/_vercel\/insights\//, (r) => r.abort());
  await prepare(page);
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=${encodeURIComponent(next)}`);
  await page.waitForURL((u) => !u.pathname.startsWith("/auth/"), { timeout: 60000 });
  return { ctx, page };
}

// Finish a first lesson by seeding all its core cards but the recap, then clicking Continue once.
const BITS = { id: "bits-and-binary", core: ["make-5", "switches-and-bits", "make-42", "order-binary", "largest-byte"] };
async function finishLesson(userId, email) {
  await admin.from("card_completions").upsert(BITS.core.map((cid) => ({ user_id: userId, lesson_id: BITS.id, card_id: cid, completed_at: new Date().toISOString(), xp: 10 })));
  const { ctx, page } = await signIn(email, `/lesson/${BITS.id}`);
  await page.getByRole("button", { name: /Play it anyway/ }).click({ timeout: 4000 }).catch(() => {});
  const cont = page.getByRole("button", { name: /^Continue/ });
  await cont.first().waitFor({ timeout: 30000 });
  await cont.first().click();
  await page.getByText("Lesson complete").waitFor({ timeout: 30000 });
  await ctx.close();
}

try {
  // Clean slate (STAGING only — no real data): clear any leftover league rows AND finalized-week
  // records (league_weeks has no FK cascade, so deleting leagues/users doesn't remove it).
  const existing = (await admin.from("leagues").select("id")).data ?? [];
  if (existing.length) await admin.from("leagues").delete().in("id", existing.map((l) => l.id));
  await admin.from("league_weeks").delete().neq("week", "1970-01-01");

  const weekRow = (await admin.rpc("league_week")).data;
  WEEK = typeof weekRow === "string" ? weekRow : (weekRow?.[0]?.league_week ?? weekRow);
  LAST = addDays(WEEK, -7);
  const lastAtIso = `${LAST}T02:00:00.000Z`; // 13:00 Sydney on the Monday of LAST: inside the week
  priorOpenedAt = (await admin.from("league_state").select("opened_at").maybeSingle()).data?.opened_at ?? null;

  // Leagues opened two weeks before LAST, so LAST is a finished, due week.
  await admin.from("league_state").update({ opened_at: `${addDays(LAST, -14)}T00:00:00.000Z` }).eq("id", true);

  // A finished Packet league last week: 14 players with rising XP (top two clear 50 to be promotable).
  const { data: lg, error: lgErr } = await admin.from("leagues").insert({ week: LAST, tier: "packet", band: "light" }).select("id").single();
  if (lgErr) throw lgErr;
  leagueIds.push(lg.id);
  const players = [];
  for (let i = 0; i < 14; i++) players.push(await makeUser(`Rh${String(i).padStart(2, "0")}`));
  for (let i = 0; i < 14; i++) {
    await admin.from("league_members").insert({ week: LAST, user_id: players[i].id, league_id: lg.id });
    await addXp(players[i].id, 10 + i * 8, lastAtIso, LAST); // 10..114; ranks follow i desc
  }

  // Two learners who earned XP THIS week but were never placed (dropped after()): one with a
  // username, one without. The cron's reconcile must place both and generate the missing username.
  const rawNamed = await makeRawEarner("RhReconcile");
  const rawNull = await makeRawEarner("RhNoName", { withUsername: false });
  await addXp(rawNamed.id, 40, nowIso, today);
  await addXp(rawNull.id, 30, nowIso, today);

  // ── Finalize + reconcile via the real cron endpoint. ──
  const res = await fetch(`${BASE}/api/cron/leagues`, { headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });
  const body = await res.json().catch(() => ({}));
  ok("Cron endpoint returns 200", res.status === 200, `status ${res.status}`);
  ok("Cron settled last week", Array.isArray(body.settled) && body.settled.includes(LAST), JSON.stringify(body));

  const wk = (await admin.from("league_weeks").select("week").eq("week", LAST)).data ?? [];
  ok("league_weeks records the finished week", wk.length === 1, LAST);
  const rr = (await admin.from("league_results").select("user_id, rank, weekly_xp, from_tier, to_tier").eq("week", LAST).order("rank")).data ?? [];
  ok("A result row per player (14)", rr.length === 14, `${rr.length} rows`);
  const ranksOrdered = rr.every((r, i) => r.rank === i + 1) && rr.every((r, i) => i === 0 || rr[i - 1].weekly_xp >= r.weekly_xp);
  ok("Ranked by weekly XP, 1..14", ranksOrdered, rr.map((r) => `#${r.rank}:${r.weekly_xp}`).slice(0, 4).join(" "));
  const promoted = rr.filter((r) => r.to_tier === "switch");
  ok("Top 20% (2 of 14) promoted to Switch", promoted.length === 2 && promoted.every((r) => r.rank <= 2), promoted.map((r) => `#${r.rank}`).join(","));
  ok("No demotions from Packet", rr.every((r) => r.to_tier === "packet" || r.to_tier === "switch"), "");
  const promotedIds = new Set(promoted.map((r) => r.user_id));
  const tiersNow = (await admin.from("league_players").select("user_id, tier").in("user_id", players.map((p) => p.id))).data ?? [];
  const tiersRight = tiersNow.every((t) => (promotedIds.has(t.user_id) ? t.tier === "switch" : t.tier === "packet"));
  ok("league_players tiers updated to match", tiersRight, "");

  // ── Idempotency: a second cron run changes nothing. ──
  const res2 = await fetch(`${BASE}/api/cron/leagues`, { headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });
  const body2 = await res2.json().catch(() => ({}));
  const rr2 = (await admin.from("league_results").select("user_id").eq("week", LAST)).data ?? [];
  ok("Second cron run doesn't re-settle the week", Array.isArray(body2.settled) && !body2.settled.includes(LAST) && rr2.length === 14, JSON.stringify(body2.settled));

  // ── Reconcile: the cron placed the two unplaced current-week earners (dropped-after() safety net). ──
  const nowMembers = new Set(((await admin.from("league_members").select("user_id").eq("week", WEEK)).data ?? []).map((m) => m.user_id));
  ok("Reconcile placed an unplaced current-week earner", nowMembers.has(rawNamed.id));
  const nullProfile = (await admin.from("profiles").select("username").eq("id", rawNull.id).maybeSingle()).data;
  ok("Reconcile placed the earner who had no username, and generated one", nowMembers.has(rawNull.id) && !!nullProfile?.username, nullProfile?.username ?? "still null");
  ok("Cron response reports how many it placed", typeof body.placed === "number" && body.placed >= 2, `placed=${body.placed}`);

  // ── Next week fills: a promoted learner and a Packet learner each finish a lesson. ──
  const promotedPlayer = players.find((p) => promotedIds.has(p.id));
  const packetPlayer = players.find((p) => !promotedIds.has(p.id));
  await finishLesson(promotedPlayer.id, promotedPlayer.email);
  await finishLesson(packetPlayer.id, packetPlayer.email);

  // Placement runs in after() (async), so poll briefly for each learner's new-week tier.
  const tierOf = async (userId) => {
    const m = (await admin.from("league_members").select("league_id").match({ week: WEEK, user_id: userId }).maybeSingle()).data;
    if (!m) return null;
    return (await admin.from("leagues").select("tier").eq("id", m.league_id).maybeSingle()).data?.tier ?? null;
  };
  const waitTier = async (userId, expected) => {
    for (let i = 0; i < 12; i++) {
      const t = await tierOf(userId);
      if (t === expected) return t;
      await new Promise((r) => setTimeout(r, 500));
    }
    return tierOf(userId);
  };
  const promotedTier = await waitTier(promotedPlayer.id, "switch");
  const packetTier = await waitTier(packetPlayer.id, "packet");
  for (const l of (await admin.from("leagues").select("id").eq("week", WEEK)).data ?? []) if (!leagueIds.includes(l.id)) leagueIds.push(l.id);
  ok("Promoted learner joins the new week in Switch", promotedTier === "switch", promotedTier ?? "not placed");
  ok("Packet learner joins the new week in Packet", packetTier === "packet", packetTier ?? "not placed");

  // ── /leagues is friendly for a learner with 0 XP this week (a member with no XP yet). ──
  const zero = await makeUser("RhZero");
  const { ctx, page } = await signIn(zero.email, "/leagues");
  await page.goto(`${BASE}/leagues`);
  const earnMsg = await page.getByText(/Earn XP to join this week|Earn XP this week/).first().waitFor({ timeout: 20000 }).then(() => true, () => false);
  const noError = !(await page.getByText(/Couldn't load your league/).count());
  ok("0-XP learner sees a friendly /leagues (not empty/broken)", earnMsg && noError, "");
  await ctx.close();

  // A promoted learner sees their result screen first, then the leaderboard with their row.
  const { ctx: c2, page: p2 } = await signIn(promotedPlayer.email, "/leagues");
  await p2.goto(`${BASE}/leagues`);
  const resultShown = await p2.getByRole("heading", { name: /Promoted to Switch!/ }).waitFor({ timeout: 20000 }).then(() => true, () => false);
  ok("Promoted learner sees their result screen on /leagues", resultShown, "");
  await p2.getByRole("button", { name: /See this week's league/ }).click({ timeout: 10000 }).catch(() => {});
  const standingsShown = await p2.getByRole("button", { name: new RegExp(promotedPlayer.name) }).first().waitFor({ timeout: 20000 }).then(() => true, () => false);
  ok("…then the leaderboard with their row", standingsShown, "");
  await c2.close();
} catch (e) {
  console.error(e);
  results.push(false);
} finally {
  await browser.close();
  if (leagueIds.length) await admin.from("leagues").delete().in("id", leagueIds);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
  // league_weeks has no cascade, so remove the weeks this rehearsal finalized.
  if (LAST) await admin.from("league_weeks").delete().in("week", [LAST, WEEK]);
  await admin.from("league_state").update({ opened_at: priorOpenedAt }).eq("id", true);
  const stray = (await admin.from("leagues").select("id")).data ?? [];
  const strayWeeks = (await admin.from("league_weeks").select("week")).data ?? [];
  console.log(`cleanup: ${userIds.length} users deleted, ${leagueIds.length} leagues deleted, opened_at restored (${priorOpenedAt ?? "null"}), stray leagues ${stray.length}, stray league_weeks ${strayWeeks.length}`);
}

const failed = results.filter((r) => !r).length;
console.log(failed ? `\n${failed} check(s) FAILED` : `\nAll ${results.length} rehearsal checks passed.`);
process.exit(failed ? 1 : 0);
