// The lesson player's Back and forward, Listen and the quit event, end to end (dev playground,
// throwaway progress): answer a card, go back to earlier cards (read-only, nothing re-graded, no XP
// change), come forward to where you were with your answer still there, and leave mid-lesson.
// Run with the dev server up (`npm run dev`), then `npm run e2e:player-back`.
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
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  // A fake speech engine, so Listen can be checked without sound (and on machines without voices).
  await ctx.addInitScript(() => {
    window.__spoken = [];
    window.__events = [];
    const fake = {
      speak: (u) => {
        window.__spoken.push(u.text);
        setTimeout(() => u.onend?.(), 50);
      },
      cancel: () => {},
      getVoices: () => [],
    };
    Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class {
        constructor(text) {
          this.text = text;
        }
      },
      configurable: true,
    });
    // Analytics: record events instead of sending them (Vercel's script checks for window.va first).
    const va = (type, payload) => {
      if (type === "event") window.__events.push(payload);
    };
    Object.defineProperty(window, "va", { get: () => va, set: () => {}, configurable: true });
  });
  const page = await ctx.newPage();
  await prepare(page);
  // The Next.js dev badge sits over the footer's Back button in development (never in production).
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal { display: none !important; }";
      document.head.append(style);
    });
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(`${BASE}/dev/cards`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Play all as a lesson/ }).click();
  const stage = page.locator("[data-card-stage]");
  await stage.waitFor();

  // Card 1 (explainer) and card 2 (photo): Continue.
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(200);

  // Card 3 (multiple choice): Listen reads the prompt and options, never the explanation.
  await page.getByRole("button", { name: "Listen" }).click();
  const spoken = await page.evaluate(() => window.__spoken.at(-1) ?? "");
  record("Listen reads the prompt and the options", /private/i.test(spoken) && /options are/i.test(spoken), spoken.slice(0, 80));
  record("…but not the explanation before Check", !/Explanation\./.test(spoken));

  // Answer it: try options until it's right.
  const options = page.locator("[data-card-stage] [role=radio]");
  const n = await options.count();
  for (let i = 0; i < n; i++) {
    await options.nth(i).click();
    await page.getByRole("button", { name: "Check" }).click();
    await page.waitForTimeout(300);
    if (await page.getByRole("button", { name: "Continue" }).count()) break;
    await page.getByRole("button", { name: "Try again" }).click();
  }
  const reaction = await page.locator("footer [role=status] p").first().innerText();
  record("A right answer gets the mascot's one-line reaction", reaction.length > 0 && !/^Not/.test(reaction), reaction);
  const xpBefore = await page.locator("header").innerText();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(300);

  // Card 4 (drag to order): change the order a little with the keyboard, then go back.
  const liveCard = await stage.innerText();
  await page.getByRole("button", { name: "Back to the previous card" }).click();
  await page.waitForTimeout(300);
  record("Back shows the answered card, read-only", (await page.getByText("You got this one").count()) > 0 && (await page.getByText(/looking back/i).count()) > 0);
  record("…with no Check or Try again", (await page.getByRole("button", { name: /^(Check|Try again)$/ }).count()) === 0);
  record("…and the options can't be changed", (await options.first().isDisabled().catch(() => true)) || (await options.first().getAttribute("aria-disabled")) === "true");
  record("XP didn't change by going back", (await page.locator("header").innerText()) === xpBefore);
  await page.keyboard.press("Alt+ArrowLeft");
  await page.waitForTimeout(300);
  record("Alt + Left goes back again (the photo)", (await page.getByText(/Card 2 of/).count()) > 0);
  await page.keyboard.press("Alt+ArrowRight");
  await page.waitForTimeout(300);
  record("Alt + Right comes forward", (await page.getByText(/Card 3 of/).count()) > 0);
  await page.getByRole("button", { name: /Back to card 4/ }).first().click();
  await page.waitForTimeout(300);
  record("Back to card 4 returns to where you were, unchanged", (await stage.innerText()) === liveCard && (await page.getByText(/looking back/i).count()) === 0);
  record("The browser stayed on the lesson (Alt + Left didn't navigate away)", page.url().includes("/dev/cards"));

  // Leave mid-lesson: the quit event is sent once, with the card number.
  await page.getByRole("button", { name: "Back to card list" }).click();
  await page.waitForTimeout(500);
  const all = await page.evaluate(() => window.__events);
  const quits = all.filter((e) => e.name === "lesson_quit");
  record(
    "Leaving mid-lesson sends lesson_quit once, with the lesson and card number only",
    quits.length === 1 && quits[0].data?.card === "4" && Object.keys(quits[0].data).sort().join() === "card,lesson",
    JSON.stringify(quits),
  );
  record("No page errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
} finally {
  await browser.close();
}
console.log(results.length && results.every(Boolean) ? `All ${results.length} checks passed.` : `${results.filter((r) => !r).length} FAILED`);
process.exitCode = results.every(Boolean) ? 0 : 1;
