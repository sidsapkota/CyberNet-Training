// The Feed, end to end on STAGING (refuses production). Dev server running.
// - The flag: off, /feed is a 404 without ?feed=1 (on: the tab and the landing byte show).
// - Guest at 360x560: a byte answered right shows the reveal and +XP; Go deeper goes to its lesson;
//   Next and the arrow keys move; events byte_viewed, byte_answered, byte_go_deeper; after 5 bytes,
//   the sign-up card (feed_signup when a sign-in option is used).
// - Signing in carries the guest's bytes over (at most 5, priced from the content).
// - Signed in: XP is the server's (graded there), capped at 50 a day; a wrong answer earns nothing.
// - After 15 minutes, the break card (with a fake clock); "Keep going" dismisses it.
// - The video view plays itself; every byte fits 360x560 and desktop with nothing covered.
//   npm run e2e:feed
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";
import { allLessons, answerCard } from "./lib/answer.mjs";
import { readEnvEntries, PRODUCTION_REF } from "./lib/env.mjs";
import { layoutProblems } from "./lib/layout.mjs";

const APP = path.resolve(import.meta.dirname, "../..");
const env = Object.fromEntries(readEnvEntries(APP));
if (env.NEXT_PUBLIC_SUPABASE_URL.includes(PRODUCTION_REF)) throw new Error("e2e:feed creates learners: staging only.");
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SHOTS = path.join(APP, ".e2e-shots");

const bytes = JSON.parse(fs.readFileSync(path.join(APP, "content/bytes/bytes.json"), "utf8"));
const lessons = new Map(allLessons(APP).map((l) => [l.id, l]));
const cardOf = (b) => lessons.get(b.lesson).cards.find((c) => c.id === b.card);
const mcBytes = bytes.filter((b) => cardOf(b).type === "multiple_choice" && !b.rare);
if (mcBytes.length < 4) throw new Error("e2e:feed needs 4 multiple-choice bytes");

const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};
const until = async (check, ms = 20000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await check()) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
};
async function watchEvents(page) {
  const sent = [];
  page.__sent = sent;
  await page.exposeFunction("__onEvent", (name, data) => sent.push([name, data]));
  await page.route(/\/script\.js$|\/_vercel\/insights\//, (route) => route.abort());
  await page.addInitScript(() => {
    let current;
    const record = (fn) => (...args) => {
      if (args[0] === "event") void window.__onEvent?.(args[1]?.name, args[1]?.data ?? {});
      return fn(...args);
    };
    Object.defineProperty(window, "va", { configurable: true, get: () => current, set: (fn) => (current = record(fn)) });
  });
}
const sentNames = (page) => page.__sent.map(([n]) => n);
async function openFeed(page, start) {
  await page.goto(`${BASE}/feed?feed=1${start ? `&start=${start}` : ""}`);
  if (!(await page.locator("[data-index='0']").waitFor({ timeout: 30000 }).then(() => true, () => false))) {
    await page.reload(); // the dev server occasionally fails its first request
    await page.locator("[data-index='0']").waitFor({ timeout: 60000 });
  }
}
const section = (page, i) => page.locator(`[data-index='${i}']`);
const users = [];
async function learner(label) {
  const email = `feed-e2e-${label}-${Date.now()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  users.push(data.user.id);
  await admin.from("profiles").update({ username: `Feed${label}${Math.floor(Math.random() * 900 + 100)}`, age_confirmed: true, time_zone: "Australia/Sydney" }).eq("id", data.user.id);
  return { id: data.user.id, email };
}
async function signIn(page, who, next) {
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email: who.email });
  await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=${encodeURIComponent(next)}`);
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 60000 });
}

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  // 1. The flag.
  let plain = await fetch(`${BASE}/feed`);
  if (plain.status >= 500) plain = await fetch(`${BASE}/feed`); // the dev server occasionally fails its first request
  const shipped = plain.status === 200;
  if (shipped) {
    const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
    await prepare(page);
    await page.goto(`${BASE}/`);
    record("Shipped: new visitors' first screen is a live byte", await page.getByRole("region", { name: "Try one now" }).isVisible({ timeout: 30000 }).catch(() => false));
    record("Shipped: the Feed tab is in the phone tab bar", await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Feed" }).first().isVisible());
    await page.close();
  } else {
    record("Behind the flag: /feed is a 404 without ?feed=1", plain.status === 404, String(plain.status));
  }

  // 2. A guest at 360x560.
  const ctx = await browser.newContext({ viewport: { width: 360, height: 560 }, colorScheme: "dark", reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await prepare(page);
  await watchEvents(page);
  const first = mcBytes[0];
  await openFeed(page, first.id);
  record("The first byte shows its hook", await section(page, 0).getByRole("heading", { name: first.hook }).isVisible());
  const layout = await page.evaluate(layoutProblems, null);
  record("The Feed lays out cleanly at 360x560", layout.length === 0, JSON.stringify(layout));
  await page.screenshot({ path: path.join(SHOTS, "feed-byte-360.png") });
  await answerCard(page, cardOf(first)).catch(() => {}); // one-tap: it checks itself (there's no Check button to press)
  await section(page, 0).getByText("Right!").waitFor({ timeout: 15000 });
  record("A right answer shows the reveal and +5 XP", await section(page, 0).getByText("+5 XP").isVisible());
  record("The Feed XP counter goes up", await until(async () => (await page.getByLabel("5 of 50 Feed XP today").count()) > 0));
  await page.screenshot({ path: path.join(SHOTS, "feed-reveal-360.png") });
  record("byte_viewed and byte_answered (right) are sent", await until(async () => sentNames(page).includes("byte_viewed") && page.__sent.some(([n, d]) => n === "byte_answered" && d.source === "right")));
  const deeper = section(page, 0).getByRole("link", { name: /Go deeper/ });
  record("Go deeper links to the byte's lesson", (await deeper.getAttribute("href")) === `/lesson/${first.lesson}`);
  await page.getByRole("button", { name: "Next byte" }).click();
  record("Next moves to the next byte", await until(async () => (await section(page, 1).boundingBox())?.y < 120));
  await page.keyboard.press("ArrowDown");
  record("The arrow keys move too", await until(async () => (await section(page, 2).boundingBox())?.y < 120));
  await page.getByRole("button", { name: "Previous byte" }).click();
  await until(async () => (await section(page, 1).boundingBox())?.y < 120);
  const sections = await page.locator("[data-index]").count();
  record("Guests get 5 bytes, then the sign-up card", sections === 6 && (await section(page, 5).getAttribute("aria-label")) === "Sign up", String(sections));
  await section(page, 5).scrollIntoViewIfNeeded();
  await page.route(/\/auth\/v1\/authorize/, (r) => r.abort());
  const age = section(page, 5).getByRole("checkbox").first();
  if (await age.count()) await age.check();
  await section(page, 5).getByRole("button", { name: /Google/ }).click().catch(() => {});
  record("Using a sign-in option on it sends feed_signup", await until(async () => sentNames(page).includes("feed_signup"), 8000));
  await openFeed(page, first.id);
  await answerCard(page, cardOf(first)).catch(() => {}); // the link comes with the reveal
  await section(page, 0).getByRole("link", { name: /Go deeper/ }).click({ timeout: 15000 }).catch(() => {});
  record("Tapping Go deeper sends byte_go_deeper", await until(async () => sentNames(page).includes("byte_go_deeper"), 8000));

  // 3. Signing in carries the guest's byte over.
  const guestNow = await learner("guest");
  await signIn(page, guestNow, "/");
  record("Signing in carries the guest's Feed byte over (priced from the content)", await until(async () => {
    const rows = (await admin.from("card_completions").select("card_id, xp").match({ user_id: guestNow.id, lesson_id: "feed" })).data ?? [];
    return rows.length === 1 && rows[0].card_id === first.id && rows[0].xp === 5;
  }, 30000));
  await ctx.close();

  // 4. Signed in: the server's XP, the daily cap, a wrong answer.
  const fan = await learner("fan");
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page2 = await ctx2.newPage();
  await prepare(page2);
  await signIn(page2, fan, "/");
  await openFeed(page2, mcBytes[1].id);
  await answerCard(page2, cardOf(mcBytes[1])).catch(() => {});
  await section(page2, 0).getByText("Right!").waitFor({ timeout: 15000 });
  const paid = await until(async () => {
    const row = (await admin.from("card_completions").select("xp").match({ user_id: fan.id, lesson_id: "feed", card_id: mcBytes[1].id }).maybeSingle()).data;
    const event = (await admin.from("xp_events").select("xp, kind").match({ user_id: fan.id, lesson_id: "feed", card_id: mcBytes[1].id })).data ?? [];
    return row?.xp === 5 && event.length === 1 && event[0].kind === "card";
  });
  record("Signed in, a right answer earns 5 XP on the server (a card XP event, so streaks and leagues count it)", paid);
  // Nearly at the cap: 48 of 50 today.
  const day = (await admin.from("xp_events").select("day").eq("user_id", fan.id).limit(1).single()).data.day;
  await admin.from("xp_events").insert({ user_id: fan.id, at: new Date().toISOString(), day, time_zone: "Australia/Sydney", kind: "card", lesson_id: "feed", card_id: "e2e-seed", xp: 43 });
  await openFeed(page2, mcBytes[2].id);
  await answerCard(page2, cardOf(mcBytes[2])).catch(() => {});
  await section(page2, 0).getByText("Right!").waitFor({ timeout: 15000 });
  record("The daily cap: only the 2 XP left today are paid", await until(async () => (await admin.from("card_completions").select("xp").match({ user_id: fan.id, lesson_id: "feed", card_id: mcBytes[2].id }).maybeSingle()).data?.xp === 2));
  await openFeed(page2, mcBytes[3].id);
  await answerCard(page2, cardOf(mcBytes[3]), { wrong: true }).catch(() => {});
  await section(page2, 0).getByText("Not quite").waitFor({ timeout: 15000 });
  await page2.waitForTimeout(1500);
  record("A wrong answer earns nothing and isn't saved", ((await admin.from("card_completions").select("card_id").match({ user_id: fan.id, lesson_id: "feed", card_id: mcBytes[3].id })).data ?? []).length === 0);
  const forged = await page2.evaluate(async () => (await fetch("/api/lessons/feed")).status);
  record("The Feed isn't a lesson the lesson routes will pay for", forged === 404 || forged === 400, String(forged));
  await ctx2.close();

  // 5. The break card after 15 minutes.
  const ctx3 = await browser.newContext({ viewport: { width: 360, height: 640 }, reducedMotion: "reduce" });
  const page3 = await ctx3.newPage();
  await prepare(page3);
  await page3.clock.install();
  await openFeed(page3, mcBytes[0].id);
  await page3.clock.fastForward("15:05");
  const breakCard = page3.getByRole("heading", { name: "Nice work. Take a break?" });
  record("After 15 minutes, a friendly break card", await breakCard.waitFor({ timeout: 15000 }).then(() => true, () => false));
  await page3.getByRole("button", { name: "Keep going" }).click();
  record("Keep going dismisses it", await until(async () => (await breakCard.count()) === 0, 8000));
  await ctx3.close();

  // 6. The video view.
  const page4 = await browser.newPage({ viewport: { width: 540, height: 960 } });
  await page4.goto(`${BASE}/feed/video/${mcBytes[0].id}?feed=1`);
  await page4.getByRole("heading", { name: mcBytes[0].hook }).waitFor({ timeout: 60000 });
  record("The video view plays the byte and its reveal", await page4.getByText("Right!").waitFor({ timeout: 8000 }).then(() => true, () => false));
  await page4.close();

  // 7. Every byte fits, with nothing covered.
  const bad = [];
  for (const [w, h] of [[360, 560], [1440, 900]]) {
    const p = await browser.newPage({ viewport: { width: w, height: h } });
    await prepare(p);
    for (const b of bytes) {
      await openFeed(p, b.id);
      await p.waitForTimeout(250);
      const hidden = await p.evaluate(() => {
        const out = [];
        for (const el of document.querySelector("[data-index='0']").querySelectorAll("button, [role=radio], [role=switch], [role=slider], input")) {
          const r = el.getBoundingClientRect();
          if (!r.width) continue;
          const at = (y) => document.elementFromPoint(r.left + r.width / 2, Math.min(y, window.innerHeight - 1));
          const mine = (hit) => hit === null || hit === el || el.contains(hit) || hit.contains(el);
          if (r.bottom > window.innerHeight + 1 || r.top < 0 || !(mine(at(r.top + r.height / 2)) && mine(at(r.bottom - 4)))) out.push((el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30));
        }
        return out;
      });
      const problems = await p.evaluate(layoutProblems, "[data-index='0']");
      if (hidden.length || problems.length) bad.push(`${w}x${h} ${b.id}: ${JSON.stringify([...hidden, ...problems])}`);
    }
    await p.close();
  }
  record(`All ${bytes.length} bytes fit 360x560 and desktop with every control in view`, bad.length === 0, bad.slice(0, 3).join("; "));
} finally {
  await browser.close();
  for (const id of users) await admin.auth.admin.deleteUser(id);
}
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} check(s) failed.` : `\n✓ All ${results.length} Feed checks passed.`);
process.exit(failed ? 1 : 0);
