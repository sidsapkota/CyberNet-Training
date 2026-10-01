// Before/after screenshots for the player flow at 360×640 (as a guest, with throttled nothing):
// - a hotspot explore card ("What's in the Box?" card 1): just after tapping a part;
// - the wrong-answer flow on a multiple-choice card ("Spot the AI" card 3): picked, wrong result,
//   then what the main button offers.
// SHOTS_TAG=before|after names the files. Writes to .e2e-shots/player-flow/.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const APP = path.resolve(import.meta.dirname, "../..");
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const TAG = process.env.SHOTS_TAG ?? "after";
const OUT = path.join(APP, ".e2e-shots", "player-flow");
fs.mkdirSync(OUT, { recursive: true });
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${TAG}-${name}.png`) });

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  for (const scheme of ["dark"]) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, colorScheme: scheme, reducedMotion: "reduce", hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.route(/\/script\.js$|\/_vercel\/insights\//, (r) => r.abort());

    // 1. Hotspot explore: the card as it opens, then right after tapping a part.
    await page.goto(`${BASE}/lesson/whats-in-the-box`);
    const scene = page.locator("svg").filter({ has: page.locator("[data-part], [role=button], g[tabindex]") }).first();
    await page.getByRole("button", { name: /Continue/ }).first().waitFor({ timeout: 60000 });
    await page.waitForTimeout(800);
    await shot(page, "hotspot-explore-open");
    const part = page.getByRole("button", { name: /battery|Battery/ }).first();
    if (await part.count()) await part.click();
    else await scene.click({ position: { x: 150, y: 150 } });
    await page.waitForTimeout(500);
    await shot(page, "hotspot-explore-tapped");

    // 2. Wrong-answer flow on a multiple-choice card, in the real lesson player (/dev/cards).
    await page.goto(`${BASE}/dev/cards`);
    await page.locator("li", { hasText: "multiple_choice" }).first().getByRole("button", { name: "Lesson" }).click({ timeout: 60000 });
    const radios = page.getByRole("radio");
    await radios.first().waitFor();
    for (let i = 0; i < (await radios.count()); i++) {
      await radios.nth(i).click();
      await page.waitForTimeout(300);
      if (i === 0) await shot(page, "wrong-1-picked");
      await page.getByRole("button", { name: "Check" }).click();
      await page.waitForTimeout(500);
      if (await page.getByRole("button", { name: "Try again" }).count()) {
        await shot(page, "wrong-2-result");
        await page.getByRole("button", { name: "Try again" }).click();
        await page.waitForTimeout(400);
        await shot(page, "wrong-3-after-try-again");
        break;
      }
      await page.getByRole("button", { name: "Continue" }).click().catch(() => {});
    }

    // 2b. The same card, Instagram-sized (360×560): tap a part, the callout must be in view.
    // 3. Hotspot tap mode (a sample), after a wrong pick and Check.
    await page.goto(`${BASE}/dev/cards`);
    await page.locator("li", { hasText: "sample-hotspot-tap" }).getByRole("button", { name: "Lesson" }).click({ timeout: 60000 });
    await page.waitForTimeout(1000);
    await shot(page, "hotspot-tap-open");

    // 4. Label mode and the phone teardown (samples), with a too-early tap.
    for (const [sample, name] of [["sample-hotspot-label", "hotspot-label-open"], ["sample-teardown-phone-rebuild", "teardown-phone"]]) {
      await page.goto(`${BASE}/dev/cards`);
      await page.locator("li", { hasText: sample }).getByRole("button", { name: "Lesson" }).click({ timeout: 60000 });
      await page.waitForTimeout(1000);
      await shot(page, name);
    }
    await ctx.close();

    // 5. Instagram-sized viewport: the phone explore card, after tapping a part low on the phone.
    const ig = await browser.newContext({ viewport: { width: 360, height: 560 }, colorScheme: scheme, reducedMotion: "reduce", hasTouch: true, isMobile: true });
    const small = await ig.newPage();
    await small.route(/\/script\.js$|\/_vercel\/insights\//, (r) => r.abort());
    await small.goto(`${BASE}/dev/cards`);
    await small.locator("li", { hasText: "sample-hotspot-explore" }).getByRole("button", { name: "Lesson" }).click({ timeout: 60000 });
    await small.waitForTimeout(800);
    await small.screenshot({ path: path.join(OUT, `${TAG}-explore-560-open.png`) });
    const firstPart = small.locator("[data-scene-stage] button").last();
    await firstPart.click();
    await small.waitForTimeout(700);
    await small.screenshot({ path: path.join(OUT, `${TAG}-explore-560-tapped.png`) });
    await ig.close();
  }
} finally {
  await browser.close();
}
