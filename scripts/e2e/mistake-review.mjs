// Mistake review, end to end at 360×640 with a throwaway account:
// 1. a free account answers a lesson card wrong → the server saves the mistake (re-graded);
// 2. the dashboard shows "Your mistakes" with the count and "Review with Pro"; /review shows the pitch;
// 3. with Pro, /review plays the cards: right clears, Skip keeps, wrong then right clears;
// 4. the finish screen and the database agree, and the dashboard count drops.
// The account is deleted afterwards (its mistakes go with it).
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";
import { closeLeaguesWelcome } from "./lib/welcome.mjs";
import { readEnvEntries } from "./lib/env.mjs";

// Run with the dev server up (`npm run dev`), then `npm run e2e:mistake-review`. Needs .env.local
// with the Supabase URL and SUPABASE_SECRET_KEY. Uses an installed Edge or Chrome (E2E_BROWSER=chrome).
const APP = path.resolve(import.meta.dirname, "../..");
const env = Object.fromEntries(
  readEnvEntries(APP),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SHOTS = path.join(APP, ".e2e-shots");
fs.mkdirSync(SHOTS, { recursive: true });
const PHONE = { width: 360, height: 640 };
const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};

// Multiple-choice cards from the content: the one played live, and two to seed.
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}
const lessons = walk(path.join(APP, "content/courses"))
  .filter((f) => f.includes(`${path.sep}lessons${path.sep}`))
  .map((f) => JSON.parse(fs.readFileSync(f, "utf8")))
  .filter((l) => l.kind === "lesson");
const LIVE = "what-is-an-ip-address";
const liveCard = lessons.find((l) => l.id === LIVE).cards[0];
const seeds = lessons
  .filter((l) => l.id !== LIVE)
  .flatMap((l) => l.cards.filter((c) => c.type === "multiple_choice").map((c) => ({ lessonId: l.id, card: c })))
  .slice(0, 2);
const right = (card) => card.options.find((o) => o.id === card.correctOptionId).text;
const wrongs = (card) => card.options.filter((o) => o.id !== card.correctOptionId).map((o) => o.text);
const wrong = (card) => wrongs(card)[0];

const open = async () =>
  (await admin.from("card_mistakes").select("lesson_id, card_id, misses").eq("user_id", userId).is("cleared_at", null)).data ?? [];

async function answer(page, text) {
  await page.getByRole("radio", { name: text }).click();
  await page.getByRole("button", { name: "Check" }).click();
}

const email = `mistake-review-e2e-${Date.now()}@example.com`;
let userId = null;
const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  const { data: created, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  userId = created.user.id;
  await admin.from("profiles").update({ username: `E2e_${Math.random().toString(36).slice(2, 12)}`, age_confirmed: true }).eq("id", userId);
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });

  const ctx = await browser.newContext({ viewport: PHONE, colorScheme: "dark", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await prepare(page);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=/`);
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 30000 });
  await closeLeaguesWelcome(page);

  // 1. A wrong answer in a lesson is saved (once per visit), and nothing is saved for a right one.
  await page.goto(`${BASE}/lesson/${LIVE}`);
  await page.getByRole("radio", { name: wrong(liveCard) }).waitFor({ timeout: 30000 });
  await answer(page, wrong(liveCard));
  await page.getByRole("button", { name: "Try again" }).click();
  await answer(page, wrongs(liveCard)[1] ?? wrong(liveCard)); // a different wrong pick: Check waits for a changed answer
  await page.getByRole("button", { name: "Try again" }).click();
  await answer(page, right(liveCard));
  await page.getByRole("button", { name: "Continue" }).waitFor();
  // Server actions run one at a time, and slower on a real deployment: wait for both writes to land
  // (the mistake, then the card) before leaving the page, which would cancel any still queued.
  let saved = [];
  for (let i = 0; i < 40; i++) {
    saved = await open();
    const done = (await admin.from("card_completions").select("card_id").match({ user_id: userId, card_id: liveCard.id })).data ?? [];
    if (saved.length && done.length) break;
    await page.waitForTimeout(500);
  }
  record(
    "A wrong lesson answer is saved once per visit (re-graded on the server)",
    saved.length === 1 && saved[0].lesson_id === LIVE && saved[0].card_id === liveCard.id && saved[0].misses === 1,
    JSON.stringify(saved),
  );

  // 2. Free learner: the count on the dashboard, and the pitch on /review.
  for (const s of seeds) await admin.rpc("record_mistake", { p_user: userId, p_lesson: s.lessonId, p_card: s.card.id });
  await admin.rpc("record_mistake", { p_user: userId, p_lesson: "not-a-real-lesson", p_card: "nope" });
  await page.goto(`${BASE}/`);
  await closeLeaguesWelcome(page);
  const cardTitle = page.getByRole("heading", { name: "Your mistakes" });
  await cardTitle.waitFor({ timeout: 30000 }).catch(async (error) => {
    await page.screenshot({ path: path.join(SHOTS, "mistakes-card-missing.png"), fullPage: true });
    throw error;
  });
  const line = await page.locator("section[aria-labelledby=mistakes-card-title] p").innerText();
  record("The dashboard shows the count, leaving out cards not in the content", /^3 cards to try again$/.test(line.trim()), line.trim());
  const proButton = page.getByRole("link", { name: "Review with Pro" });
  record("…with a Pro button for a free learner", (await proButton.count()) === 1);
  await cardTitle.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(SHOTS, "mistakes-card-free-360.png") });
  await proButton.click();
  await page.getByRole("heading", { name: "Review your mistakes" }).waitFor({ timeout: 30000 });
  record(
    "/review shows a free learner the Pro pitch with the count",
    await page.getByText("3 cards saved to try again.").waitFor({ timeout: 10000 }).then(() => true, () => false),
  );
  record("…with Review your mistakes among the benefits", (await page.getByText("Review your mistakes", { exact: true }).count()) >= 1);
  await page.screenshot({ path: path.join(SHOTS, "mistakes-pitch-360.png") });

  // 3. Pro: play the review.
  const now = Date.now();
  await admin.from("pro_grants").insert({
    user_id: userId,
    reason: "early_user",
    starts_at: new Date(now - 60_000).toISOString(),
    expires_at: new Date(now + 86_400_000).toISOString(),
    thanked_at: new Date(now).toISOString(),
  });
  // Newest first: the seeds were recorded after the live card, the second seed last.
  const queue = [seeds[1], seeds[0], { lessonId: LIVE, card: liveCard }];
  const queue0Hint = () => queue[0].card.hint ?? "";
  await page.goto(`${BASE}/review`);
  await page.getByText(/Mistake 1 of 3/).waitFor({ timeout: 30000 });
  await page.screenshot({ path: path.join(SHOTS, "mistake-review-360.png") });
  const hintButton = page.locator("button[aria-controls][data-keyboard-passthrough]").filter({ hasText: /hint/i });
  record("Review cards offer the hint, as lessons do", (await hintButton.count()) === 1 && Boolean(queue0Hint()));
  await hintButton.click();
  const panelId = await hintButton.getAttribute("aria-controls");
  const panelText = await page.locator(`[id="${panelId}"]`).innerText({ timeout: 5000 }).catch(() => "");
  record("…and opening it shows the hint", (await hintButton.getAttribute("aria-expanded")) === "true" && panelText.trim().length > 10, panelText.trim().slice(0, 50));

  await answer(page, right(queue[0].card));
  record("A right answer says so", await page.getByText("Got it this time.").waitFor({ timeout: 10000 }).then(() => true, () => false));
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByText(/Mistake 2 of 3/).waitFor();
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.getByText(/Mistake 3 of 3/).waitFor();
  await answer(page, wrong(queue[2].card));
  record("A wrong answer says not yet", await page.getByText("Not quite yet.").waitFor({ timeout: 10000 }).then(() => true, () => false));
  await page.getByRole("button", { name: "Try again" }).click();
  await answer(page, right(queue[2].card));
  await page.getByRole("button", { name: "Finish" }).click();
  await page.getByRole("heading", { name: "Review done" }).waitFor({ timeout: 10000 });
  const summary = await page.locator("main p").first().innerText();
  record("The finish screen counts what was fixed", /2 of 3 fixed\. One waits for next time\./.test(summary), summary);
  await page.screenshot({ path: path.join(SHOTS, "mistake-review-done-360.png") });
  // The finish screen's buttons wait for the last saves.
  await page.getByRole("link", { name: "Back to dashboard" }).waitFor({ timeout: 30000 });
  let left = [];
  for (let i = 0; i < 20; i++) {
    left = (await open()).filter((m) => m.lesson_id !== "not-a-real-lesson");
    if (left.length === 1) break;
    await page.waitForTimeout(500);
  }
  record("Right answers cleared their mistakes; the skipped one stays", left.length === 1 && left[0].card_id === queue[1].card.id, JSON.stringify(left));

  await page.goto(`${BASE}/`);
  await closeLeaguesWelcome(page);
  await page.getByRole("heading", { name: "Your mistakes" }).waitFor({ timeout: 30000 });
  const after = (await page.locator("section[aria-labelledby=mistakes-card-title] p").innerText()).trim();
  record("The dashboard count drops, with Review now for Pro", after === "1 card to try again" && (await page.getByRole("link", { name: "Review now" }).count()) === 1, after);
  await page.waitForTimeout(1000);
  // The page itself must not scroll sideways. (An sr-only label inside the course carousel once
  // did: absolute positioning escapes a scroller that isn't the containing block.) On failure, name
  // the outermost element whose hiding fixes it.
  const sideways = await page.evaluate(() => {
    if (document.documentElement.scrollWidth <= window.innerWidth) return null;
    let node = document.body;
    for (let depth = 0; depth < 25; depth++) {
      const culprit = [...node.children].find((c) => {
        const before = c.style.display;
        c.style.display = "none";
        const fixed = document.documentElement.scrollWidth <= window.innerWidth;
        c.style.display = before;
        return fixed;
      });
      if (!culprit) break;
      node = culprit;
    }
    return `${document.documentElement.scrollWidth}px wide: ${node.tagName}.${String(node.className).slice(0, 60)}`;
  });
  record("No sideways scrolling", !sideways, sideways ?? "");
  record("No page errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
} finally {
  await browser.close();
  if (userId) await admin.auth.admin.deleteUser(userId);
  const left = userId ? ((await admin.from("card_mistakes").select("card_id").eq("user_id", userId)).data ?? []).length : 0;
  console.log(`cleanup: rows left ${left}`);
}
console.log(results.length && results.every(Boolean) ? `All ${results.length} checks passed.` : `${results.filter((r) => !r).length || "some"} FAILED`);
process.exitCode = results.every(Boolean) ? 0 : 1;
