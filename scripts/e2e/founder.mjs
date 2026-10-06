// Founding Member on screen, as a guest, a free account, a Pro subscriber and a Founding Member
// (throwaway accounts, deleted afterwards; the subscriber and the founder get stand-in rows, never a
// real Stripe payment):
// - /pro: the offer first, with the real comparison line, the counter, the button and "Under 18?";
//   the parent pitch and "Buying for your kid?"; screenshots at 360×560 and desktop;
// - the paywall (/review for a free account): the founding button is the main one, the trial one
//   small link away; screenshots at 360×560 and desktop;
// - the dashboard's one small line for free accounts, hidden for good with ✕;
// - never shown to a subscriber or a founder; a founder's badge on the dashboard and Your plan;
// - founder_viewed / founder_clicked carry only the screen.
//
// While FOUNDER_OFFER is off (or there's no sandbox founding price), `/api/pro/founder` answers
// null, so this test stands in for it in the browser with the same shape (the words come from
// founderCopy, unit-tested in src/lib/pro/founder.test.ts). With E2E_FOUNDER_LIVE=1 it uses the
// real route instead.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";
import { readEnvEntries } from "./lib/env.mjs";

const APP = path.resolve(import.meta.dirname, "../..");
const env = Object.fromEntries(
  readEnvEntries(APP),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SHOTS = path.join(APP, ".e2e-shots", "founder");
fs.mkdirSync(SHOTS, { recursive: true });
const PHONE = { width: 360, height: 560 };
const DESKTOP = { width: 1280, height: 800 };
const TAB_BAR = 64;
const BUTTON = /Get lifetime Pro for A\$29/;
const OFFER = {
  price: "A$29",
  headline: "Lifetime Pro for A$29, less than 4 months of the monthly plan",
  comparison: "A year of monthly is A$95.88. This is A$29, once.",
  counter: { left: 37, total: 50, soldOut: false, allHeld: false },
};

const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};

/** Analytics events, recorded from Vercel's queue with its script blocked (nothing is ever sent). */
async function watchEvents(page) {
  const sent = [];
  page.__sent = sent;
  await page.exposeFunction("__onEvent", (name, data) => sent.push([name, data]));
  await page.route(/\/script\.js$|\/_vercel\/insights\//, (route) => route.abort());
  await page.addInitScript(() => {
    let current;
    const wrap = (fn) => (...args) => {
      if (args[0] === "event") void window.__onEvent?.(args[1]?.name, args[1]?.data ?? {});
      return fn(...args);
    };
    Object.defineProperty(window, "va", { configurable: true, get: () => current, set: (fn) => (current = wrap(fn)) });
  });
}

async function newPage(ctx) {
  const page = await ctx.newPage();
  await prepare(page);
  await watchEvents(page);
  if (process.env.E2E_FOUNDER_LIVE !== "1") {
    await page.route("**/api/pro/founder", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OFFER) }));
  }
  return page;
}

async function signIn(ctx, email) {
  const page = await newPage(ctx);
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=/`);
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 30000 });
  return page;
}

async function makeUser(tag) {
  const email = `founder-${tag}-${Date.now()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  const id = data.user.id;
  await admin.from("profiles").update({ username: `E2e_${Math.random().toString(36).slice(2, 12)}`, age_confirmed: true }).eq("id", id);
  // A finished card (the dashboard, not the welcome) and a mistake (so /review has something).
  await admin.from("card_completions").insert({ user_id: id, lesson_id: "what-is-an-ip-address", card_id: "ip-purpose", xp: 10, completed_at: new Date().toISOString() });
  await admin.rpc("record_mistake", { p_user: id, p_lesson: "what-is-an-ip-address", p_card: "ip-purpose" });
  users.push(id);
  return { id, email };
}

async function inView(page, locator, height) {
  const box = await locator.boundingBox();
  return { ok: Boolean(box) && box.y >= 0 && box.y + box.height <= height, detail: box ? `bottom ${Math.round(box.y + box.height)}px of ${height}` : "no box" };
}

const founderButton = (page) => page.getByRole("button", { name: BUTTON }).or(page.getByRole("link", { name: BUTTON })).first();
const users = [];
const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  // 1. Guest: /pro and the landing page.
  for (const [name, viewport] of [["360x560", PHONE], ["desktop", DESKTOP]]) {
    const ctx = await browser.newContext({ viewport, colorScheme: "dark", reducedMotion: "reduce" });
    const page = await newPage(ctx);
    await page.goto(`${BASE}/pro`);
    const heading = page.getByRole("heading", { name: OFFER.headline });
    record(`Guest /pro (${name}): the Founding Member offer shows`, await heading.waitFor({ timeout: 30000 }).then(() => true, () => false));
    record(`Guest /pro (${name}): the real comparison and the counter`, (await page.getByText(OFFER.comparison).count()) > 0 && (await page.getByText("37 of 50 left").count()) > 0);
    record(`Guest /pro (${name}): "Under 18? Ask a parent before buying."`, (await page.getByText("Under 18? Ask a parent before buying.").count()) > 0);
    const offerTop = (await heading.boundingBox())?.y ?? Infinity;
    const plansTop = (await page.getByRole("heading", { name: /^Pro$/ }).first().boundingBox())?.y ?? -Infinity;
    record(`Guest /pro (${name}): the offer comes before the plans`, offerTop < plansTop, `${Math.round(offerTop)} vs ${Math.round(plansTop)}`);
    if (name === "360x560") {
      const button = await inView(page, founderButton(page), PHONE.height - TAB_BAR);
      record("Guest /pro (360x560): the founding button is in view without scrolling", button.ok, button.detail);
      record("Guest /pro: no sideways scrolling", !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
    }
    await page.screenshot({ path: path.join(SHOTS, `pro-${name}.png`) });
    await page.screenshot({ path: path.join(SHOTS, `pro-${name}-full.png`), fullPage: true });
    record(`Guest /pro (${name}): the parent pitch`, (await page.getByRole("heading", { name: "Teach your kid to spot scams before they meet one." }).count()) === 1);
    if (name === "360x560") {
      await page.getByText("Buying for your kid?").first().click();
      record("Guest /pro: \"Buying for your kid?\" explains buying on the kid's account", await page.getByText(/sign in together/).first().isVisible());
      const viewed = page.__sent.filter(([n]) => n === "founder_viewed");
      record("founder_viewed carries only the screen", viewed.length >= 1 && viewed.every(([, d]) => JSON.stringify(d) === JSON.stringify({ source: "pro_page" })), JSON.stringify(viewed));
      await founderButton(page).click();
      await page.waitForURL(/\/login/, { timeout: 30000 });
      record("A guest's founding button goes to sign in first", page.url().includes("/login?next=%2Fpro") || page.url().includes("/login?next=/pro"));
      const clicked = page.__sent.filter(([n]) => n === "founder_clicked");
      record("founder_clicked carries only the screen", clicked.length === 1 && JSON.stringify(clicked[0][1]) === JSON.stringify({ source: "pro_page" }), JSON.stringify(clicked));
      await page.goto(`${BASE}/`);
      record("Landing: the parent pitch", await page.getByRole("heading", { name: "Teach your kid to spot scams before they meet one." }).waitFor({ timeout: 30000 }).then(() => true, () => false));
      await page.goto(`${BASE}/pricing`);
      record("/pricing opens the plans page", new URL(page.url()).pathname === "/pro");
    }
    await ctx.close();
  }

  // 2. A free account: the paywall and the dashboard line.
  {
    const free = await makeUser("free");
    for (const [name, viewport] of [["360x560", PHONE], ["desktop", DESKTOP]]) {
      const ctx = await browser.newContext({ viewport, colorScheme: "dark", reducedMotion: "reduce" });
      const page = await signIn(ctx, free.email);
      await page.goto(`${BASE}/review`);
      const button = founderButton(page);
      record(`Free paywall (${name}): the founding button is the main one`, await button.waitFor({ timeout: 30000 }).then(() => true, () => false));
      if (name === "360x560") {
        const where = await inView(page, button, PHONE.height);
        record("Free paywall (360x560): the button is in view without scrolling", where.ok, where.detail);
        const notNow = await inView(page, page.getByRole("link", { name: "Not now" }).or(page.getByRole("button", { name: "Not now" })).first(), PHONE.height);
        record("Free paywall (360x560): Not now is in view too", notNow.ok, notNow.detail);
      }
      record(`Free paywall (${name}): the comparison and counter`, (await page.getByText(OFFER.comparison).count()) === 1 && (await page.getByText("37 of 50 left").count()) === 1);
      await page.screenshot({ path: path.join(SHOTS, `paywall-${name}.png`) });
      if (name === "360x560") {
        const viewed = page.__sent.filter(([n]) => n === "founder_viewed");
        record("Paywall: founder_viewed says paywall", viewed.some(([, d]) => d.source === "paywall"), JSON.stringify(viewed));
        await page.getByRole("button", { name: "Or try 7 days free" }).click();
        record("Paywall: the trial is one small link away", await page.getByRole("button", { name: /Go unlimited with Pro|Start 7-day free trial|free trial/ }).first().waitFor({ timeout: 10000 }).then(() => true, () => false));
        await page.goto(`${BASE}/`);
        const line = page.getByText("Founding Member:", { exact: false }).first();
        record("Free dashboard: one small Founding Member line", await line.waitFor({ timeout: 30000 }).then(() => true, () => false));
        await page.screenshot({ path: path.join(SHOTS, "dashboard-line-360x560.png") });
        await page.getByRole("button", { name: "Hide the Founding Member offer" }).click();
        await page.reload();
        await page.getByRole("heading", { name: "Dashboard" }).waitFor({ state: "attached", timeout: 30000 });
        await page.waitForTimeout(1500);
        record("Free dashboard: ✕ hides the line for good on this device", (await page.getByRole("button", { name: "Hide the Founding Member offer" }).count()) === 0);
      }
      await ctx.close();
    }
  }

  // 3. A Pro subscriber never sees it.
  {
    const pro = await makeUser("pro");
    const day = 86_400_000;
    const sub = await admin.from("subscriptions").insert({
      id: `sub_e2e${Date.now()}`,
      user_id: pro.id,
      customer_id: `cus_e2e${Date.now()}`,
      status: "active",
      price_id: "price_e2e",
      billing_interval: "year",
      current_period_end: new Date(Date.now() + 364 * day).toISOString(),
      started_at: new Date(Date.now() - 20 * day).toISOString(),
    });
    if (sub.error) throw sub.error;
    const ctx = await browser.newContext({ viewport: PHONE, colorScheme: "dark", reducedMotion: "reduce" });
    const page = await signIn(ctx, pro.email);
    for (const route of ["/pro", "/", "/review"]) {
      await page.goto(`${BASE}${route}`);
      await page.waitForTimeout(2500);
      record(`Subscriber ${route}: no Founding Member offer`, (await founderButton(page).count()) === 0 && (await page.getByText("37 of 50 left").count()) === 0);
    }
    await ctx.close();
  }

  // 4. A Founding Member: the badge, lifetime Pro, and no offer.
  {
    const founder = await makeUser("member");
    const stamp = Date.now();
    const claim = await admin.rpc("claim_founder_seat", { p_user: founder.id, p_session: `cs_test_e2e${stamp}`, p_payment: `pi_e2e${stamp}`, p_amount: 2900, p_currency: "aud" });
    if (claim.error) throw claim.error;
    const ctx = await browser.newContext({ viewport: PHONE, colorScheme: "dark", reducedMotion: "reduce" });
    const page = await signIn(ctx, founder.email);
    await page.goto(`${BASE}/`);
    record("Founder dashboard: the Founding Member badge", await page.getByRole("link", { name: "Your plan: Founding Member" }).waitFor({ timeout: 30000 }).then(() => true, () => false));
    await page.screenshot({ path: path.join(SHOTS, "founder-dashboard-360x560.png") });
    await page.goto(`${BASE}/account/plan`);
    record("Founder Your plan: lifetime Pro", await page.getByText("Founding Member: lifetime Pro, for as long as CyberNet Training runs.").waitFor({ timeout: 30000 }).then(() => true, () => false));
    record("Founder Your plan: no Manage subscription", (await page.getByRole("button", { name: "Manage subscription" }).count()) === 0);
    await page.goto(`${BASE}/pro`);
    await page.waitForTimeout(2500);
    record("Founder /pro: no Founding Member offer", (await founderButton(page).count()) === 0);
    await ctx.close();
    // A refund ends it.
    await admin.rpc("refund_founder_seat", { p_payment: `pi_e2e${stamp}` });
    const ctx2 = await browser.newContext({ viewport: PHONE, colorScheme: "dark", reducedMotion: "reduce" });
    const page2 = await signIn(ctx2, founder.email);
    await page2.goto(`${BASE}/account/plan`);
    record("After a refund: no Founding Member badge or lifetime Pro", await page2.getByRole("link", { name: "See plans" }).or(page2.getByText("Free")).first().waitFor({ timeout: 30000 }).then(async () => (await page2.getByText(/lifetime Pro/).count()) === 0, () => false));
    await ctx2.close();
  }
} finally {
  await browser.close();
  for (const id of users) await admin.auth.admin.deleteUser(id);
}
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} check(s) FAILED` : `\nAll ${results.length} checks passed. Screenshots in .e2e-shots/founder/`);
process.exit(failed ? 1 : 0);
