// The daily lesson limit, end to end: a free account opens 3 new lessons (Pro modules included),
// the 4th shows the limit screen with the Pro pitch in view on a 360×640 phone, and reopening,
// guest lessons and the course path's "left today" line behave. Also checks /pro fits one screen.
// The throwaway account is deleted afterwards (its lesson opens go with it).
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";
import { readEnvEntries } from "./lib/env.mjs";

// Run with the dev server up (`npm run dev`), then `npm run e2e:daily-limit`. Needs .env.local with
// the Supabase URL and SUPABASE_SECRET_KEY. Uses an installed Edge or Chrome (E2E_BROWSER=chrome).
const APP = path.resolve(import.meta.dirname, "../..");
const env = Object.fromEntries(
  readEnvEntries(APP),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SHOTS = path.join(APP, ".e2e-shots");
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};
const PHONE = { width: 360, height: 640 };

/** The lesson page settles on the player, the sign-up gate or the limit screen. */
async function openLesson(page, id) {
  await page.goto(`${BASE}/lesson/${id}`);
  const limit = page.getByRole("heading", { name: /lessons today/ });
  const card = page.locator("main h1, main h2, main [data-card]").first();
  await Promise.race([limit.waitFor({ timeout: 30000 }), page.getByRole("button", { name: /Check|Continue/ }).first().waitFor({ timeout: 30000 })]).catch(() => {});
  await card.waitFor({ timeout: 5000 }).catch(() => {});
  return (await limit.count()) > 0 ? "limit" : "open";
}

const email = `daily-limit-e2e-${Date.now()}@example.com`;
let userId = null;
const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  const { data: created, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  userId = created.user.id;
  await admin.from("profiles").update({ username: `E2e_${Math.random().toString(36).slice(2, 12)}`, age_confirmed: true }).eq("id", userId);
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });

  const ctx = await browser.newContext({ viewport: PHONE, colorScheme: "dark", reducedMotion: "reduce", timezoneId: "Australia/Perth" });
  const page = await ctx.newPage();
  await prepare(page);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=/`);
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 30000 });

  // 1. Three new lessons open, a Pro one among them.
  const first = [];
  for (const id of ["memory-vs-storage", "meet-the-os", "meet-the-cpu"]) first.push(await openLesson(page, id));
  record("A free account opens 3 new lessons, Pro modules included", first.every((s) => s === "open"), first.join(", "));
  const { data: opens } = await admin.from("lesson_opens").select("lesson_id, day").eq("user_id", userId);
  record("…each counted once, on the learner's own day", (opens ?? []).length === 3);
  const { data: profile } = await admin.from("profiles").select("time_zone").eq("id", userId).single();
  record("…and the browser's time zone is saved", profile?.time_zone === "Australia/Perth", profile?.time_zone);

  // 2. The 4th: the limit screen, with the button in view on a 360×640 phone.
  record("The 4th new lesson shows the limit screen", (await openLesson(page, "files-and-folders")) === "limit");
  await page.waitForTimeout(800);
  const button = page.getByRole("button", { name: /free trial|Go unlimited/ }).first();
  const box = await button.boundingBox().catch(() => null);
  record("…with the Pro button visible without scrolling", Boolean(box) && box.y + box.height <= PHONE.height, box ? `bottom ${Math.round(box.y + box.height)}px` : "no button");
  record("…annual preselected, monthly a small switch", (await page.getByText(/a year, just/).count()) === 1 && (await page.getByRole("button", { name: /Prefer monthly/ }).count()) === 1);
  record("…and Not now", (await page.getByRole("link", { name: "Not now" }).count()) === 1);
  record("…with no sample question in the way", (await page.getByText("Try a sample").count()) === 0);
  const scrolls = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 1);
  record("…on one screen (no scrolling)", !scrolls);
  await page.screenshot({ path: path.join(SHOTS, "limit-360.png") });

  // 3. Free ways in still work.
  record("Reopening a lesson from today is free", (await openLesson(page, "meet-the-os")) === "open");
  record("Guest lessons never count", (await openLesson(page, "whats-in-the-box")) === "open");
  record("Help lessons never count", (await openLesson(page, "getting-help")) === "open");

  // 4. The course path says how many are left.
  await page.goto(`${BASE}/course/inside-your-devices`);
  await page.locator('[data-lesson="files-and-folders"] button').first().click({ timeout: 30000 }).catch(() => {});
  const leftLine = page.getByText(/No new lessons left today/);
  record("The course path popover says none are left today", await leftLine.waitFor({ timeout: 10000 }).then(() => true, () => false));

  // 5. /pro: the top screen fits a 360×640 phone with its button in view.
  await page.goto(`${BASE}/pro`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const proButton = page.getByRole("button", { name: /free trial|Go unlimited|Manage/ }).first();
  const proBox = await proButton.boundingBox().catch(() => null);
  record("/pro: the button is visible without scrolling at 360×640", Boolean(proBox) && proBox.y + proBox.height <= PHONE.height, proBox ? `bottom ${Math.round(proBox.y + proBox.height)}px` : "no button (Stripe sandbox not set?)");
  await page.screenshot({ path: path.join(SHOTS, "pro-360.png") });
  await page.emulateMedia({ colorScheme: "light" });
  await page.screenshot({ path: path.join(SHOTS, "pro-360-light.png") });
  record("No page errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
} finally {
  await browser.close();
  if (userId) await admin.auth.admin.deleteUser(userId);
  const left = userId ? ((await admin.from("lesson_opens").select("lesson_id").eq("user_id", userId)).data ?? []).length : 0;
  console.log(`cleanup: rows left ${left}`);
}
console.log(results.length && results.every(Boolean) ? `All ${results.length} checks passed.` : `${results.filter((r) => !r).length || "some"} FAILED`);
process.exitCode = results.every(Boolean) ? 0 : 1;
