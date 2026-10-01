// "What's next" on the quiz-pass screen: a throwaway learner without Pro (with a seeded passing
// attempt) plays How the Internet Works' module 1 quiz with known answers, passes, and the screen
// shows the next (Pro) module with its teaser. Cleaned up afterwards.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";

// Run with the dev server up (`npm run dev`), then `npm run e2e:quiz-pass`. Needs .env.local with
// the Supabase URL and SUPABASE_SECRET_KEY (throwaway accounts are created and deleted). Uses an
// installed Edge or Chrome: E2E_BROWSER=chrome to pick Chrome (default msedge).
const APP = path.resolve(import.meta.dirname, "../..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(APP, ".env.local"), "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const QUIZ = "binary-and-data-quiz";
const quiz = JSON.parse(fs.readFileSync(path.join(APP, "content/courses/how-the-internet-works/modules/01-binary-and-data/lessons/99-module-quiz.json"), "utf8"));
const SHOTS = path.join(APP, ".e2e-shots");
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};

const email = `quizpass-e2e-${Date.now()}@example.com`;
const { data: created } = await admin.auth.admin.createUser({ email, email_confirm: true });
const userId = created.user.id;
const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  await admin.from("profiles").update({ display_name: "Quiz Tester", age_confirmed: true, daily_goal_chosen: true, time_zone: "Australia/Sydney" }).eq("id", userId);
  // Seeded: an earlier passing attempt (the learner is retaking a quiz they've passed).
  await admin.from("quiz_attempts").insert({ user_id: userId, quiz_id: QUIZ, attempted_at: new Date(Date.now() - 86_400_000).toISOString(), score: 1, passed: true, xp: 50, answers: [] });
  const context = await browser.newContext({ viewport: { width: 360, height: 900 }, colorScheme: "dark", reducedMotion: "reduce" });
  const page = await context.newPage();
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=/lesson/${QUIZ}`);
  await page.waitForLoadState("networkidle");
  const play = page.getByRole("button", { name: /Play it anyway/i });
  if (await play.isVisible().catch(() => false)) await play.click();
  await page.getByRole("button", { name: "Start quiz" }).click();

  for (const [i, card] of quiz.cards.entries()) {
    await page.waitForTimeout(400);
    const gotIt = page.getByRole("button", { name: "Got it" });
    if (await gotIt.isVisible().catch(() => false)) await gotIt.click();
    if (card.type === "multiple_choice") {
      // Options are shown shuffled, so pick the right one by its text, not its position in the file.
      const right = card.options.find((o) => o.id === card.correctOptionId).text;
      await page.getByRole("radio", { name: right, exact: true }).click();
    } else if (card.type === "binary_toggle") {
      // Bits left to right are 128 … 1; keys 1–8 toggle them.
      for (let b = 0; b < 8; b++) if (card.target & (128 >> b)) await page.keyboard.press(String(b + 1));
    } else if (card.type === "numeric_input") {
      await page.locator("main input").first().fill(String([].concat(card.answer)[0]));
    }
    // drag_to_order: answered as shown (it doesn't matter; five right answers pass).
    await page.getByRole("button", { name: "Check" }).click();
    await page.getByRole("button", { name: i === quiz.cards.length - 1 ? "See results" : "Next question" }).click();
  }

  await page.getByText("Passed · module complete").waitFor({ timeout: 20_000 });
  record("The learner passes the quiz", true);
  const whatsNext = page.getByRole("heading", { name: "IP Addresses" });
  const shown = await whatsNext.waitFor({ timeout: 10_000 }).then(() => true, () => false);
  record("The quiz-pass screen shows What's next for the next (Pro) module", shown);
  record("…with its teaser card", await page.getByRole("region", { name: "Try a card from this module" }).isVisible().catch(() => false));
  record("…one trial CTA, and no 'Start the next module' into a locked lesson", (await page.getByText("Start your 7-day free trial").count()) === 1 && (await page.getByRole("link", { name: /Start the next module/ }).count()) === 0);
  await page.screenshot({ path: path.join(SHOTS, "360-quiz-pass-whats-next.png"), fullPage: true });
  await context.close();
} finally {
  await browser.close();
  await admin.auth.admin.deleteUser(userId);
  const left = (await admin.from("quiz_attempts").select("id").eq("user_id", userId)).data ?? [];
  console.log(`cleanup: attempts left ${left.length}`);
}
const ok = results.length > 0 && results.every(Boolean);
console.log(ok ? `All ${results.length} checks passed.` : `${results.filter((r) => !r).length || "some"} FAILED`);
process.exitCode = ok ? 0 : 1;
