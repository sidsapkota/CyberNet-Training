// Dashboard numbers for a learner with cards done but no lesson finished (the owner's case, 2 Oct
// 2026: 13 cards, 75 XP, 0 lessons showed "Last 2 weeks · 0" and 0% everywhere). Throwaway account,
// deleted afterwards. Needs the secret key, so run it against a local production build or production:
//   E2E_BASE_URL=https://cybernettraining.com node scripts/e2e/dashboard-numbers.mjs
// Checks: the header shows total XP (completions, no practice); Activity shows the XP ledger for
// today (practice included, like the daily goal); Stay Safe Online's ring moves with the cards but
// isn't 100%, and lessons finished and quizzes passed are counted apart.
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
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

const results = [];
const record = (check, ok, detail = "") => {
  results.push({ check, ok });
  console.log(`${ok ? "✓" : "✗"} ${check}${detail ? ` (${detail})` : ""}`);
};

// Three cards of Stay Safe Online's first lesson, and a replay of one (practice: 5 XP, ledger only).
const lesson = JSON.parse(fs.readFileSync(path.join(APP, "content/courses/stay-safe-online/modules/01-lock-your-accounts/lessons/01-strong-passwords.json"), "utf8"));
const graded = lesson.cards.filter((c) => c.difficulty === "core" && "prompt" in c).slice(0, 3);
const TZ = "Australia/Sydney";
const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
const email = `dash-${Date.now()}@example.com`;
const { data: created, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
if (error) throw error;
const userId = created.user.id;
const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  const username = `Dash_${Math.random().toString(36).slice(2).replace(/[0-9]/g, "").slice(0, 8) || "tester"}`;
  await admin.from("profiles").update({ username, age_confirmed: true, time_zone: TZ }).eq("id", userId);
  const at = new Date().toISOString();
  await admin.from("card_completions").insert(graded.map((c) => ({ user_id: userId, lesson_id: lesson.id, card_id: c.id, completed_at: at, xp: 10 })));
  await admin.from("xp_events").insert([
    ...graded.map((c) => ({ user_id: userId, at, day: today, time_zone: TZ, kind: "card", lesson_id: lesson.id, card_id: c.id, xp: 10 })),
    { user_id: userId, at, day: today, time_zone: TZ, kind: "practice", lesson_id: lesson.id, card_id: graded[0].id, xp: 5 },
  ]);

  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, colorScheme: "dark" });
  await page.route(/\/script\.js$|\/_vercel\/insights\//, (r) => r.abort());
  await prepare(page);
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=/`);
  await page.waitForURL((u) => u.pathname === "/", { timeout: 60000 });
  const activity = page.getByText(/^Last 2 weeks · /);
  await activity.waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500); // counters animate up

  const header = await page.getByLabel(/XP total$/).first().getAttribute("aria-label");
  record("The header shows total XP from completions (practice not included)", header === "30 XP total", header ?? "");
  const activityText = (await activity.innerText()).trim();
  record("Activity shows today's XP from the ledger, practice included (not 0)", activityText === "Last 2 weeks · 35 XP", activityText);
  const todayBar = await page.locator("ol[aria-label='XP earned per day'] li").last().innerText();
  record("…with a bar for today", /35 XP/.test(todayBar), todayBar.replace(/\s+/g, " ").trim());

  const ring = await page.getByRole("img", { name: /^Stay Safe Online: \d+% complete$/ }).first().getAttribute("aria-label");
  const percent = Number(ring?.match(/(\d+)%/)?.[1] ?? -1);
  record("Stay Safe Online's ring moves with the cards done (more than 0%, not 100%)", percent > 0 && percent < 100, ring ?? "");
  const counts = await page.getByText(/^0\/\d+ lessons · 0\/\d+ quizzes$/).first().innerText().catch(() => "");
  record("Lessons finished and quizzes passed are counted apart (none yet)", counts !== "", counts);
  await page.screenshot({ path: path.join(APP, ".e2e-shots", "dashboard-numbers.png"), fullPage: true });
} catch (e) {
  console.error(e);
  results.push({ check: "no errors", ok: false });
} finally {
  await browser.close();
  await admin.auth.admin.deleteUser(userId);
  const left = (await admin.from("card_completions").select("user_id").eq("user_id", userId)).data ?? [];
  console.log(`cleanup: account deleted, rows left ${left.length}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `${failed} check(s) failed` : `All ${results.length} checks passed.`);
process.exit(failed ? 1 : 0);
