// Reminder emails, end to end on STAGING (refuses production). Dev server running, CRON_SECRET in
// .env.local. Nothing is delivered: the throwaway learners use @example.com addresses, and outside
// production only the owner's test inbox could ever receive one (the rest are dry runs).
// - Sign-up ("Pick a username") shows the opt-in, unticked; ticking it saves consent.
// - /account has the switch; it turns off and on.
// - The hourly job, at 7 pm in the learner's time zone, records one streak reminder for an opted-in
//   learner with a streak and no XP today, and nothing for a learner who didn't opt in or one who
//   already learned today; running it again sends nothing more (one a day).
// - The open image and the button note the open and the return (only with the right key).
// - The one-tap unsubscribe link turns reminders off without signing in.
// - The one-time dashboard card for accounts made before the sign-up opt-in: "Remind me" opts in
//   (consent recorded), "No thanks" hides it for good, and newer accounts never see it.
//   npm run e2e:reminders
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";
import { readEnvEntries, PRODUCTION_REF } from "./lib/env.mjs";
import { layoutProblems } from "./lib/layout.mjs";
import { closeLeaguesWelcome } from "./lib/welcome.mjs";

const APP = path.resolve(import.meta.dirname, "../..");
const env = Object.fromEntries(readEnvEntries(APP));
if (env.NEXT_PUBLIC_SUPABASE_URL.includes(PRODUCTION_REF)) throw new Error("e2e:reminders creates learners and runs the reminder job: staging only.");
if (!env.CRON_SECRET) throw new Error("e2e:reminders needs CRON_SECRET in .env.local (any 16+ characters locally).");
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SHOTS = path.join(APP, ".e2e-shots");

const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};

/** A fixed-offset zone where it's 7 pm right now (with a few minutes to spare), and its date. */
function zoneAtSeven() {
  const now = new Date();
  if (now.getUTCMinutes() >= 55) throw new Error("Too close to the hour; run again in a few minutes.");
  for (let offset = -12; offset <= 14; offset++) {
    const tz = offset === 0 ? "Etc/GMT" : `Etc/GMT${offset > 0 ? "-" : "+"}${Math.abs(offset)}`; // Etc signs are reversed
    const hour = Number(new Intl.DateTimeFormat("en-AU", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(now));
    if (hour === 19) {
      const day = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);
      const yesterday = new Date(Date.parse(`${day}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
      return { tz, day, yesterday };
    }
  }
  throw new Error("No zone at 7 pm");
}

const users = [];
async function learner(label, { username = null, optIn = false, xpToday = false } = {}, zone) {
  const email = `reminders-e2e-${label}-${Date.now()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  const id = data.user.id;
  users.push(id);
  const profile = await admin.from("profiles").update({ username, age_confirmed: true, time_zone: zone.tz, reminder_emails: optIn, reminder_consent_at: optIn ? new Date().toISOString() : null }).eq("id", id);
  if (profile.error) throw profile.error;
  // A 1-day streak: yesterday's goal was met.
  const met = await admin.from("goal_days").insert({ user_id: id, day: zone.yesterday, time_zone: zone.tz, goal: 50, met_at: new Date(Date.parse(`${zone.yesterday}T12:00:00Z`)).toISOString() });
  if (met.error) throw met.error;
  if (xpToday) {
    const xp = await admin.from("xp_events").insert({ user_id: id, at: new Date().toISOString(), day: zone.day, time_zone: zone.tz, kind: "card", lesson_id: "strong-passwords", card_id: "e2e", xp: 10 });
    if (xp.error) throw xp.error;
  }
  return { id, email };
}
const profileOf = async (id) => (await admin.from("profiles").select("reminder_emails, reminder_consent_at, email_token").eq("id", id).single()).data;
const rowsOf = async (id) => (await admin.from("reminder_emails").select("id, key, kind, day, dry_run, opened_at, returned_at").eq("user_id", id)).data ?? [];
const until = async (check, ms = 20000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await check()) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
};
const runJob = async () => {
  const r = await fetch(`${BASE}/api/cron/reminders`, { headers: { Authorization: `Bearer ${env.CRON_SECRET}` } });
  return { status: r.status, body: await r.json().catch(() => null) };
};

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  const zone = zoneAtSeven();
  const unauth = await fetch(`${BASE}/api/cron/reminders`);
  record("The reminder job refuses calls without the cron secret", unauth.status === 401);

  // 1. Sign-up: the opt-in, unticked, on "Pick a username".
  const fresh = await learner("signup", {}, zone);
  const ctx = await browser.newContext({ viewport: { width: 360, height: 560 }, colorScheme: "dark", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await prepare(page);
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email: fresh.email });
  await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=/courses`);
  await page.waitForURL((u) => u.pathname === "/account", { timeout: 60000 });
  const box = page.getByRole("checkbox", { name: /Email me before my streak or league ends/ });
  await box.waitFor({ timeout: 30000 });
  record("Sign-up shows the reminder opt-in, unticked", !(await box.isChecked()) && (await profileOf(fresh.id)).reminder_emails === false);
  const layout = await page.evaluate(layoutProblems, null);
  record("The sign-up step lays out cleanly at 360x560", layout.length === 0, JSON.stringify(layout));
  await page.screenshot({ path: path.join(SHOTS, "reminders-signup-360.png") });
  await box.check();
  const saved = await until(async () => {
    const p = await profileOf(fresh.id);
    return p.reminder_emails === true && Boolean(p.reminder_consent_at);
  });
  record("Ticking it opts in and records consent", saved);
  await page.getByRole("button", { name: "Use this" }).click();
  await page.waitForURL((u) => u.pathname === "/courses", { timeout: 30000 });

  // 2. /account: the switch.
  await page.goto(`${BASE}/account`);
  const toggle = page.getByRole("switch", { name: "Reminder emails" });
  await toggle.waitFor({ timeout: 30000 });
  record("/account shows the reminder switch, on", (await toggle.getAttribute("aria-checked")) === "true");
  await toggle.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(SHOTS, "reminders-account-360.png") });
  await toggle.click();
  const off = await until(async () => (await profileOf(fresh.id)).reminder_emails === false);
  await toggle.click();
  const on = await until(async () => (await profileOf(fresh.id)).reminder_emails === true);
  record("The switch turns reminders off and on", off && on);
  const accountLayout = await page.evaluate(layoutProblems, null);
  record("/account lays out cleanly at 360x560", accountLayout.length === 0, JSON.stringify(accountLayout));
  await ctx.close();

  // 3. The hourly job at 7 pm in their zone.
  const optedIn = await learner("optin", { username: `Rem_${Math.random().toString(36).slice(2, 9)}`, optIn: true }, zone);
  const notOpted = await learner("noopt", { username: `Rem_${Math.random().toString(36).slice(2, 9)}` }, zone);
  const learned = await learner("learned", { username: `Rem_${Math.random().toString(36).slice(2, 9)}`, optIn: true, xpToday: true }, zone);
  const first = await runJob();
  const rows = await rowsOf(optedIn.id);
  record("The job sends an opted-in learner one streak reminder (a dry run off production)", first.status === 200 && rows.length === 1 && rows[0].kind === "streak" && rows[0].dry_run === true && rows[0].day === zone.day, JSON.stringify(first.body));
  record("Nothing for a learner who didn't opt in", (await rowsOf(notOpted.id)).length === 0);
  record("Nothing for a learner who already learned today", (await rowsOf(learned.id)).length === 0);
  await runJob();
  record("Running the job again sends nothing more (one a day)", (await rowsOf(optedIn.id)).length === 1);

  // 4. Open and return links.
  const row = rows[0];
  const wrongKey = await fetch(`${BASE}/api/email/open?r=${row.id}&k=00000000-0000-4000-8000-000000000000`);
  const afterWrong = (await rowsOf(optedIn.id))[0];
  const opened = await fetch(`${BASE}/api/email/open?r=${row.id}&k=${row.key}`);
  const go = await fetch(`${BASE}/api/email/go?r=${row.id}&k=${row.key}&to=${encodeURIComponent("/courses")}`, { redirect: "manual" });
  const offsite = await fetch(`${BASE}/api/email/go?r=${row.id}&k=${row.key}&to=${encodeURIComponent("https://evil.example/")}`, { redirect: "manual" });
  const tracked = (await rowsOf(optedIn.id))[0];
  record("A wrong key changes nothing", wrongKey.ok && afterWrong.opened_at === null);
  record("The open image notes the open", opened.ok && opened.headers.get("content-type") === "image/gif" && Boolean(tracked.opened_at));
  record("The button notes the return and goes to the page", go.status === 303 && new URL(go.headers.get("location")).pathname === "/courses" && Boolean(tracked.returned_at));
  record("The button never redirects off the site", new URL(offsite.headers.get("location")).origin === new URL(BASE).origin);

  // 5. One-tap unsubscribe (no sign-in).
  const token = (await profileOf(optedIn.id)).email_token;
  const unsub = await fetch(`${BASE}/api/email/unsubscribe?t=${token}`, { redirect: "manual" });
  record("The unsubscribe link turns reminders off without signing in", unsub.status === 303 && new URL(unsub.headers.get("location")).pathname === "/unsubscribed" && (await profileOf(optedIn.id)).reminder_emails === false);
  const oneClick = await fetch(`${BASE}/api/email/unsubscribe?t=${(await profileOf(learned.id)).email_token}`, { method: "POST" });
  record("Mail apps' one-click unsubscribe (POST) works too", oneClick.status === 200 && (await profileOf(learned.id)).reminder_emails === false);
  const unknown = await fetch(`${BASE}/api/email/unsubscribe?t=00000000-0000-4000-8000-000000000000`, { method: "POST" });
  record("An unknown token is refused", unknown.status === 404);
  const confirm = await browser.newPage();
  await confirm.goto(`${BASE}/unsubscribed`);
  record("The confirmation page says so", await confirm.getByRole("heading", { name: "You're unsubscribed" }).isVisible());
  await confirm.close();

  // 5. The one-time dashboard card for existing learners (accounts made before the sign-up opt-in).
  const PROMPT = "Want a reminder before your streak ends?";
  const dashboardAs = async (who) => {
    const c = await browser.newContext({ viewport: { width: 360, height: 560 }, colorScheme: "dark", reducedMotion: "reduce" });
    const p = await c.newPage();
    await prepare(p);
    const l = await admin.auth.admin.generateLink({ type: "magiclink", email: who.email });
    await p.goto(`${BASE}/auth/callback?token_hash=${l.data.properties.hashed_token}&type=magiclink&next=/`);
    await p.waitForURL((u) => u.pathname === "/", { timeout: 60000 });
    await p.getByRole("heading", { name: "Dashboard" }).waitFor({ state: "attached", timeout: 60000 });
    await closeLeaguesWelcome(p);
    return { c, p };
  };
  const backdate = async (id) => {
    const r = await admin.from("profiles").update({ created_at: "2026-09-20T03:00:00Z" }).eq("id", id);
    if (r.error) throw r.error;
  };
  const oldYes = await learner("old-yes", { username: `E2e_old${Date.now() % 100000}` }, zone);
  await backdate(oldYes.id);
  {
    const { c, p } = await dashboardAs(oldYes);
    const shown = await p.getByRole("heading", { name: PROMPT }).waitFor({ timeout: 30000 }).then(() => true, () => false);
    record("An existing learner sees the reminder card once on the dashboard", shown);
    const cardLayout = await p.evaluate(layoutProblems, null);
    record("The card lays out cleanly at 360x560", cardLayout.length === 0, JSON.stringify(cardLayout));
    await p.screenshot({ path: path.join(SHOTS, "reminder-prompt-360x560.png") });
    await p.getByRole("button", { name: "Remind me" }).click();
    await p.getByRole("heading", { name: "Reminders are on" }).waitFor({ timeout: 30000 });
    const after = await profileOf(oldYes.id);
    record("Remind me opts them in and records consent", after.reminder_emails === true && Boolean(after.reminder_consent_at));
    await p.reload();
    await p.getByRole("heading", { name: "Dashboard" }).waitFor({ state: "attached", timeout: 60000 });
    await p.waitForTimeout(3000);
    record("…and the card never comes back", (await p.getByRole("heading", { name: PROMPT }).count()) === 0);
    await c.close();
  }
  const oldNo = await learner("old-no", { username: `E2e_no${Date.now() % 100000}` }, zone);
  await backdate(oldNo.id);
  {
    const { c, p } = await dashboardAs(oldNo);
    await p.getByRole("button", { name: "No thanks" }).click();
    await p.reload();
    await p.getByRole("heading", { name: "Dashboard" }).waitFor({ state: "attached", timeout: 60000 });
    await p.waitForTimeout(3000);
    record("No thanks hides it for good, and opts nobody in", (await p.getByRole("heading", { name: PROMPT }).count()) === 0 && (await profileOf(oldNo.id)).reminder_emails === false);
    await c.close();
  }
  const newer = await learner("newer", { username: `E2e_new${Date.now() % 100000}` }, zone);
  {
    const { c, p } = await dashboardAs(newer);
    await p.waitForTimeout(4000);
    record("Newer accounts (asked at sign-up) never see the card", (await p.getByRole("heading", { name: PROMPT }).count()) === 0);
    await c.close();
  }
} finally {
  await browser.close();
  for (const id of users) await admin.auth.admin.deleteUser(id);
}
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} check(s) failed.` : `\n✓ All ${results.length} reminder checks passed.`);
process.exit(failed ? 1 : 0);
