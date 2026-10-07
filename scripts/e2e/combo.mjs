// The lesson combo and the end-of-lesson boosts, as a guest (no account, nothing written to a
// database). Plays "Spot the AI" (multiple choice, multiple choice, explainer, sort, multiple
// choice) at 360x560 with reduced motion, and at desktop size:
// - two right answers: no combo yet; the third right first time: "3 in a row!", then "4 in a row!";
// - the lesson-complete screen shows "Best combo: 4 in a row" and the XP;
// - a wrong answer resets it: after a miss and a retry, the third card shows no combo.
//   npm run e2e:combo        (dev server running)
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";

const APP = path.resolve(import.meta.dirname, "../..");
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const LESSON = "spot-the-ai";
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const file = walk(path.join(APP, "content/courses")).find((f) => f.endsWith(".json") && JSON.parse(fs.readFileSync(f, "utf8")).id === LESSON);
const cards = JSON.parse(fs.readFileSync(file, "utf8")).cards;
const shape = cards.map((c) => c.type).join(",");
if (!shape.startsWith("multiple_choice,multiple_choice,explainer,sort_bins,multiple_choice")) throw new Error(`${LESSON} changed shape (${shape}); update e2e:combo`);

const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};

/** Answers a card (right, or wrong when asked) and presses Check; explainers just continue. */
async function answer(page, card, { wrong = false } = {}) {
  if (card.type === "explainer") return;
  if (card.type === "multiple_choice") {
    const option = wrong ? card.options.find((o) => o.id !== card.correctOptionId) : card.options.find((o) => o.id === card.correctOptionId);
    await page.getByRole("radio", { name: option.text, exact: true }).click({ timeout: 30000 });
  } else if (card.type === "sort_bins") {
    for (const item of card.items) {
      const bin = card.bins.find((b) => b.id === item.bin);
      await page.getByRole("button", { name: item.label, exact: true }).click();
      await page.getByRole("button", { name: `Put ${item.label} in ${bin.label}` }).click();
    }
  }
  await page.getByRole("button", { name: "Check", exact: true }).click();
}
const next = (page) => page.getByRole("button", { name: "Continue", exact: true }).click({ timeout: 30000 });
const comboShown = (page, n) => page.getByText(`${n} in a row!`, { exact: true }).isVisible();

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  for (const size of [{ width: 360, height: 560, name: "phone" }, { width: 1440, height: 900, name: "desktop" }]) {
    const ctx = await browser.newContext({ viewport: size, colorScheme: "dark", reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await prepare(page);
    await page.goto(`${BASE}/lesson/${LESSON}`);

    // Cards 1 and 2: right first time, no combo yet.
    await answer(page, cards[0]);
    await page.getByRole("button", { name: "Continue", exact: true }).waitFor({ timeout: 30000 });
    const none1 = !(await page.getByText(/in a row!/).isVisible());
    await next(page);
    await answer(page, cards[1]);
    await page.getByRole("button", { name: "Continue", exact: true }).waitFor();
    record(`${size.name}: two right answers show no combo`, none1 && !(await page.getByText(/in a row!/).isVisible()));
    await next(page);
    await next(page); // the explainer: no change to the combo
    await answer(page, cards[3]);
    await page.getByRole("button", { name: "Continue", exact: true }).waitFor();
    record(`${size.name}: the third right first time shows "3 in a row!"`, await comboShown(page, 3));
    await next(page);
    await answer(page, cards[4]);
    await page.getByRole("button", { name: "Continue", exact: true }).waitFor();
    record(`${size.name}: the fourth shows "4 in a row!"`, await comboShown(page, 4));
    // Finish the lesson (the rest are explainers or more of the same).
    for (let i = 5; i < cards.length; i++) {
      await next(page);
      if (cards[i].type !== "explainer") await answer(page, cards[i]);
    }
    await next(page);
    await page.getByText("Lesson complete", { exact: true }).waitFor({ timeout: 30000 });
    record(`${size.name}: lesson complete shows the best combo`, await page.getByText(/Best combo: [4-9] in a row/).isVisible());
    if (size.name === "phone") await page.screenshot({ path: path.join(APP, ".e2e-shots", "combo-complete-360.png") });
    await ctx.close();
  }

  // A miss resets it: wrong, Try again, right; then two more right gives 2, not 3.
  const ctx = await browser.newContext({ viewport: { width: 360, height: 560 }, colorScheme: "light", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await prepare(page);
  await page.goto(`${BASE}/lesson/${LESSON}`);
  await answer(page, cards[0], { wrong: true });
  await page.getByRole("button", { name: "Try again", exact: true }).click({ timeout: 30000 });
  await answer(page, cards[0]);
  await next(page);
  await answer(page, cards[1]);
  await next(page);
  await next(page);
  await answer(page, cards[3]);
  await page.getByRole("button", { name: "Continue", exact: true }).waitFor();
  record("A miss resets the combo (miss, retry, then two right: no combo)", !(await page.getByText(/in a row!/).isVisible()));
  await page.screenshot({ path: path.join(APP, ".e2e-shots", "combo-reset-360.png") });
  await ctx.close();
} finally {
  await browser.close();
}
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} check(s) failed.` : `\n✓ All ${results.length} combo checks passed.`);
process.exit(failed ? 1 : 0);
