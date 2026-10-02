// Avatars v2 screenshots for review (dev server running; uses the dev-only pages):
//   E2E_BASE_URL=http://localhost:3000 node scripts/e2e/avatar-shots.mjs
// Writes docs/plans/avatars/: all 12 items worn (grid), the 24/32/48px strip, stacked outfits, and
// the avatar page at 360x560 and desktop in dark and light. Fails if the phone page hides the items.
import path from "node:path";
import { chromium } from "playwright-core";

const APP = path.resolve(import.meta.dirname, "../..");
const OUT = process.env.OUT ?? path.join(APP, "docs/plans/avatars");
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const hideDevBadge = (p) => p.addStyleTag({ content: "nextjs-portal{display:none!important}" });

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
let failed = 0;
try {
  const p = await (await browser.newContext({ viewport: { width: 1200, height: 900 }, colorScheme: "dark", deviceScaleFactor: 2 })).newPage();
  await p.goto(`${BASE}/dev/avatars`, { waitUntil: "networkidle", timeout: 120000 });
  await hideDevBadge(p);
  await p.waitForTimeout(1000);
  for (const s of ["grid", "strip", "stacked"]) await p.locator(`[data-shot=${s}]`).screenshot({ path: path.join(OUT, `${s}.png`) });

  for (const [name, viewport, mobile] of [["page-360x560", { width: 360, height: 560 }, true], ["page-desktop", { width: 1280, height: 800 }, false]]) {
    for (const scheme of ["dark", "light"]) {
      const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/dev/avatar-page`, { waitUntil: "networkidle", timeout: 120000 });
      await hideDevBadge(page);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(OUT, `${name}-${scheme}.png`) });
      if (mobile) {
        // Every head item's tile sits above the phone tab bar, without scrolling.
        const tabBar = await page.locator("nav").last().boundingBox();
        const lastTile = await page.locator("#slot-panel li").last().boundingBox();
        const ok = Boolean(tabBar && lastTile && lastTile.y + lastTile.height <= tabBar.y);
        if (!ok) failed++;
        console.log(`${ok ? "✓" : "✗"} ${name} ${scheme}: all head items above the tab bar`);
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
console.log(failed ? `${failed} check(s) failed` : `Screenshots in ${path.relative(APP, OUT)}`);
process.exit(failed ? 1 : 0);
