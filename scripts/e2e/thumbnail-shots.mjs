// Course thumbnails for review (dev server or preview; uses the dev-only /dev/thumbnails): the four
// cards side by side at desktop, and the catalog at 360x560, in dark and light, plus each card part
// way through its hover move. Writes docs/plans/thumbnails/.
//   E2E_BASE_URL=http://localhost:3000 node scripts/e2e/thumbnail-shots.mjs
import path from "node:path";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";

const APP = path.resolve(import.meta.dirname, "../..");
const OUT = process.env.OUT ?? path.join(APP, "docs/plans/thumbnails");
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
let failed = 0;
const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  for (const [name, viewport, mobile] of [["side-by-side-desktop", { width: 1600, height: 900 }, false], ["courses-360x560", { width: 360, height: 560 }, true]]) {
    for (const scheme of ["dark", "light"]) {
      const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, reducedMotion: "no-preference" });
      // Each course's first lesson finished, so the progress bars show their colour.
      const done = Object.fromEntries(["strong-passwords", "whats-in-the-box", "spot-the-ai", "bits-and-binary"].map((id) => [id, { completedAt: new Date().toISOString(), xp: 20 }]));
      const progress = { cards: {}, lessons: done, quizzes: {}, preferences: { mode: "path", sound: false, coachSeen: [], dailyGoal: 50, dailyGoalChosen: true }, xpEvents: [], goalDays: {}, totalXp: 80 };
      await ctx.addInitScript((p) => { try { localStorage.setItem("cybernet.progress.v1", p); } catch {} }, JSON.stringify(progress));
      const page = await ctx.newPage();
      await prepare(page);
      await page.goto(`${BASE}${mobile ? "/courses" : "/dev/thumbnails"}`, { waitUntil: "networkidle", timeout: 120000 });
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      await page.waitForTimeout(1200);
      // Desktop: the four cards in one row. Phone: the catalog as it really scrolls (full page).
      if (mobile) await page.screenshot({ path: path.join(OUT, `${name}-${scheme}.png`), fullPage: true });
      else await page.locator("[data-shot=cards]").screenshot({ path: path.join(OUT, `${name}-${scheme}.png`) });
      if (!mobile && scheme === "dark") {
        const cards = page.locator("main a[href^='/course/']");
        for (let i = 0; i < (await cards.count()); i++) {
          await cards.nth(i).hover();
          await page.waitForTimeout(380);
          await cards.nth(i).screenshot({ path: path.join(OUT, `hover-${i + 1}.png`) });
        }
      }
      await ctx.close();
    }
  }
  // Each cover moves on hover (the hook; three layers; the card and the light; the envelope), and
  // nothing moves at all under reduced motion.
  for (const [motion, expected] of [["no-preference", [1, 3, 2, 1]], ["reduce", [0, 0, 0, 0]]]) {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, reducedMotion: motion });
    const page = await ctx.newPage();
    await prepare(page);
    await page.goto(`${BASE}/dev/thumbnails`, { waitUntil: "networkidle", timeout: 120000 });
    const cards = page.locator("[data-shot=cards] a");
    const moving = [];
    for (let i = 0; i < (await cards.count()); i++) {
      await cards.nth(i).hover();
      await page.waitForTimeout(250);
      moving.push(await cards.nth(i).evaluate((el) => [...el.querySelectorAll("svg *")].filter((g) => { const cs = getComputedStyle(g); return (cs.animationName !== "none" && parseFloat(cs.animationDuration) > 0.01) || (cs.translate !== "none" && cs.translate !== "0px"); }).length));
    }
    const ok = moving.join() === expected.join();
    if (!ok) failed++;
    console.log(`${ok ? "✓" : "✗"} ${motion}: moving parts per cover on hover ${moving.join(", ")} (expected ${expected.join(", ")})`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
console.log(failed ? `${failed} check(s) failed` : `Screenshots in ${path.relative(APP, OUT)}`);
process.exit(failed ? 1 : 0);
