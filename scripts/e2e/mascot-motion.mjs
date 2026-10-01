// Mascot motion at 360px: each reaction on /dev/mascot is timed in the browser (from the click until
// its part is back at rest), the security scan's phases are captured as a filmstrip, nothing blocks
// a tap while it plays, reduced motion shows still expressions (the scan's check only), and in the
// real lesson player the feedback mascot reacts and Try again works at once.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";

// Run with the dev server up (`npm run dev`), then `npm run e2e:mascot-motion`. /dev/mascot is
// dev and preview only. Uses an installed Edge or Chrome (E2E_BROWSER=chrome).
const APP = path.resolve(import.meta.dirname, "../..");
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SHOTS = path.join(APP, ".e2e-shots", "mascot");
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};

/**
 * Clicks `button`, then samples the live mascot's `part` every animation frame for `windowMs`:
 * returns how long it moved (ms from the click until it was last away from rest).
 */
async function timeReaction(page, button, part, windowMs, measure = "transform") {
  return page.evaluate(
    async ({ button, part, windowMs, measure }) => {
      const click = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === button);
      const start = performance.now();
      click.click();
      let last = 0;
      let moved = false;
      while (performance.now() - start < windowMs) {
        await new Promise((r) => requestAnimationFrame(r));
        const el = document.querySelector(`main section svg [data-part="${part}"]`);
        if (!el) continue;
        const style = getComputedStyle(el);
        const away =
          measure === "opacity"
            ? Number(style.opacity) > 0.02 && part === "scan-glow"
            : style.transform !== "none" && style.transform !== "matrix(1, 0, 0, 1, 0, 0)";
        if (away) {
          moved = true;
          last = performance.now() - start;
        }
      }
      return { moved, ms: Math.round(last) };
    },
    { button, part, windowMs, measure },
  );
}

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, colorScheme: "dark" });
  const page = await ctx.newPage();
  await prepare(page);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}/dev/mascot`);
  await page.getByRole("button", { name: "Security scan" }).waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);

  // 1. Each one-shot reaction is quick (the timing includes a frame or two of sampling).
  for (const [button, part, limit] of [
    ["Bob (appear)", "figure", 600],
    ["Hop (right)", "figure", 600],
    ["Tilt (wrong)", "head", 600],
  ]) {
    const t = await timeReaction(page, button, part, 1200);
    record(`${button}: moves and settles in under ${limit} ms`, t.moved && t.ms < limit, `${t.ms} ms`);
    await page.waitForTimeout(300);
  }

  // 2. The security scan: under 1.2 s from the click until the glow is gone and the check settled.
  const glow = await timeReaction(page, "Security scan", "scan-glow", 1800, "opacity");
  record("Security scan: the shield glows, then fades, within 1.2 s", glow.moved && glow.ms < 1200, `${glow.ms} ms`);
  await page.waitForTimeout(400);
  const check = await timeReaction(page, "Security scan", "scan-check", 1800);
  record("…and the check pops and settles within 1.2 s", check.moved && check.ms < 1200, `${check.ms} ms`);
  await page.waitForTimeout(400);
  record("…the check stays at the end", (await page.locator('main section svg [data-part="scan-check"]').count()) === 1);

  // A filmstrip of the scan's phases.
  const live = page.locator("main section").first();
  await page.getByRole("button", { name: "Security scan" }).click();
  const started = Date.now();
  for (const at of [100, 300, 500, 700, 950, 1250]) {
    await page.waitForTimeout(Math.max(0, at - (Date.now() - started)));
    await live.screenshot({ path: path.join(SHOTS, `scan-${String(at).padStart(4, "0")}ms.png`) });
  }

  // 3. Never blocking: a tap during the scan works straight away.
  await page.getByRole("button", { name: "Security scan" }).click();
  await page.waitForTimeout(150);
  const before = await page.getByRole("button", { name: /Next expression/ }).innerText();
  await page.getByRole("button", { name: /Next expression/ }).click({ timeout: 500 });
  const after = await page.getByRole("button", { name: /Next expression/ }).innerText();
  record("Taps work while a reaction plays", before !== after, `${before} → ${after}`);
  record("No page errors", errors.length === 0, errors.join(" | "));
  await ctx.close();

  // 4. Reduced motion: still expressions; the scan shows only its check.
  const calm = await browser.newContext({ viewport: { width: 360, height: 800 }, colorScheme: "dark", reducedMotion: "reduce" });
  const still = await calm.newPage();
  await prepare(still);
  await still.goto(`${BASE}/dev/mascot`);
  await still.getByRole("button", { name: "Security scan" }).waitFor({ timeout: 60000 });
  await still.waitForTimeout(800);
  const hop = await timeReaction(still, "Hop (right)", "figure", 700);
  const tilt = await timeReaction(still, "Tilt (wrong)", "head", 700);
  record("Reduced motion: no hop and no tilt", !hop.moved && !tilt.moved);
  await still.getByRole("button", { name: "Security scan" }).click();
  await still.waitForTimeout(100);
  record(
    "Reduced motion: the scan shows only its still check",
    (await still.locator('main section svg [data-scan="still"]').count()) === 1 && (await still.locator('main section svg [data-scan="playing"]').count()) === 0,
  );
  await still.locator("main section").first().screenshot({ path: path.join(SHOTS, "scan-reduced-motion.png") });
  await calm.close();

  // 5. In a real lesson: a wrong answer, the mascot tilts, and Try again works at once.
  const lessonCtx = await browser.newContext({ viewport: { width: 360, height: 640 }, colorScheme: "dark" });
  const lesson = await lessonCtx.newPage();
  await prepare(lesson);
  // The real lesson player, with a multiple-choice sample and throwaway progress (/dev/cards).
  await lesson.goto(`${BASE}/dev/cards`);
  await lesson.locator("li", { hasText: "multiple_choice" }).first().getByRole("button", { name: "Lesson" }).click({ timeout: 60000 });
  const radios = lesson.getByRole("radio");
  await radios.first().waitFor({ timeout: 60000 });
  // Pick options until one is wrong (the right one is shuffled on screen).
  let wrong = false;
  for (let i = 0; i < (await radios.count()) && !wrong; i++) {
    await radios.nth(i).click();
    // Watch for the tilt from before Check (it lasts under half a second).
    await lesson.evaluate(() => {
      window.__tilted = false;
      const start = performance.now();
      const look = () => {
        for (const head of document.querySelectorAll('svg [data-part="head"]')) {
          const t = getComputedStyle(head).transform;
          if (t && t !== "none" && t !== "matrix(1, 0, 0, 1, 0, 0)") window.__tilted = true;
        }
        if (performance.now() - start < 2500) requestAnimationFrame(look);
      };
      requestAnimationFrame(look);
    });
    await lesson.getByRole("button", { name: "Check" }).click();
    const tryAgain = lesson.getByRole("button", { name: "Try again" });
    if (await tryAgain.waitFor({ timeout: 1500 }).then(() => true, () => false)) {
      wrong = true;
      await lesson.waitForTimeout(700);
      const tilted = await lesson.evaluate(() => window.__tilted);
      record("Lesson: a wrong answer tilts the feedback mascot's head", tilted);
      await lesson.screenshot({ path: path.join(SHOTS, "lesson-wrong-360.png") });
      const t0 = Date.now();
      await tryAgain.click({ timeout: 400 });
      await lesson.getByRole("button", { name: "Check" }).waitFor({ timeout: 400 });
      record("…and Try again works at once (nothing waits for the mascot)", Date.now() - t0 < 400, `${Date.now() - t0} ms`);
    } else {
      await lesson.getByRole("button", { name: "Continue" }).click().catch(() => {});
    }
  }
  record("Lesson: found a wrong answer to try", wrong);

  // 6. Lesson complete: the celebrating mascot runs the security scan.
  await lesson.goto(`${BASE}/dev/cards`);
  await lesson.locator("li", { hasText: "explainer" }).first().getByRole("button", { name: "Lesson" }).click({ timeout: 60000 });
  await lesson.getByRole("button", { name: "Continue" }).click();
  const playing = lesson.locator('svg [data-scan="playing"]');
  record("Lesson complete: the mascot runs the security scan", await playing.waitFor({ timeout: 10000 }).then(() => true, () => false));
  await lesson.waitForTimeout(450);
  await lesson.screenshot({ path: path.join(SHOTS, "lesson-complete-scan-360.png") });
  await lessonCtx.close();
} finally {
  await browser.close();
}
console.log(results.length && results.every(Boolean) ? `All ${results.length} checks passed.` : `${results.filter((r) => !r).length || "some"} FAILED`);
process.exitCode = results.every(Boolean) ? 0 : 1;
