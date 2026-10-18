// Lesson Blueprint v1.1 in the real lesson player, on Stay Safe Online module 1 (dev server running;
// no account or database: /dev/fit plays a real lesson from any card with throwaway progress):
// - the Hook card's button says Start;
// - a play-mode simulator's Continue unlocks only once the slider moves;
// - a Predict card offers "Not sure", and any answer goes straight to the reveal ("Here's what
//   happens…", the reveal picture, Continue), with no tick or cross;
// - a graded card's first wrong try shows a hint and Try again; the second shows the answer and its
//   line, then Continue (no endless retries); and there's no Hint button;
// - answers drawn on the picture are tap targets at least 44px tall, named by their text.
//   npm run e2e:blueprint
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";

const APP = path.resolve(import.meta.dirname, "../..");
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SHOTS = path.join(APP, ".e2e-shots", "blueprint");
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
async function card(lesson, index, viewport = { width: 360, height: 560 }) {
  const page = await browser.newPage({ viewport, colorScheme: "dark", reducedMotion: "reduce" });
  await prepare(page);
  await page.goto(`${BASE}/dev/fit?lesson=${lesson}&card=${index}`);
  await page.locator("[data-card-stage]").waitFor({ timeout: 60000 });
  await page.waitForTimeout(400);
  return page;
}
const footerButton = (page, name) => page.locator("[data-player-footer]").getByRole("button", { name, exact: true });

try {
  // 1. The Hook: one picture, one line, Start.
  {
    const page = await card("strong-passwords", 0);
    record("Hook: the button says Start", (await footerButton(page, "Start").count()) === 1);
    record("Hook: one full-width picture", (await page.locator("[data-card-stage] figure img").count()) === 1);
    await page.screenshot({ path: path.join(SHOTS, "hook-360x560.png") });
    await page.close();
  }

  // 2. Play: Continue waits for the slider to move.
  {
    const page = await card("strong-passwords", 1);
    const next = footerButton(page, "Continue");
    record("Play: Continue is off before the slider moves", await next.isDisabled());
    await page.getByRole("slider").first().focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(200);
    record("Play: Continue unlocks once it moves", await next.isEnabled());
    record("Play: no how-to-play panel in front of the toy", (await page.getByRole("button", { name: "Got it" }).count()) === 0);
    await page.close();
  }

  // 3. Predict: "Not sure", then straight to the reveal.
  {
    const page = await card("two-step-sign-in", 2);
    const notSure = page.getByRole("radio", { name: "Not sure" });
    record('Predict: "Not sure" is the last answer', (await notSure.count()) === 1);
    const before = await page.locator("[data-card-stage] figure img").first().getAttribute("src");
    await notSure.click();
    await footerButton(page, "Check").click();
    const heading = page.locator("[data-player-footer]").getByText("Here's what happens…");
    record("Predict: any answer (Not sure too) goes to the reveal", await heading.waitFor({ timeout: 5000 }).then(() => true, () => false));
    const after = await page.locator("[data-card-stage] figure img").first().getAttribute("src");
    record("Predict: the reveal picture shows", before !== after && /reveal/.test(after ?? ""), `${before} → ${after}`);
    record("Predict: Continue next (no Try again)", (await footerButton(page, "Continue").count()) === 1 && (await footerButton(page, "Try again").count()) === 0);
    record("Predict: no tick or cross in the footer", (await page.locator("[data-player-footer] .text-success, [data-player-footer] .text-danger").count()) === 0);
    await page.screenshot({ path: path.join(SHOTS, "predict-revealed-360x560.png") });
    await page.close();
  }

  // 4. A graded card: a hint on the first wrong try, the answer on the second.
  {
    const page = await card("strong-passwords", 5);
    record("Graded card: no Hint button in a blueprint lesson", (await page.locator("[data-player-footer]").getByRole("button", { name: /^Hint/ }).count()) === 0);
    const reveal = async () => page.locator("[data-card-stage] figure img").first().getAttribute("src");
    const start = await reveal();
    await page.getByRole("radio", { name: "Hard to guess" }).click();
    await footerButton(page, "Check").click();
    record("1st wrong: a hint, and Try again", (await page.getByText("Under the swaps, what word is it still?").count()) === 1 && (await footerButton(page, "Try again").count()) === 1);
    record("1st wrong: the reveal picture stays hidden", (await reveal()) === start);
    await footerButton(page, "Try again").click();
    await page.getByRole("radio", { name: "Guessed, but much slower" }).click();
    await footerButton(page, "Check").click();
    const shown = page.locator("[data-player-footer]").getByText("Not quite. Here's the answer.");
    record("2nd wrong: the answer is shown", await shown.waitFor({ timeout: 5000 }).then(() => true, () => false));
    record("…with \"The answer: On the guess list\"", (await page.locator("[data-player-footer]").getByText(/The answer:\s*On the guess list/).count()) === 1);
    record("…then Continue, no third try", (await footerButton(page, "Continue").count()) === 1 && (await footerButton(page, "Try again").count()) === 0);
    record("…the right answer is marked on the card", (await page.getByRole("radio", { name: /On the guess list/ }).first().locator("svg").count()) >= 1);
    await page.screenshot({ path: path.join(SHOTS, "second-wrong-360x560.png") });
    await page.close();
  }

  // 5. Answers drawn on the picture: big enough to tap, named by their text.
  {
    const page = await card("two-step-sign-in", 6);
    const areas = page.locator("[data-card-stage] figure [role=radio]");
    const n = await areas.count();
    let smallest = Infinity;
    for (let i = 0; i < n; i++) smallest = Math.min(smallest, (await areas.nth(i).boundingBox())?.height ?? 0);
    record("Answers on the picture: one per app, each at least 44px tall", n === 4 && smallest >= 44, `${n} areas, smallest ${Math.round(smallest)}px`);
    record("…named by their text", (await page.getByRole("radio", { name: "Email" }).count()) === 1);
    await page.getByRole("radio", { name: "Email" }).click();
    await footerButton(page, "Check").click();
    record("…a right answer is marked right (tick and text)", (await page.locator("[data-player-footer] .text-success").count()) > 0 && (await page.locator("[data-card-stage] figure [role=radio] svg").count()) >= 1);
    await page.screenshot({ path: path.join(SHOTS, "answer-areas-360x560.png") });
    await page.close();
  }
} finally {
  await browser.close();
}
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n✗ ${failed} of ${results.length} checks failed.` : `\n✓ All ${results.length} Lesson Blueprint checks passed. Screenshots in .e2e-shots/blueprint/`);
process.exit(failed ? 1 : 0);
