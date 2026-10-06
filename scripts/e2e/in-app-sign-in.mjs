// Signing in from inside Instagram, end to end: no Google button, the "open in browser" tip and copy
// link, and the email code typed into the page, with the guest's progress merged into the new
// account. No email is sent (the send is intercepted; the real code comes from Supabase's admin API,
// as Supabase would put it in the email). The throwaway account is deleted afterwards.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { readEnvEntries } from "./lib/env.mjs";

// Run with the dev server up (`npm run dev`), then `npm run e2e:in-app`. Needs .env.local with the
// Supabase URL and SUPABASE_SECRET_KEY. Uses an installed Edge or Chrome (E2E_BROWSER=chrome).
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

const INSTAGRAM =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.25.80 (iPhone15,3; iOS 18_5; en_AU)";
const SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const NEXT = "/lesson/bytes-file-sizes-and-hex"; // needs a free account
const guestProgress = {
  cards: {},
  lessons: { "bits-and-binary": { completedAt: new Date(Date.now() - 600_000).toISOString(), xp: 20 } },
  quizzes: {},
  preferences: { mode: "path", sound: false, coachSeen: [], dailyGoal: 50, dailyGoalChosen: true },
  xpEvents: [],
  goalDays: {},
  totalXp: 20,
};

const email = `in-app-e2e-${Date.now()}@example.com`;
let userId = null;
const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  // 0. A normal browser still offers Google.
  {
    const ctx = await browser.newContext({ userAgent: SAFARI, viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    record("Safari: Continue with Google is shown", await page.getByRole("button", { name: /Continue with Google/ }).isVisible());
    await ctx.close();
  }

  // 1. Inside Instagram, as a guest with progress.
  const ctx = await browser.newContext({ userAgent: INSTAGRAM, viewport: { width: 390, height: 844 }, colorScheme: "dark", reducedMotion: "reduce", permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Never send a real email from a test: the request to send the code is answered here.
  let sendCalls = 0;
  await page.route("**/auth/v1/otp*", async (route) => {
    sendCalls++;
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.goto(BASE);
  await page.evaluate((p) => localStorage.setItem("cybernet.progress.v1", JSON.stringify(p)), guestProgress);
  await page.goto(`${BASE}/login?next=${encodeURIComponent(NEXT)}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  record("Instagram: no Google button", (await page.getByRole("button", { name: /Continue with Google/ }).count()) === 0);
  record("…the tip says how to open it in a browser", await page.getByText(/doesn't work inside Instagram/).isVisible());
  await page.getByRole("button", { name: "Copy link" }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  record("…and Copy link copies this page's address", copied.includes("/login"), copied);
  await page.screenshot({ path: path.join(SHOTS, "in-app-login.png"), fullPage: true });

  // 2. The email code, typed into the page.
  await page.getByLabel("I'm 13 or older").check();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Email me a sign-in code" }).click();
  await page.getByLabel("Sign-in code").waitFor({ timeout: 10000 });
  record("After sending, it asks for the code on the same page", sendCalls === 1);
  await page.screenshot({ path: path.join(SHOTS, "in-app-code.png"), fullPage: true });

  // Supabase would email this code; the admin API returns the same kind of code without sending.
  const { data: created } = await admin.auth.admin.createUser({ email, email_confirm: true });
  userId = created.user.id;
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const code = link.data.properties.email_otp;
  await page.getByLabel("Sign-in code").fill(`${code.slice(0, 3)} ${code.slice(3)}`); // pasted with a space
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/account\?welcome=1/, { timeout: 20000 });
  record("The code signs in; a new account picks a name first, keeping the lesson", page.url().includes(`next=${encodeURIComponent(NEXT)}`), page.url());
  // "Pick a username" starts with a suggestion, so keeping it is one tap.
  await page.waitForFunction(() => (document.querySelector("input[autocomplete=username]")?.value ?? "") !== "", null, { timeout: 30000 });
  await page.getByRole("button", { name: "Use this" }).click();
  await page.waitForURL(/\/lesson\/bytes-file-sizes-and-hex/, { timeout: 20000 });
  await page.waitForTimeout(2500);
  record("…then the lesson that needed an account opens", (await page.getByRole("heading", { name: "Create a free account to keep going." }).count()) === 0);

  // 3. Guest progress moved into the account.
  let merged = [];
  for (let i = 0; i < 10 && merged.length === 0; i++) {
    await page.waitForTimeout(1000);
    merged = (await admin.from("lesson_completions").select("lesson_id").eq("user_id", userId)).data ?? [];
  }
  record("The guest's finished lesson moved into the new account", merged.some((l) => l.lesson_id === "bits-and-binary"));
  record("No page errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
} finally {
  await browser.close();
  if (userId) await admin.auth.admin.deleteUser(userId);
  const left = userId ? ((await admin.from("lesson_completions").select("lesson_id").eq("user_id", userId)).data ?? []).length : 0;
  console.log(`cleanup: rows left ${left}`);
}
console.log(results.length && results.every(Boolean) ? `All ${results.length} checks passed.` : `${results.filter((r) => !r).length || "some"} FAILED`);
process.exitCode = results.every(Boolean) ? 0 : 1;
