// Card-by-card screenshots of the rebuilt "Spot the AI" lesson at 360x560 (the smallest real
// screen). Guest play of the first lesson. Throwaway, run with the dev server up:
//   E2E_BROWSER=chrome node scripts/e2e/spot-the-ai-shots.mjs
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const APP = path.resolve(import.meta.dirname, "../..");
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const OUT = path.join(APP, ".e2e-shots", "spot-the-ai");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 360, height: 560 }, colorScheme: "dark", deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
await page.route(/\/script\.js$|\/_vercel\/insights\//, (r) => r.abort());
await page.addInitScript(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const s = document.createElement("style");
    s.textContent = "nextjs-portal{display:none!important}";
    document.head.append(s);
  });
});

const shot = async (name) => {
  await page.waitForTimeout(650);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log("shot:", name);
};
const dismissCoach = async () => {
  const g = page.getByRole("button", { name: "Got it" });
  if (await g.count()) await g.click().catch(() => {});
};
const cont = async () => {
  await page.getByRole("button", { name: /^(Continue|Next lesson|Start)/ }).first().click().catch(() => {});
  await page.waitForTimeout(500);
};
const check = async () => {
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.waitForTimeout(700);
};
const pick = (name) => page.getByRole("radio", { name }).click();

try {
  await page.goto(`${BASE}/lesson/spot-the-ai`, { waitUntil: "networkidle" });
  await page.locator("[data-card-stage]").first().waitFor({ timeout: 30000 });

  // Card 1 — Watch (interactive MC + illustration, hook on top)
  await shot("1-watch");
  await pick(/lots of apple photos/);
  await check();
  await shot("1-watch-reveal");
  await cont();

  // Card 2 — Predict the green apple (the "aha", before naming): show wrong then right
  await dismissCoach();
  await shot("2-green");
  await pick(/Only Robot A/);
  await check();
  await shot("2-green-wrong");
  await page.getByRole("button", { name: /Try again/ }).click();
  await page.waitForTimeout(300);
  await pick(/Only Robot B/);
  await check();
  await shot("2-green-right");
  await cont();

  // Card 3 — Name it (explainer)
  await dismissCoach();
  await shot("3-name");
  await cont();

  // Card 4 — Easy win sort
  await dismissCoach();
  await shot("4-sort");
  for (const [item, bin] of [
    ["A calculator", "Follows a recipe"],
    ["Traffic lights on a timer", "Follows a recipe"],
    ["An alarm clock", "Follows a recipe"],
    ["A spam filter", "Learned from examples"],
    ["Video recommendations", "Learned from examples"],
    ["Face unlock", "Learned from examples"],
  ]) {
    await page.getByText(item, { exact: true }).first().click();
    await page.waitForTimeout(150);
    await page.getByText(bin, { exact: true }).first().click();
    await page.waitForTimeout(200);
  }
  await check();
  await shot("4-sort-done");
  await cont();

  // Card 5 — Twist (cats)
  await dismissCoach();
  await shot("5-twist");
  await pick(/lots of cat photos/);
  await check();
  await cont();

  // Card 6 — Recap + Try this + tease
  await dismissCoach();
  await shot("6-recap");
  await cont();
  await shot("7-complete");
  console.log("\nDone →", path.relative(APP, OUT));
} catch (e) {
  console.error("FAILED:", e.message);
  await page.screenshot({ path: path.join(OUT, "error.png") }).catch(() => {});
} finally {
  await browser.close();
}
