// temp audit driver. usage: node _audit-safety.mjs <lesson> <card> <shotname> '<actions json>'
import path from "node:path";
import { chromium } from "playwright-core";
const [lesson, card, shot, actsRaw] = process.argv.slice(2);
const acts = actsRaw ? JSON.parse(actsRaw) : [];
const OUT = path.resolve(import.meta.dirname, "../../.e2e-shots/audit/safety");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, colorScheme: "dark", isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE ERR:", m.text().slice(0, 300)); });
page.on("pageerror", (e) => console.log("PAGEERR:", e.message.slice(0,300)));
await page.route(/\/script\.js$|\/_vercel\/insights\//, (r) => r.abort());
await page.goto(card === "real" ? `http://localhost:3000/lesson/${lesson}` : `http://localhost:3000/dev/fit?lesson=${lesson}&card=${card}`, { waitUntil: "domcontentloaded" });
await page.locator("[data-card-stage]").first().waitFor({ timeout: card === "real" ? 15000 : 60000 }).catch(() => {});
await page.waitForTimeout(600);
async function report(label) {
  const info = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden"; };
    const btns = [...document.querySelectorAll("button,[role=radio],[role=checkbox],a,[role=button]")].filter(vis).map((b) => {
      const r = b.getBoundingClientRect();
      return `${(b.getAttribute("aria-label") || b.innerText || "").replace(/\s+/g, " ").trim().slice(0, 70)}${b.disabled || b.getAttribute("aria-disabled") === "true" ? " [disabled]" : ""}${b.getAttribute("aria-pressed") === "true" || b.getAttribute("aria-checked") === "true" ? " [on]" : ""} @${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`;
    });
    return { over: document.documentElement.scrollHeight - window.innerHeight + " | scrollWidth " + document.documentElement.scrollWidth + " innerH " + window.innerHeight, text: document.body.innerText.replace(/\n{2,}/g, "\n"), btns };
  });
  console.log(`=== ${label} | overflow ${info.over}px`);
  console.log(info.text);
  console.log("--- controls:"); console.log(info.btns.join("\n"));
}
let n = 0;
for (const a of acts) {
  try {
    if (a.text) await page.getByText(a.text, { exact: !!a.exact }).nth(a.nth ?? 0).click({ timeout: 5000 });
    else if (a.role) await page.getByRole(a.role, { name: a.name, exact: !!a.exact }).nth(a.nth ?? 0).click({ timeout: 5000 });
    else if (a.sel) await page.locator(a.sel).nth(a.nth ?? 0).click({ timeout: 5000 });
    else if (a.tap) await page.touchscreen.tap(a.tap[0], a.tap[1]);
    else if (a.fill) await page.locator(a.fill).first().fill(a.value);
    else if (a.press) await page.keyboard.press(a.press);
    else if (a.drag) { const s = page.locator(a.drag).nth(a.from); const t = page.locator(a.drag).nth(a.to); await s.dragTo(t); }
    else if (a.scroll !== undefined) await page.evaluate((y) => window.scrollTo(0, y), a.scroll);
  } catch (e) { console.log("ACTION FAILED", JSON.stringify(a), e.message.split("\n")[0]); }
  await page.waitForTimeout(a.wait ?? 900);
  n++;
  if (a.shot) { await page.screenshot({ path: path.join(OUT, `${shot}-${a.shot}.png`) }); }
  if (a.report) await report(`after action ${n} ${JSON.stringify(a)}`);
}
await report("final");
await page.screenshot({ path: path.join(OUT, `${shot}.png`) });
await browser.close();
