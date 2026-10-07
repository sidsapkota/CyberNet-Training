// Adaptive pacing in the real lesson player (/dev/cards "Play the pacing demo": six true/false cards,
// card 4 the easy win, card 6 an extra example after card 5). Dev server running.
// - Three right first time: the easy win is skipped (card 3 → card 5), and with card 5 right the
//   extra example is skipped too (card 5 → lesson complete).
// - A miss on card 1: the easy win is shown; a miss on card 5: the extra example is shown.
//   npm run e2e:pacing
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};

async function open(page) {
  await page.goto(`${BASE}/dev/cards`);
  await page.getByRole("button", { name: "Play the pacing demo" }).click({ timeout: 60000 });
}
let last = 0;
/** The card on screen once it has changed from the last one read (0 when the lesson is over). */
const shown = async (page) => {
  for (let t = 0; t < 60; t++) {
    if (await page.getByText("Lesson complete", { exact: true }).isVisible().catch(() => false)) return (last = 0);
    const text = await page.getByText(/^Pacing card \d: is this true\?$/).first().textContent({ timeout: 2000 }).catch(() => null);
    const n = Number(text?.match(/card (\d)/)?.[1] ?? 0);
    if (n && n !== last) return (last = n);
    await page.waitForTimeout(200);
  }
  return last;
};
async function answer(page, right) {
  await page.getByRole("radio", { name: right ? "True" : "False", exact: true }).click();
  await page.getByRole("button", { name: "Check", exact: true }).click();
  if (!right) {
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await page.getByRole("radio", { name: "True", exact: true }).click();
    await page.getByRole("button", { name: "Check", exact: true }).click();
  }
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  await prepare(page);

  await open(page);
  last = 0;
  const seenFast = [await shown(page)];
  for (let i = 0; i < 3; i++) {
    await answer(page, true);
    seenFast.push(await shown(page).catch(() => 0));
  }
  record("Three right first time: the easy win (card 4) is skipped", seenFast.join(",") === "1,2,3,5", seenFast.join(","));
  await answer(page, true);
  record("Card 5 right: the extra example (card 6) is skipped and the lesson ends", await page.getByText("Lesson complete", { exact: true }).isVisible({ timeout: 15000 }).catch(() => false));

  await open(page);
  last = 0;
  const seenSlow = [await shown(page)];
  // A miss on card 1, then right on 2, 3 and the easy win 4, then a miss on card 5.
  for (const right of [false, true, true, true, false]) {
    await answer(page, right);
    seenSlow.push(await shown(page).catch(() => 0));
  }
  record("After a miss the easy win is shown, and after a miss on card 5 the extra example is too", seenSlow.join(",") === "1,2,3,4,5,6", seenSlow.join(","));
} finally {
  await browser.close();
}
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} check(s) failed.` : `\n✓ All ${results.length} pacing checks passed.`);
process.exit(failed ? 1 : 0);
