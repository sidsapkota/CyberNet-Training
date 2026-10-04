// Card-by-card screenshots of the rebuilt "Spot the AI" lesson at 360x560. Guest play.
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

const shot = async (name) => { await page.waitForTimeout(700); await page.screenshot({ path: path.join(OUT, `${name}.png`) }); console.log("shot:", name); };
const dismissCoach = async () => { const g = page.getByRole("button", { name: "Got it" }); if (await g.count()) await g.click().catch(() => {}); };
const cont = async () => { await page.getByRole("button", { name: /^(Continue|Next lesson|Start)/ }).first().click().catch(() => {}); await page.waitForTimeout(500); };
const check = async () => { await page.getByRole("button", { name: "Check", exact: true }).click(); await page.waitForTimeout(800); };
const pick = (name) => page.getByRole("radio", { name }).click();
const tryAgain = async () => { await page.getByRole("button", { name: /Try again/ }).click(); await page.waitForTimeout(300); };

try {
  await page.goto(`${BASE}/lesson/spot-the-ai`, { waitUntil: "networkidle" });
  await page.locator("[data-card-stage]").first().waitFor({ timeout: 30000 });

  await shot("1-watch");
  await pick(/lots of apple photos/); await check(); await shot("1-watch-reveal"); await cont();

  await dismissCoach();
  await shot("2-green");
  await pick(/Robot A/); await check(); await shot("2-green-wrong");
  await tryAgain(); await pick(/Robot B/); await check(); await shot("2-green-reveal"); await cont();

  await dismissCoach();
  await shot("3-name"); await cont();

  await dismissCoach();
  await shot("4-sort");
  for (const [item, bin] of [
    ["A calculator", "Follows a recipe"], ["Traffic lights on a timer", "Follows a recipe"], ["An alarm clock", "Follows a recipe"],
    ["A spam filter", "Learned from examples"], ["Video recommendations", "Learned from examples"], ["Face unlock", "Learned from examples"],
  ]) { await page.getByText(item, { exact: true }).first().click(); await page.waitForTimeout(120); await page.getByText(bin, { exact: true }).first().click(); await page.waitForTimeout(160); }
  await check(); await shot("4-sort-done"); await cont();

  await dismissCoach();
  await shot("5-ball");
  await pick(/Robot B/); await check(); await shot("5-ball-reveal"); await cont();

  await dismissCoach();
  await shot("6-recap"); await cont(); await shot("7-complete");
  console.log("\nDone →", path.relative(APP, OUT));
} catch (e) {
  console.error("FAILED:", e.message);
  await page.screenshot({ path: path.join(OUT, "error.png") }).catch(() => {});
} finally {
  await browser.close();
}
