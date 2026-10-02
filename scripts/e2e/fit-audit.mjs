// Fit audit: every card of every lesson and quiz, in the real lesson player (/dev/fit), at 360×640
// and at the Instagram browser's ~360×560. A card "fits" when the page doesn't scroll: its prompt,
// interactive area and labels, with the sticky header and footer, all on one screen.
// Writes .e2e-shots/fit/report.json and prints the cards that don't fit (by how many px).
//   npm run e2e:fit-audit            (dev server running; COURSE=<id> for one course, LESSONS=<id,id> for some lessons)
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";

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
  .filter((l) => !process.env.COURSE || l.course.includes(process.env.COURSE))
  .filter((l) => !process.env.LESSONS || process.env.LESSONS.split(",").includes(l.lesson.id));

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
const report = [];
try {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, colorScheme: "dark", reducedMotion: "reduce", isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    // A protected preview needs its share link first, or every card measures Vercel's login page.
    await prepare(page);
    await page.route(/\/script\.js$|\/_vercel\/insights\//, (r) => r.abort());
    for (const { course, lesson } of lessons) {
      for (let i = 0; i < lesson.cards.length; i++) {
        const card = lesson.cards[i];
        await page.goto(`${BASE}/dev/fit?lesson=${lesson.id}&card=${i}`, { waitUntil: "domcontentloaded" });
        const found = await page.locator("[data-card-stage]").first().waitFor({ timeout: 60000 }).then(() => true, () => false);
        if (!found) throw new Error(`No lesson player at ${page.url()} (a login page? set E2E_SHARE_URL for a preview)`);
        // /dev/fit marks every panel as seen, but progress loads after the first paint: wait for
        // a "How to play" panel to go, or it's counted as overflow.
        await page.getByText("How to play", { exact: true }).waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(250);
        const over = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
        // Every control in the card (choices, drag items, bins, switches, scene parts, answer boxes)
        // must be on screen between the player's header and footer without scrolling: nobody should
        // have to scroll mid-drag or hunt for an option. This check fails the run.
        const hidden = await page.evaluate(() => {
          const stage = document.querySelector("[data-card-stage]");
          if (!stage) return [];
          const top = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
          const bottom = document.querySelector("[data-player-footer]")?.getBoundingClientRect().top ?? window.innerHeight;
          const controls = [...stage.querySelectorAll("button, input, textarea, select, [role=button], [role=radio], [role=switch], [role=checkbox], [role=option]")]
            // Inline glossary terms are words in a sentence, not options.
            .filter((el) => !el.closest("[data-glossary-term]"))
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
            });
          return controls
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return r.bottom > bottom + 1 || r.top < top - 1;
            })
            .map((el) => (el.getAttribute("aria-label") || el.textContent || el.tagName).replace(/\s+/g, " ").trim().slice(0, 40));
        });
        const row = { viewport: vp.name, course, lesson: lesson.id, kind: lesson.kind, card: i + 1, id: card.id, type: card.type + (card.mode ? `:${card.mode}` : ""), over, hidden };
        report.push(row);
        if (hidden.length > 0) console.log(`✗✗ ${vp.name} ${lesson.id} #${i + 1} ${card.id} (${row.type}): ${hidden.length} control(s) need scrolling: ${hidden.slice(0, 3).join(" | ")}`);
        if (over > 4) {
          console.log(`✗ ${vp.name} ${lesson.id} #${i + 1} ${card.id} (${row.type}): ${over}px below the fold`);
          if (vp.name === (process.env.SHOT_VP ?? "640")) await page.screenshot({ path: path.join(OUT, `${lesson.id}-${i + 1}.png`), fullPage: true });
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
  const hiddenCards = rows.filter((r) => r.hidden.length > 0);
  console.log(`  ${hiddenCards.length} card(s) need scrolling to reach a control (a choice, drag item, bin, switch, part or answer box)`);
}
// A control below the fold fails the run; page overflow alone (a long prompt, say) is reported.
const failing = report.filter((r) => r.hidden.length > 0).length;
if (failing > 0) {
  console.log(`\n✗ ${failing} card view(s) hide a control below the fold. Every option must be visible without scrolling.`);
  process.exit(1);
}
