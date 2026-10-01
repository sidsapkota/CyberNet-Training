// Production smoke check for the mascot and the player (no /dev pages there): the landing page's
// mascot renders with its animatable parts, and a guest lesson opens in the player with its scene,
// the lesson menu and no page errors. Sends no analytics.
//   E2E_BASE_URL=https://cybernettraining.com npm run e2e:prod-mascot
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};
const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true });
  await prepare(page);
  await page.route(/\/script\.js$|\/_vercel\/insights\//, (r) => r.abort());
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}/`);
  await page.locator('svg [data-part="figure"]').first().waitFor({ timeout: 30000 }).catch(() => {});
  record("The landing mascot renders with its animatable parts", (await page.locator('svg [data-part="figure"]').count()) > 0 && (await page.locator('svg [data-part="head"]').count()) > 0);
  await page.goto(`${BASE}/lesson/whats-in-the-box`);
  await page.locator("[data-scene-stage]").first().waitFor({ timeout: 30000 }).catch(() => {});
  record("A guest lesson opens with its scene", (await page.locator("[data-scene-stage]").count()) === 1);
  record("…the lesson menu is in the header", (await page.getByRole("button", { name: /Lessons in module/ }).count()) === 1);
  await page.locator("[data-scene-stage] button").first().click({ force: true });
  await page.waitForTimeout(500);
  record("…tapping a part shows its callout", (await page.locator("[data-scene-callout]").count()) === 1);
  record("No page errors", errors.length === 0, errors.join(" | "));
} finally {
  await browser.close();
}
console.log(results.every(Boolean) ? `All ${results.length} checks passed.` : `${results.filter((r) => !r).length} FAILED`);
process.exitCode = results.every(Boolean) ? 0 : 1;
