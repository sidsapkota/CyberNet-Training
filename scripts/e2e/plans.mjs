// Plans and Pro identity at 360×640, as a guest, a free account and a Pro member (throwaway
// accounts, deleted afterwards; the Pro one gets a stand-in subscription row, never a real Stripe one):
// - /pro: the Pro card first with its button in view, "Best value", the monthly switch, Free's
//   button per viewer, the FAQ, plans_viewed / plan_selected with only their allowed data;
// - a Pro member: the welcome moment once per device, the Pro badge and node frame, Your plan,
//   and no upgrade prompt anywhere.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";
import { closeLeaguesWelcome } from "./lib/welcome.mjs";
import { readEnvEntries } from "./lib/env.mjs";

// Run with the dev server up (`npm run dev`), then `npm run e2e:plans`. Needs .env.local with the
// Supabase URL and SUPABASE_SECRET_KEY. Uses an installed Edge or Chrome (E2E_BROWSER=chrome).
const APP = path.resolve(import.meta.dirname, "../..");
const env = Object.fromEntries(
  readEnvEntries(APP),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SHOTS = path.join(APP, ".e2e-shots");
fs.mkdirSync(SHOTS, { recursive: true });
const PHONE = { width: 360, height: 640 };
const TAB_BAR = 64;
const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};
const UPGRADE = /Go unlimited|Review with Pro|left today|Start 7-day free trial|Start your 7-day|See CyberNet Pro|Upgrade to Pro|See plans|Come back to Pro/;

/**
 * Analytics events, recorded inside the page from every call to Vercel's queue (`window.va`), with
 * Vercel's script blocked so nothing is ever sent (tests never reach the real analytics). Works the
 * same locally and on production. Read them with `events(page)`: [name, data].
 */
async function watchEvents(page) {
  // Also handed to the test as they happen, so a page that navigates away (to Stripe) can't lose them.
  const sent = [];
  page.__sent = sent;
  await page.exposeFunction("__onEvent", (name, data) => sent.push([name, data]));
  await page.route(/\/script\.js$|\/_vercel\/insights\//, (route) => route.abort());
  await page.addInitScript(() => {
    window.__events = [];
    let current;
    const record = (fn) => (...args) => {
      if (args[0] === "event") {
        window.__events.push([args[1]?.name, args[1]?.data ?? {}]);
        void window.__onEvent?.(args[1]?.name, args[1]?.data ?? {});
      }
      return fn(...args);
    };
    Object.defineProperty(window, "va", { configurable: true, get: () => current, set: (fn) => (current = record(fn)) });
    // No queue of our own: the app must create it (ensureAnalyticsQueue), or first-load events are lost.
  });
}
const events = async (page) => page.__sent ?? [];

async function signIn(ctx, email) {
  const page = await ctx.newPage();
  await prepare(page);
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=/`);
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 30000 });
  await closeLeaguesWelcome(page);
  return page;
}

async function makeUser(tag) {
  const email = `plans-${tag}-${Date.now()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  const id = data.user.id;
  await admin.from("profiles").update({ username: `E2e_${Math.random().toString(36).slice(2, 12)}`, age_confirmed: true }).eq("id", id);
  // A finished card, so the dashboard (not the welcome) shows.
  await admin.from("card_completions").insert({ user_id: id, lesson_id: "what-is-an-ip-address", card_id: "ip-purpose", xp: 10, completed_at: new Date().toISOString() });
  return { id, email };
}

/** While the Founding Member offer is on, its button is /pro's main one (it comes first). */
async function founderOfferShown(page) {
  const name = /Get lifetime Pro for/;
  return page.getByRole("button", { name }).or(page.getByRole("link", { name })).first().waitFor({ timeout: 5000 }).then(() => true, () => false);
}

async function proButtonInView(page, name) {
  const button = page.getByRole("button", { name }).or(page.getByRole("link", { name })).first();
  await button.waitFor({ timeout: 30000 });
  const box = await button.boundingBox();
  return { ok: Boolean(box) && box.y + box.height <= PHONE.height - TAB_BAR, detail: box ? `bottom ${Math.round(box.y + box.height)}px of ${PHONE.height - TAB_BAR}` : "no box" };
}

const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
const users = [];
const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  // 1. Guest.
  {
    const ctx = await browser.newContext({ viewport: PHONE, colorScheme: "dark", reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await prepare(page);
    await watchEvents(page);
    await page.goto(`${BASE}/pro`);
    await page.getByRole("heading", { name: "Choose your plan" }).waitFor({ timeout: 30000 });
    const guestFounder = await founderOfferShown(page);
    const inView = await proButtonInView(page, guestFounder ? /Get lifetime Pro for/ : /Start your free trial/);
    record(`Guest /pro: the main buy button is in view at 360×640 (${guestFounder ? "founder offer" : "trial"})`, inView.ok, inView.detail);
    const proTop = (await page.getByRole("heading", { name: "Pro", exact: true }).boundingBox())?.y ?? 9999;
    const freeTop = (await page.getByRole("heading", { name: "Free", exact: true }).boundingBox())?.y ?? 0;
    record("…the Pro card comes first on phones", proTop < freeTop);
    record("…tagged Best value", (await page.getByText("Best value").count()) === 1);
    record("…with exactly 4 Pro benefits, all live", (await page.getByRole("list", { name: "Pro includes" }).getByRole("listitem").count()) === 4);
    record("…and no 'every new course'", (await page.getByText(/new course/i).count()) === 0);
    const before = await page.locator("[aria-live=polite]").first().innerText();
    await page.getByRole("radio", { name: "Monthly" }).click();
    const after = await page.locator("[aria-live=polite]").first().innerText();
    record("…the monthly switch changes the price", before !== after && /a month/.test(after), `${before} → ${after}`);
    record("…Free says Start free", (await page.getByRole("link", { name: "Start free" }).count()) === 1);
    record("…a three-question FAQ", (await page.locator("section[aria-labelledby=pro-faq] details").count()) === 3);
    record("…no sideways scrolling", !(await sideways(page)));
    const proH = (await page.locator("section[aria-labelledby=plan-pro]").boundingBox())?.height ?? 0;
    const freeH = (await page.locator("section[aria-labelledby=plan-free]").boundingBox())?.height ?? 0;
    record("…stacked on phones, the cards keep their natural heights", Math.abs(proH - freeH) > 40, `Pro ${Math.round(proH)}px, Free ${Math.round(freeH)}px`);
    await page.getByRole("radio", { name: /Yearly/ }).click();
    await page.screenshot({ path: path.join(SHOTS, "plans-guest-360.png") });
    await page.emulateMedia({ colorScheme: "light" });
    await page.screenshot({ path: path.join(SHOTS, "plans-guest-360-light.png") });
    await page.waitForTimeout(500);
    const viewed = (await events(page)).find(([n]) => n === "plans_viewed");
    record("…plans_viewed sent with source pro_page only", JSON.stringify(viewed?.[1]) === '{"source":"pro_page"}', JSON.stringify(viewed));
    // The tab bar's Pricing link (phones) goes to the plans and says it came from the nav.
    await page.goto(`${BASE}/courses`);
    const tab = page.getByRole("navigation", { name: "Main" }).last().getByRole("link", { name: "Pricing" });
    await tab.waitFor({ timeout: 30000 });
    record("Guest, phone: Pricing in the tab bar", true);
    await page.screenshot({ path: path.join(SHOTS, "nav-guest-360.png") });
    await tab.click();
    await page.getByRole("heading", { name: "Choose your plan" }).waitFor({ timeout: 30000 });
    await page.waitForTimeout(500);
    record("…opens the plans with plans_viewed {source: nav}", (await events(page)).some(([n, d]) => n === "plans_viewed" && JSON.stringify(d) === '{"source":"nav"}'), JSON.stringify(await events(page)));
    await page.getByRole("link", { name: "Start free" }).click();
    await page.waitForURL(/\/login/);
    await page.waitForTimeout(500);
    const picked = (await events(page)).find(([n]) => n === "plan_selected");
    record("…Start free sends plan_selected {plan: free}", JSON.stringify(picked?.[1]) === '{"plan":"free"}', JSON.stringify(picked));
    await ctx.close();

    // Desktop: the cards side by side, the same height, the buttons lined up; Pricing in the header.
    for (const scheme of ["dark", "light"]) {
      const wide = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme, reducedMotion: "reduce" });
      const desk = await wide.newPage();
      await prepare(desk);
      await desk.goto(`${BASE}/pro`);
      await desk.getByRole("heading", { name: "Choose your plan" }).waitFor({ timeout: 30000 });
      await desk.getByRole("link", { name: /Start your free trial/ }).waitFor({ timeout: 30000 });
      const pro = await desk.locator("section[aria-labelledby=plan-pro]").boundingBox();
      const free = await desk.locator("section[aria-labelledby=plan-free]").boundingBox();
      const proBtn = await desk.getByRole("link", { name: /Start your free trial/ }).boundingBox();
      const freeBtn = await desk.getByRole("link", { name: "Start free" }).boundingBox();
      if (scheme === "dark") {
        record("Desktop: Free and Pro side by side", Math.abs(pro.y - free.y) < 8 && free.x < pro.x);
        record("…the same height", Math.abs(pro.height - free.height) <= 2, `Pro ${Math.round(pro.height)}px, Free ${Math.round(free.height)}px`);
        record("…buttons aligned along the bottom", Math.abs(proBtn.y + proBtn.height - (freeBtn.y + freeBtn.height)) <= 2, `Pro ${Math.round(proBtn.y + proBtn.height)}, Free ${Math.round(freeBtn.y + freeBtn.height)}`);
        record("…Free says Upgrade any time, no extra benefits", (await desk.getByText("Upgrade any time.").count()) === 1 && (await desk.getByRole("list", { name: "Free includes" }).getByRole("listitem").count()) === 3);
        record("Desktop: Pricing in the header nav", (await desk.getByRole("navigation", { name: "Main" }).first().getByRole("link", { name: "Pricing" }).count()) === 1);
      }
      await desk.screenshot({ path: path.join(SHOTS, `plans-desktop-${scheme}.png`) });
      await wide.close();
    }
  }

  // 2. Free account.
  {
    const free = await makeUser("free");
    users.push(free.id);
    const ctx = await browser.newContext({ viewport: PHONE, colorScheme: "dark", reducedMotion: "reduce" });
    const page = await signIn(ctx, free.email);
    await watchEvents(page);
    await page.goto(`${BASE}/`);
    await closeLeaguesWelcome(page);
    const plansLink = page.getByRole("link", { name: "Free plan · See plans" });
    await plansLink.waitFor({ timeout: 30000 });
    record("Free dashboard: 'Free plan · See plans' at the top", true);
    await plansLink.click();
    await page.getByRole("heading", { name: "Choose your plan" }).waitFor({ timeout: 30000 });
    const freeFounder = await founderOfferShown(page);
    const inView = await proButtonInView(page, freeFounder ? /Get lifetime Pro for/ : "Start 7-day free trial");
    record(`Free /pro: the main buy button is in view at 360×640 (${freeFounder ? "founder offer" : "trial"})`, inView.ok, inView.detail);
    record("…Free shows Your plan (disabled)", await page.getByRole("button", { name: "Your plan" }).isDisabled());
    await page.waitForTimeout(500);
    const seen = await events(page);
    record("…plans_viewed with source dashboard", seen.some(([n, d]) => n === "plans_viewed" && JSON.stringify(d) === '{"source":"dashboard"}'), JSON.stringify(seen));
    // Picking Pro opens Stripe's checkout. Locally that's the sandbox; on production it would be a
    // live checkout (and a real Stripe customer), so it's skipped there.
    if (/localhost|127\.0\.0\.1/.test(BASE)) {
      await page.getByRole("radio", { name: "Monthly" }).click();
      // Picking Pro opens Stripe's (sandbox) checkout: stop at the event.
      await page.route(/checkout\.stripe\.com/, (r) => r.abort());
      await page.getByRole("button", { name: "Start 7-day free trial" }).click();
      await page.waitForTimeout(1500);
      const picks = await events(page).catch(() => []);
      record(
        "…picking Pro sends plan_selected {plan: pro, interval: monthly}",
        picks.some(([n, d]) => n === "plan_selected" && JSON.stringify(d) === '{"plan":"pro","interval":"monthly"}'),
        JSON.stringify(picks.filter(([n]) => n === "plan_selected")),
      );
    } else console.log("- skipped on production: picking Pro (would open a live Stripe checkout)");
    await page.goto(`${BASE}/account`);
    await page.getByRole("heading", { name: "Your plan" }).waitFor({ timeout: 30000 });
    record("Free /account: Your plan, with See plans", (await page.getByRole("link", { name: "See plans" }).count()) === 1);
    await ctx.close();
  }

  // 3. Pro member (a stand-in subscription that started yesterday).
  {
    const pro = await makeUser("pro");
    users.push(pro.id);
    const day = 86_400_000;
    const sub = await admin.from("subscriptions").insert({
      id: `sub_e2e${Date.now()}`,
      user_id: pro.id,
      customer_id: `cus_e2e${Date.now()}`,
      status: "active",
      price_id: "price_e2e",
      billing_interval: "year",
      current_period_end: new Date(Date.now() + 364 * day).toISOString(),
      started_at: new Date(Date.now() - day).toISOString(),
    });
    if (sub.error) throw sub.error;
    await admin.rpc("record_mistake", { p_user: pro.id, p_lesson: "what-is-an-ip-address", p_card: "ip-purpose" });
    const ctx = await browser.newContext({ viewport: PHONE, colorScheme: "dark", reducedMotion: "reduce" });
    const page = await signIn(ctx, pro.email);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${BASE}/`);
    await closeLeaguesWelcome(page);
    const welcome = page.getByRole("heading", { name: "You're Pro now" });
    record("Pro: the welcome moment shows on first open", await welcome.waitFor({ timeout: 30000 }).then(() => true, () => false));
    await page.screenshot({ path: path.join(SHOTS, "pro-welcome-360.png") });
    await page.getByRole("button", { name: "Let's go" }).click();
    await page.reload();
    await page.getByRole("link", { name: "Your plan: Pro" }).waitFor({ timeout: 30000 });
    await page.waitForTimeout(1500);
    record("…and only once on this device", (await welcome.count()) === 0);
    record("Pro dashboard: the lit Pro badge at the top", true);
    record("…the learner's node wears the Pro frame (tab bar)", (await page.locator("nav [data-pro]").count()) >= 1);
    await page.getByRole("heading", { name: "Your mistakes" }).waitFor({ timeout: 30000 });
    record("…Review now, not Review with Pro", (await page.getByRole("link", { name: "Review now" }).count()) === 1);
    const tabs = page.getByRole("navigation", { name: "Main" }).last();
    record("…'Your plan' in the tab bar, not Pricing", (await tabs.getByRole("link", { name: "Your plan" }).count()) === 1 && (await tabs.getByRole("link", { name: "Pricing" }).count()) === 0);
    record("…no sideways scrolling", !(await sideways(page)));
    await page.screenshot({ path: path.join(SHOTS, "pro-dashboard-360.png") });
    await page.emulateMedia({ colorScheme: "light" });
    await page.screenshot({ path: path.join(SHOTS, "pro-dashboard-360-light.png") });
    await page.emulateMedia({ colorScheme: "dark" });

    const prompts = [];
    for (const where of ["/", "/pro", "/account", "/account/plan", "/course/how-the-internet-works", "/courses", "/review"]) {
      await page.goto(`${BASE}${where}`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);
      const text = await page.locator("body").innerText();
      const found = text.match(UPGRADE);
      if (found) prompts.push(`${where}: "${found[0]}"`);
      if (where === "/pro") {
        record("Pro /pro: a member's heading", (await page.getByRole("heading", { name: "You're on Pro" }).count()) === 1);
        record("Pro /pro: 'Your plan' on the Pro card, See your plan", (await page.getByRole("link", { name: "See your plan" }).count()) === 1);
        await page.screenshot({ path: path.join(SHOTS, "plans-pro-member-360.png") });
      }
      if (where === "/account/plan") {
        record("Your plan: the plan name and renewal date", (await page.getByRole("heading", { name: "Pro", exact: true }).count()) === 1 && /Annual plan\. Renews on/.test(text));
        record("…what's included, with ticks", (await page.locator("main li svg").count()) >= 4);
        record("…and Manage subscription", (await page.getByRole("button", { name: "Manage subscription" }).count()) === 1);
        await page.screenshot({ path: path.join(SHOTS, "your-plan-360.png") });
      }
    }
    record("No upgrade prompt anywhere for a Pro member", prompts.length === 0, prompts.join(" | "));
    record("No page errors", errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
} finally {
  await browser.close();
  for (const id of users) await admin.auth.admin.deleteUser(id);
  console.log(`cleanup: ${users.length} account(s) deleted`);
}
console.log(results.length && results.every(Boolean) ? `All ${results.length} checks passed.` : `${results.filter((r) => !r).length || "some"} FAILED`);
process.exitCode = results.every(Boolean) ? 0 : 1;
