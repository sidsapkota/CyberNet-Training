// Avatars and rewards end to end (throwaway account, deleted afterwards). Needs the secret key, so
// run it against a local production build or production:
//   E2E_BASE_URL=http://localhost:3100 npm run e2e:rewards
// Avatars v2: a passed module quiz and a 7-day streak earn 2 spins and the scarf; locked items show
// how to get them; items in different slots wear together; a spin always wins an unowned spin item;
// with every spin item owned, spins are saved for new items. Screenshots: .e2e-shots/rewards-*.png.
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
  const spinButton = page.getByRole("button", { name: /^Spin/ });
  await spinButton.waitFor({ timeout: 60000 });
  record("A finished module and a 7-day streak earn 2 spins, ready to spin", (await spinButton.innerText()).trim() === "Spin (2)");
  const spins = (await admin.from("reward_spins").select("earned_for").eq("user_id", userId)).data ?? [];
  record("…recorded once each", spins.length === 2 && spins.some((s) => s.earned_for === "streak:7") && spins.some((s) => s.earned_for.startsWith("module:")), spins.map((s) => s.earned_for).join(", "));
  await page.getByRole("tab", { name: "Head" }).waitFor();
  const crown = page.getByRole("button", { name: /Circuit crown, locked: Pro/ });
  record("Locked items are listed with how to get them (the crown: Pro)", (await crown.count()) === 1 && (await crown.isDisabled()));
  await page.getByRole("tab", { name: "Neck" }).click();
  await page.getByRole("button", { name: /^Scarf, tap to wear/ }).click();
  await page.getByRole("tab", { name: "Face" }).click();
  await page.getByRole("button", { name: /^Round glasses, tap to wear/ }).click();
  await page.waitForTimeout(2000);
  const outfit1 = (await admin.from("profiles").select("outfit").eq("id", userId).single()).data?.outfit ?? [];
  record("The 7-day scarf and the free glasses wear together (saved on the server)", outfit1.join() === "glasses,scarf", outfit1.join());
  await page.screenshot({ path: path.join(APP, ".e2e-shots", "rewards-page.png") });

  await spinButton.click();
  await page.getByRole("button", { name: "Spin", exact: true }).click();
  await page.getByRole("button", { name: "Wear it" }).waitFor({ timeout: 30000 });
  await page.screenshot({ path: path.join(APP, ".e2e-shots", "rewards-result.png") });
  const owned = (await admin.from("reward_items_owned").select("item_id, source").eq("user_id", userId)).data ?? [];
  record("Every spin wins: one new spin item", owned.length === 1 && owned[0].source === "spin" && ["beanie", "headband", "headset", "visor"].includes(owned[0].item_id), owned[0]?.item_id);
  const used = (await admin.from("reward_spins").select("item_id").eq("user_id", userId).not("spun_at", "is", null)).data ?? [];
  record("…and the spin is used up", used.length === 1 && used[0].item_id === owned[0]?.item_id);
  await page.getByRole("button", { name: "Wear it" }).click();
  await page.waitForTimeout(2000);
  const outfit2 = (await admin.from("profiles").select("outfit").eq("id", userId).single()).data?.outfit ?? [];
  record("Wear it adds the prize to the outfit, keeping the rest", outfit2.includes(owned[0]?.item_id) && outfit2.includes("scarf"), outfit2.join());

  // Every spin item owned: the last waiting spin and new ones are saved for new items, never spun.
  await admin.from("reward_items_owned").upsert(["beanie", "headband", "headset", "visor"].map((item_id) => ({ user_id: userId, item_id, source: "spin" })), { onConflict: "user_id,item_id", ignoreDuplicates: true });
  await page.goto(`${BASE}/account/rewards`);
  const saved = page.getByText(/saved for new items/);
  await saved.waitFor({ timeout: 60000 });
  record("With nothing left to win, spins show as saved for new items (no Spin button)", /^1 spin saved for new items$/.test((await saved.innerText()).trim()) && (await spinButton.count()) === 0, await saved.innerText());
  await page.goto(`${BASE}/account`);
  await page.getByRole("heading", { name: "Your avatar" }).waitFor({ timeout: 60000 });
  await page.screenshot({ path: path.join(APP, ".e2e-shots", "rewards-account.png"), fullPage: true });
  record("Account settings link to the avatar page", (await page.getByRole("link", { name: "Change" }).count()) === 1);
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
