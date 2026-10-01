// "What's stopping you?" on /pro, at 360×640: "Not now" asks the question once (it fits the screen,
// every answer is a 44px+ tap), one tap sends `pro_declined` with only the reason and the screen and
// carries on home, and a second "Not now" within the week goes straight home. No account needed.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

// Run with the dev server up (`npm run dev`), then `npm run e2e:pro-declined`. Uses an installed
// Edge or Chrome (E2E_BROWSER=chrome).
const APP = path.resolve(import.meta.dirname, "../..");
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SHOTS = path.join(APP, ".e2e-shots");
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
// In development, Vercel Analytics logs each event to the console instead of sending it.
const logs = [];
page.on("console", async (m) => {
  const args = await Promise.all(m.args().map((a) => a.jsonValue().catch(() => null)));
  logs.push(JSON.stringify(args));
});

await page.goto(`${BASE}/pro`);
await page.getByRole("button", { name: "Go unlimited with Pro" }).or(page.getByText("isn't available to buy")).first().waitFor();
await page.getByRole("link", { name: "Not now" }).click();

const heading = page.getByRole("heading", { name: "What's stopping you?" });
await heading.waitFor();
record("Not now asks the question", true);
record("focus moves to the question", await heading.evaluate((el) => el === document.activeElement));
await page.screenshot({ path: path.join(SHOTS, "pro-declined-360.png") });

const answers = ["Too expensive", "Need to ask a parent", "Not sure it's worth it yet", "Just exploring", "Skip"];
let fits = true;
let tall = true;
for (const name of answers) {
  const box = await page.getByRole("button", { name, exact: true }).boundingBox();
  if (!box || box.y + box.height > 640) fits = false;
  if (!box || box.height < 44) tall = false;
}
record("every answer and Skip fit a 360×640 screen", fits);
record("every answer is at least 44px tall", tall);
record("no sideways scrolling", await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));

await page.getByRole("button", { name: "Need to ask a parent" }).click();
await page.waitForURL(`${BASE}/`);
record("one tap carries on home", true);
await page.waitForTimeout(300); // let the console handler read the event's values
const sent = logs.find((l) => l.includes("pro_declined"));
record("pro_declined is sent", Boolean(sent), sent?.match(/"data":\{[^}]*\}/)?.[0]);
record(
  "it carries only the reason and the screen",
  Boolean(sent) && sent.includes("ask_parent") && sent.includes("pro_page") && /"data":\{"reason":"ask_parent","source":"pro_page"\}/.test(sent),
);

await page.goto(`${BASE}/pro`);
await page.getByRole("link", { name: "Not now" }).click();
await page.waitForURL(`${BASE}/`);
record("asked at most once a week: Not now goes straight home", (await page.getByRole("heading", { name: "What's stopping you?" }).count()) === 0);

await browser.close();
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
