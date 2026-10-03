// Leagues, end to end: seeds a throwaway league, signs in a real test learner, and screenshots
// every moment at 360×560 — the first-open celebration, the live leaderboard (a rank moving up on
// a poll, no reload), and the promoted / demoted / stayed result screens. Throwaway users and
// leagues only; everything is deleted and league_state is put back afterwards.
//
// SAFETY: this opens league_state and writes league rows, so it must NEVER run against production.
// It refuses unless the Supabase URL is a non-production project. Run it against STAGING with a
// dev server on :3000 (npm run dev), secret key in .env.local:
//   E2E_BROWSER=chrome node scripts/e2e/leagues.mjs
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";

const APP = path.resolve(import.meta.dirname, "../..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(APP, ".env.local"), "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);

// ── Production guard: never seed league data into the live project. ──
const PROD_REF = "qyjmowpkdcunkfitbwca";
const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (url.includes(PROD_REF)) {
  console.error(`REFUSING: NEXT_PUBLIC_SUPABASE_URL points at production (${PROD_REF}). This harness seeds league data and must only run against staging.`);
  process.exit(2);
}
if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url)) {
  console.error(`REFUSING: NEXT_PUBLIC_SUPABASE_URL is not a bare project API URL (${url}).`);
  process.exit(2);
}

const admin = createClient(url, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SHOTS = path.join(APP, ".e2e-shots", "leagues");
fs.mkdirSync(SHOTS, { recursive: true });
const TZ = "Australia/Sydney";

const results = [];
const record = (check, ok, detail = "") => {
  results.push({ check, ok });
  console.log(`${ok ? "✓" : "✗"} ${check}${detail ? ` (${detail})` : ""}`);
};

const addDays = (day, n) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

// The exact Monday the app/database use for this week (so our seeding lines up with league_week()).
const { data: weekRow, error: weekErr } = await admin.rpc("league_week");
if (weekErr) throw weekErr;
const WEEK = typeof weekRow === "string" ? weekRow : weekRow?.[0]?.league_week ?? weekRow;
const nowIso = new Date().toISOString();
const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });

// A real lesson, to give "me" some progress so the dashboard shows its full layout (with the
// leagues card) rather than the newcomer welcome. These completions set total XP and the course
// ring; they are NOT xp_events, so they don't change this week's league standings.
const lesson = JSON.parse(fs.readFileSync(path.join(APP, "content/courses/stay-safe-online/modules/01-lock-your-accounts/lessons/01-strong-passwords.json"), "utf8"));
const gradedCards = lesson.cards.filter((c) => c.difficulty === "core" && "prompt" in c).slice(0, 3);

// Track what we create, to clean up.
const userIds = [];
const leagueIds = [];
let priorOpenedAt = null;

async function makeLearner(name, { tier = "packet", show = true } = {}) {
  const email = `lg-${name.toLowerCase()}-${Date.now()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  const id = data.user.id;
  userIds.push(id);
  await admin.from("profiles").update({ username: name, age_confirmed: true, time_zone: TZ }).eq("id", id);
  await admin.from("league_players").insert({ user_id: id, tier, show_on_leaderboards: show });
  return { id, email, name };
}

async function makeLeague(week, tier) {
  const { data, error } = await admin.from("leagues").insert({ week, tier, band: "regular" }).select("id").single();
  if (error) throw error;
  leagueIds.push(data.id);
  return data.id;
}

async function addMember(userId, leagueId, week) {
  const { error } = await admin.from("league_members").insert({ week, user_id: userId, league_id: leagueId });
  if (error) throw error;
}

async function addXp(userId, xp, at = nowIso) {
  const { error } = await admin.from("xp_events").insert({ user_id: userId, at, day: today, time_zone: TZ, kind: "card", lesson_id: "seed-lesson", xp });
  if (error) throw error;
}

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "chrome", headless: true });

async function signInContext(email) {
  const context = await browser.newContext({ viewport: { width: 360, height: 560 }, colorScheme: "dark", deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.route(/\/script\.js$|\/_vercel\/insights\//, (r) => r.abort());
  await prepare(page);
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=/`);
  await page.waitForURL((u) => !u.pathname.startsWith("/auth/"), { timeout: 60000 });
  return { context, page };
}

try {
  // Open leagues (remember the prior value to restore it).
  priorOpenedAt = (await admin.from("league_state").select("opened_at").maybeSingle()).data?.opened_at ?? null;
  await admin.from("league_state").update({ opened_at: nowIso }).eq("id", true);

  // Seed this week's league: me + five others with rising XP, so I start last.
  const tierLeague = await makeLeague(WEEK, "packet");
  const me = await makeLearner("PacketPilot");
  // Give "me" a finished lesson so the dashboard shows its full layout (not the newcomer welcome).
  await admin.from("card_completions").insert(gradedCards.map((c) => ({ user_id: me.id, lesson_id: lesson.id, card_id: c.id, completed_at: nowIso, xp: 10 })));
  await admin.from("lesson_completions").insert({ user_id: me.id, lesson_id: lesson.id, completed_at: nowIso, xp: 20 });
  const others = [];
  for (let i = 0; i < 5; i++) others.push(await makeLearner(`Learner${i}`));
  const everyone = [me, ...others];
  for (const p of everyone) await addMember(p.id, tierLeague, WEEK);
  await addXp(me.id, 10);
  const xps = [15, 20, 25, 30, 35];
  for (let i = 0; i < others.length; i++) await addXp(others[i].id, xps[i]);

  // ── Moment 1: the first-open celebration, on the dashboard. ──
  {
    const { context, page } = await signInContext(me.email);
    const dialog = page.getByRole("heading", { name: "Leagues are open!" });
    const shown = await dialog.waitFor({ timeout: 20000 }).then(() => true, () => false);
    record("First-open celebration appears on the dashboard", shown);
    await page.waitForTimeout(900); // badge springs in
    await page.screenshot({ path: path.join(SHOTS, "opening.png") });
    // Dismiss it, then screenshot the dashboard leagues card underneath.
    await page.getByRole("button", { name: "Not now" }).click().catch(() => {});
    const card = page.getByRole("heading", { name: /League$/ }).first();
    const cardShown = await card.waitFor({ timeout: 15000 }).then(() => true, () => false);
    if (cardShown) await card.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SHOTS, "dashboard-open.png") });
    record("Dashboard shows the open-league card after dismiss", cardShown);
    await context.close();
  }

  // ── Moment 2: the live leaderboard, and a rank rising on a poll (no reload). ──
  {
    const { context, page } = await signInContext(me.email);
    await page.goto(`${BASE}/leagues`);
    const myRow = page.getByRole("button", { name: /PacketPilot/ });
    await myRow.waitFor({ timeout: 30000 });
    const rankBefore = await page.locator("ol[aria-label=\"This week's league\"] li").evaluateAll(
      (lis) => lis.findIndex((li) => /PacketPilot/.test(li.textContent ?? "")) + 1,
    );
    record("Leaderboard lists the learner's league", rankBefore > 0, `rank ${rankBefore} of 6`);
    await page.screenshot({ path: path.join(SHOTS, "standings.png"), fullPage: true });

    // Bump me to the top, then wait for the 60s poll to move me up WITHOUT a reload.
    await addXp(me.id, 50, new Date(Date.now() + 1000).toISOString());
    await addXp(me.id, 50, new Date(Date.now() + 2000).toISOString());
    const moved = await page
      .locator("ol[aria-label=\"This week's league\"] li")
      .first()
      .getByText(/PacketPilot/)
      .waitFor({ timeout: 75000 })
      .then(() => true, () => false);
    const rankAfter = await page.locator("ol[aria-label=\"This week's league\"] li").evaluateAll(
      (lis) => lis.findIndex((li) => /PacketPilot/.test(li.textContent ?? "")) + 1,
    );
    record("A rank rises on the live poll, no reload", moved && rankAfter === 1, `rank ${rankBefore} → ${rankAfter}`);
    await page.screenshot({ path: path.join(SHOTS, "standings-live.png"), fullPage: true });
    await context.close();
  }

  // ── Moment 3: the three result screens. ──
  {
    const { context, page } = await signInContext(me.email);
    const outcomes = [
      { key: "promoted", from: "packet", to: "switch", rank: 1, label: /Promoted to Switch!/ },
      { key: "demoted", from: "router", to: "switch", rank: 5, label: /On to Switch/ },
      { key: "stayed", from: "router", to: "router", rank: 3, label: /You stayed in Router/ },
    ];
    for (let i = 0; i < outcomes.length; i++) {
      const o = outcomes[i];
      const week = addDays(WEEK, -7 * (i + 1));
      const lid = await makeLeague(week, o.from);
      await admin.from("league_results").insert({ week, user_id: me.id, league_id: lid, rank: o.rank, weekly_xp: 120 - i * 30, from_tier: o.from, to_tier: o.to });
      await page.goto(`${BASE}/leagues`);
      const heading = page.getByRole("heading", { name: o.label });
      const ok = await heading.waitFor({ timeout: 30000 }).then(() => true, () => false);
      record(`Result screen: ${o.key}`, ok);
      await page.waitForTimeout(900); // badge springs / confetti settles
      // Full page: at 360×560 the headline and mascot sit above the fold, so capture everything.
      await page.screenshot({ path: path.join(SHOTS, `result-${o.key}.png`), fullPage: true });
      await admin.from("league_results").update({ seen_at: new Date().toISOString() }).match({ user_id: me.id, week });
    }
    await context.close();
  }

  // ── Moment 4: the "You moved up to #N" moment on the lesson-complete screen. ──
  {
    // Seed a first lesson complete except its final recap, so the player opens on the recap: one
    // Continue finishes the lesson and shows the complete screen. "me" is rank 1 (110 XP this week),
    // and we seed a worse stored rank so the moment celebrates the rise.
    const LESSON = "bits-and-binary";
    const CORE_BEFORE_RECAP = ["make-5", "switches-and-bits", "make-42", "order-binary", "largest-byte"];
    await admin.from("card_completions").insert(CORE_BEFORE_RECAP.map((id) => ({ user_id: me.id, lesson_id: LESSON, card_id: id, completed_at: nowIso, xp: 10 })));

    const { context, page } = await signInContext(me.email);
    await page.addInitScript((uid) => {
      try {
        localStorage.setItem(`cybernet.leagueRank.${uid}`, "4");
      } catch {}
    }, me.id);
    await page.goto(`${BASE}/lesson/${LESSON}`);
    // A learner with progress deep-linking in Path mode may see the gate; play it anyway.
    await page.getByRole("button", { name: /Play it anyway/ }).click({ timeout: 4000 }).catch(() => {});
    // Land on the recap explainer; Continue finishes the lesson.
    const continueBtn = page.getByRole("button", { name: /^Continue/ });
    await continueBtn.first().waitFor({ timeout: 30000 });
    await continueBtn.first().click();
    await page.getByText("Lesson complete").waitFor({ timeout: 30000 }).catch(() => {});
    const moment = page.getByText(/You moved up to/);
    const shown = await moment.waitFor({ timeout: 15000 }).then(() => true, () => false);
    record("Lesson-complete screen shows the rank-up moment", shown, shown ? await moment.innerText().then((t) => t.replace(/\s+/g, " ").trim()) : "");
    await page.screenshot({ path: path.join(SHOTS, "lesson-complete-rank.png"), fullPage: true });
    await context.close();
  }
} catch (e) {
  console.error(e);
  results.push({ check: "no errors", ok: false });
} finally {
  await browser.close();
  // Clean up: delete leagues (no user cascade reaches them), then users (cascades the rest),
  // then restore league_state.
  if (leagueIds.length) await admin.from("leagues").delete().in("id", leagueIds);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
  await admin.from("league_state").update({ opened_at: priorOpenedAt }).eq("id", true);
  const leftMembers = (await admin.from("league_members").select("week").in("league_id", leagueIds.length ? leagueIds : ["00000000-0000-0000-0000-000000000000"])).data ?? [];
  console.log(`cleanup: ${userIds.length} users deleted, ${leagueIds.length} leagues deleted, league_state restored (opened_at=${priorOpenedAt ?? "null"}), stray members ${leftMembers.length}`);
}

const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `${failed} check(s) failed` : `All ${results.length} checks passed.`);
console.log(`Screenshots in ${path.relative(APP, SHOTS)}/`);
process.exit(failed ? 1 : 0);
