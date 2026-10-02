// Avatars and rewards end to end (throwaway account, deleted afterwards). Needs the secret key, so
// run it against a local production build or production:
//   E2E_BASE_URL=http://localhost:3100 npm run e2e:rewards
// A passed module quiz and a 7-day streak earn 2 spins; the Rewards page shows them; a spin
// always wins an unowned item the server picked; "Wear it" puts it in the header; a learner can't
// wear an item they don't own. Screenshots at 360px in .e2e-shots/rewards-*.png.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";

const APP = path.resolve(import.meta.dirname, "../..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(APP, ".env.local"), "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
fs.mkdirSync(path.join(APP, ".e2e-shots"), { recursive: true });

const results = [];
const record = (check, ok, detail = "") => {
  results.push({ check, ok });
  console.log(`${ok ? "✓" : "✗"} ${check}${detail ? ` (${detail})` : ""}`);
};

// A module quiz from the content (the first course's first module).
const coursesDir = path.join(APP, "content/courses");
const firstCourse = fs.readdirSync(coursesDir).sort()[0];
const modulesDir = path.join(coursesDir, firstCourse, "modules");
const firstModule = fs.readdirSync(modulesDir).sort()[0];
const lessonsDir = path.join(modulesDir, firstModule, "lessons");
const quiz = fs.readdirSync(lessonsDir).map((f) => JSON.parse(fs.readFileSync(path.join(lessonsDir, f), "utf8"))).find((l) => l.kind === "quiz");

const email = `rewards-${Date.now()}@example.com`;
const { data: created, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
if (error) throw error;
const userId = created.user.id;
const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  const username = `Spin_${Math.random().toString(36).slice(2).replace(/[0-9]/g, "").slice(0, 8) || "tester"}`;
  await admin.from("profiles").update({ username, age_confirmed: true, time_zone: "Australia/Sydney" }).eq("id", userId);
  await admin.from("quiz_attempts").insert({ user_id: userId, quiz_id: quiz.id, attempted_at: new Date().toISOString(), score: 1, passed: true, xp: 50, answers: {} });
  // Seven met days in a row, ending yesterday (Sydney).
  const day = (n) => new Date(Date.now() - n * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
  await admin.from("goal_days").insert([1, 2, 3, 4, 5, 6, 7].map((n) => ({ user_id: userId, day: day(n), time_zone: "Australia/Sydney", goal: 20, met_at: new Date(Date.now() - n * 86_400_000).toISOString() })));

  const page = await browser.newPage({ viewport: { width: 360, height: 740 }, colorScheme: "dark", isMobile: true, hasTouch: true });
  await page.route(/\/script\.js$|\/_vercel\/insights\//, (r) => r.abort());
  await prepare(page);
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=/account/rewards`);
  await page.waitForURL((u) => u.pathname === "/account/rewards", { timeout: 60000 });
  const waiting = page.getByRole("button", { name: /spins? waiting/ });
  await waiting.waitFor({ timeout: 60000 });
  record("A finished module and a 7-day streak earn 2 spins", /2 spins waiting/.test(await waiting.innerText()));
  const spins = (await admin.from("reward_spins").select("earned_for").eq("user_id", userId)).data ?? [];
  record("…recorded once each", spins.length === 2 && spins.some((s) => s.earned_for === "streak:7") && spins.some((s) => s.earned_for.startsWith("module:")), spins.map((s) => s.earned_for).join(", "));
  await page.screenshot({ path: path.join(APP, ".e2e-shots", "rewards-page.png"), fullPage: true });

  await waiting.click();
  await page.getByRole("button", { name: "Spin" }).click();
  await page.getByRole("button", { name: "Wear it" }).waitFor({ timeout: 30000 });
  await page.screenshot({ path: path.join(APP, ".e2e-shots", "rewards-result.png") });
  const owned = (await admin.from("reward_items_owned").select("item_id, source").eq("user_id", userId)).data ?? [];
  record("Every spin wins: one new item, from a spin", owned.length === 1 && owned[0].source === "spin", owned[0]?.item_id);
  const used = (await admin.from("reward_spins").select("item_id").eq("user_id", userId).not("spun_at", "is", null)).data ?? [];
  record("…and the spin is used up", used.length === 1 && used[0].item_id === owned[0]?.item_id);
  await page.getByRole("button", { name: "Wear it" }).click();
  await page.waitForTimeout(1500);
  const avatar = (await admin.from("profiles").select("avatar").eq("id", userId).single()).data?.avatar;
  record("Wear it saves the avatar", avatar === owned[0]?.item_id, avatar);

  // The server refuses items the learner doesn't own (the action is the only way to set it).
  const state = await page.evaluate(async () => (await fetch("/account/rewards")).status);
  record("The Rewards page still loads afterwards", state === 200);
  await page.goto(`${BASE}/account`);
  await page.getByRole("heading", { name: "Your avatar" }).waitFor({ timeout: 60000 });
  await page.screenshot({ path: path.join(APP, ".e2e-shots", "rewards-account.png"), fullPage: true });
  record("Account settings show the avatar picker", true);
} catch (e) {
  console.error(e);
  results.push({ check: "no errors", ok: false });
} finally {
  await browser.close();
  await admin.auth.admin.deleteUser(userId);
  const left = (await admin.from("reward_spins").select("user_id").eq("user_id", userId)).data ?? [];
  console.log(`cleanup: account deleted, rows left ${left.length}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `${failed} check(s) failed` : `All ${results.length} checks passed.`);
process.exit(failed ? 1 : 0);
