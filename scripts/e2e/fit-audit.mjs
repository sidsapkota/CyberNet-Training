// Fit audit: every card of every lesson and quiz, in the real lesson player (/dev/fit), at 360×640
// and at the Instagram browser's ~360×560. A card "fits" when the page doesn't scroll: its prompt,
// interactive area and labels, with the sticky header and footer, all on one screen.
// Writes .e2e-shots/fit/report.json and prints the cards that don't fit (by how many px).
//   npm run e2e:fit-audit            (dev server running; COURSE=<id> for one course)
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const APP = path.resolve(import.meta.dirname, "../..");
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const OUT = path.join(APP, ".e2e-shots", "fit");
fs.mkdirSync(OUT, { recursive: true });
const VIEWPORTS = [
  { width: 360, height: 640, name: "640" },
  { width: 360, height: 560, name: "560" },
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}
const lessons = walk(path.join(APP, "content/courses"))
  .filter((f) => f.includes(`${path.sep}lessons${path.sep}`) && f.endsWith(".json"))
  .map((f) => ({ file: f, course: path.relative(path.join(APP, "content/courses"), f).split(path.sep)[0], lesson: JSON.parse(fs.readFileSync(f, "utf8")) }))
  .filter((l) => !process.env.COURSE || l.course.includes(process.env.COURSE));

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
const report = [];
try {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, colorScheme: "dark", reducedMotion: "reduce", isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.route(/\/script\.js$|\/_vercel\/insights\//, (r) => r.abort());
    for (const { course, lesson } of lessons) {
      for (let i = 0; i < lesson.cards.length; i++) {
        const card = lesson.cards[i];
        await page.goto(`${BASE}/dev/fit?lesson=${lesson.id}&card=${i}`, { waitUntil: "domcontentloaded" });
        await page.locator("[data-card-stage]").first().waitFor({ timeout: 60000 }).catch(() => {});
        // /dev/fit marks every panel as seen, but progress loads after the first paint: wait for
        // a "How to play" panel to go, or it's counted as overflow.
        await page.getByText("How to play", { exact: true }).waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(250);
        const over = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
        const row = { viewport: vp.name, course, lesson: lesson.id, kind: lesson.kind, card: i + 1, id: card.id, type: card.type + (card.mode ? `:${card.mode}` : ""), over };
        report.push(row);
        if (over > 4) {
          console.log(`✗ ${vp.name} ${lesson.id} #${i + 1} ${card.id} (${row.type}): ${over}px below the fold`);
          if (vp.name === "640") await page.screenshot({ path: path.join(OUT, `${lesson.id}-${i + 1}.png`), fullPage: true });
        }
      }
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
}
for (const vp of VIEWPORTS) {
  const rows = report.filter((r) => r.viewport === vp.name);
  const bad = rows.filter((r) => r.over > 4);
  console.log(`\n${vp.name}px tall: ${bad.length} of ${rows.length} cards don't fit`);
  const byType = {};
  for (const r of bad) byType[r.type] = (byType[r.type] ?? 0) + 1;
  console.log("  by type:", JSON.stringify(byType));
}
