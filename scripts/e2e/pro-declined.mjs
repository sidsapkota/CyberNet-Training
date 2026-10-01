// "What's stopping you?" on a Pro pitch (the /review paywall, as a free account), at 360×640:
// "Not now" asks the question once (it fits the screen, every answer is a 44px+ tap), one tap sends
// `pro_declined` with only the reason and the screen and carries on home, and a second "Not now"
// within the week goes straight home. The throwaway account is deleted afterwards.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";

// Run with the dev server up (`npm run dev`), then `npm run e2e:pro-declined`. Needs .env.local with
// the Supabase URL and SUPABASE_SECRET_KEY. Uses an installed Edge or Chrome (E2E_BROWSER=chrome).
const APP = path.resolve(import.meta.dirname, "../..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(APP, ".env.local"), "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SHOTS = path.join(APP, ".e2e-shots");
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};

const email = `declined-e2e-${Date.now()}@example.com`;
const { data: created, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
if (error) throw error;
const userId = created.user.id;
const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  await admin.from("profiles").update({ username: `E2e_${Math.random().toString(36).slice(2, 12)}`, age_confirmed: true }).eq("id", userId);
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  await prepare(page);
  // Events recorded in the page from every call to Vercel's queue, with Vercel's script blocked so
  // nothing is sent (works locally, on previews and on production).
  const events = [];
  await page.exposeFunction("__onEvent", (name, data) => events.push([name, data]));
  await page.route(/\/script\.js$|\/_vercel\/insights\//, (route) => route.abort());
  await page.addInitScript(() => {
    let current;
    const record = (fn) => (...args) => {
      if (args[0] === "event") void window.__onEvent?.(args[1]?.name, args[1]?.data ?? {});
      return fn(...args);
    };
    Object.defineProperty(window, "va", { configurable: true, get: () => current, set: (fn) => (current = record(fn)) });
  });
  await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=/review`);
  await page.waitForURL((u) => u.pathname === "/review", { timeout: 30000 });
  await page.getByRole("heading", { name: "Review your mistakes" }).waitFor({ timeout: 30000 });
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
  await page.waitForTimeout(500);
  const sent = events.find(([n]) => n === "pro_declined");
  record("pro_declined carries only the reason and the screen", JSON.stringify(sent?.[1]) === '{"reason":"ask_parent","source":"paywall"}', JSON.stringify(sent));

  await page.goto(`${BASE}/review`);
  await page.getByRole("link", { name: "Not now" }).click();
  await page.waitForURL(`${BASE}/`);
  record("asked at most once a week: Not now goes straight home", (await page.getByRole("heading", { name: "What's stopping you?" }).count()) === 0);
} finally {
  await browser.close();
  await admin.auth.admin.deleteUser(userId);
}
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
