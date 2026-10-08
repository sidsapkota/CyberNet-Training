// Founding Member on screen, as a guest, a free account, a Pro subscriber and a Founding Member
// (throwaway accounts, deleted afterwards; the subscriber and the founder get stand-in rows, never a
// real Stripe payment):
// - /pro: Lifetime first in the Pro box and preselected, with the counter, the button and "Under 18?";
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
import { closeLeaguesWelcome } from "./lib/welcome.mjs";

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

async function makeUser(tag, { ageConfirmed = true } = {}) {
  const email = `founder-${tag}-${Date.now()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  const id = data.user.id;
  await admin.from("profiles").update({ username: `E2e_${Math.random().toString(36).slice(2, 12)}`, age_confirmed: ageConfirmed }).eq("id", id);
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

/** Where the visible screen ends: the top of the phone tab bar when it shows, else the window's bottom. */
async function visibleBottom(page, height) {
  const tabs = await page.locator("nav[aria-label=Main]").last().boundingBox().catch(() => null);
  return tabs && tabs.y > height / 2 && tabs.y < height ? tabs.y : height;
}

/** "Can't pay? Send it to a parent": straight under the founding button, and on screen with it. */
async function parentLinkUnder(page, height) {
  const link = page.getByRole("button", { name: /Send it to a parent/ }).or(page.getByRole("link", { name: /Send it to a parent/ })).first();
  if (!(await link.waitFor({ timeout: 15000 }).then(() => true, () => false))) return { ok: false, detail: "no link" };
  const button = await founderButton(page).boundingBox();
  const box = await link.boundingBox();
  const limit = await visibleBottom(page, height);
  const under = Boolean(button && box) && box.y >= button.y + button.height - 1 && box.y - (button.y + button.height) < 12;
  return { ok: under && box.y + box.height <= limit, detail: box ? `link bottom ${Math.round(box.y + box.height)}px of ${Math.round(limit)}${under ? "" : ", not right under the button"}` : "no box" };
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
    const lifetime = page.getByRole("radio", { name: /Lifetime/ });
    record(`Guest /pro (${name}): Lifetime (Founding Member) shows, preselected`, await lifetime.waitFor({ timeout: 30000 }).then(async () => (await lifetime.getAttribute("aria-checked")) === "true", () => false));
    record(`Guest /pro (${name}): its price, Founding Member and the counter`, (await lifetime.innerText()).includes("A$29") && /Founding Member/.test(await lifetime.innerText()) && (await page.getByText("37 of 50 left").count()) > 0);
    record(`Guest /pro (${name}): "Pay once · Under 18? Ask a parent"`, (await page.getByText("Pay once · Under 18? Ask a parent").count()) > 0);
    const offerTop = (await lifetime.boundingBox())?.y ?? Infinity;
    const yearlyTop = (await page.getByRole("radio", { name: /Yearly/ }).boundingBox())?.y ?? -Infinity;
    record(`Guest /pro (${name}): Lifetime is the first choice, before Yearly`, offerTop < yearlyTop, `${Math.round(offerTop)} vs ${Math.round(yearlyTop)}`);
    if (name === "360x560") {
      const button = await inView(page, founderButton(page), PHONE.height - TAB_BAR);
      record("Guest /pro (360x560): the founding button is in view without scrolling", button.ok, button.detail);
      const parent = await parentLinkUnder(page, PHONE.height);
      record("Guest /pro (360x560): \"Can't pay? Send it to a parent\" right under it, above the tab bar", parent.ok, parent.detail);
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
      record("A guest's founding button goes to sign in, then back to /pro one tap from checkout", new URL(page.url()).searchParams.get("next") === "/pro?buy=founder", page.url());
      const clicked = page.__sent.filter(([n]) => n === "founder_clicked");
      record("founder_clicked carries only the screen", clicked.length === 1 && JSON.stringify(clicked[0][1]) === JSON.stringify({ source: "pro_page" }), JSON.stringify(clicked));
      const wall = page.__sent.filter(([n]) => n === "founder_signup_wall");
      record("founder_signup_wall: the guest was sent to sign in", wall.length === 1 && JSON.stringify(wall[0][1]) === JSON.stringify({ source: "pro_page" }), JSON.stringify(wall));
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
        const parent = await parentLinkUnder(page, PHONE.height);
        record("Free paywall (360x560): \"Can't pay? Send it to a parent\" right under the button, in view", parent.ok, parent.detail);
      }
      record(`Free paywall (${name}): the comparison and counter`, (await page.getByText(OFFER.comparison).count()) === 1 && (await page.getByText("37 of 50 left").count()) === 1);
      await page.screenshot({ path: path.join(SHOTS, `paywall-${name}.png`) });
      if (name === "360x560") {
        const viewed = page.__sent.filter(([n]) => n === "founder_viewed");
        record("Paywall: founder_viewed says paywall", viewed.some(([, d]) => d.source === "paywall"), JSON.stringify(viewed));
        await page.getByRole("button", { name: "Or try 7 days free" }).click();
        record("Paywall: the trial is one small link away", await page.getByRole("button", { name: /Go unlimited with Pro|Start 7-day free trial|free trial/ }).first().waitFor({ timeout: 10000 }).then(() => true, () => false));
        await page.goto(`${BASE}/`);
        await closeLeaguesWelcome(page);
        const line = page.getByText("Founding Member:", { exact: false }).first();
        record("Free dashboard: one small Founding Member line", await line.waitFor({ timeout: 30000 }).then(() => true, () => false));
        await page.screenshot({ path: path.join(SHOTS, "dashboard-line-360x560.png") });
        await page.getByRole("link", { name: "See it" }).click();
        await page.waitForURL(/\/pro/, { timeout: 30000 });
        const opened = page.__sent.filter(([n]) => n === "founder_line_opened");
        const lineClicks = page.__sent.filter(([n, d]) => n === "founder_clicked" && d.source === "dashboard");
        record("\"See it\" sends founder_line_opened, not founder_clicked", opened.length === 1 && lineClicks.length === 0, JSON.stringify(opened));
        await page.goto(`${BASE}/`);
        await closeLeaguesWelcome(page);
        await page.getByRole("button", { name: "Hide the Founding Member offer" }).click();
        await page.reload();
        await page.getByRole("heading", { name: "Dashboard" }).waitFor({ state: "attached", timeout: 30000 });
        await page.waitForTimeout(1500);
        record("Free dashboard: ✕ hides the line for good on this device", (await page.getByRole("button", { name: "Hide the Founding Member offer" }).count()) === 0);
      }
      await ctx.close();
    }
  }

  // 2b. After signing in to buy: one tap from checkout; 13+ asked on the spot; friendly errors.
  {
    // Confirmed when the page loads (so the full-screen age check stays away), then unconfirmed by the
    // time they tap: the race the button guards against (the 13+ box on /login, saved a moment later).
    const learner = await makeUser("continue");
    const ctx = await browser.newContext({ viewport: PHONE, colorScheme: "dark", reducedMotion: "reduce" });
    const page = await signIn(ctx, learner.email);
    await page.goto(`${BASE}/pro?buy=founder`);
    const note = page.getByText("You're signed in. One tap to pay on Stripe's secure page.");
    record("Back from sign-in: /pro says they're one tap from checkout", await note.waitFor({ timeout: 30000 }).then(() => true, () => false));
    const where = await inView(page, founderButton(page), PHONE.height - TAB_BAR);
    record("…with the button in view at 360x560", where.ok, where.detail);
    const parentThere = await parentLinkUnder(page, PHONE.height);
    record("…and \"Can't pay? Send it to a parent\" right under it, above the tab bar", parentThere.ok, parentThere.detail);
    await page.screenshot({ path: path.join(SHOTS, "continue-360x560.png") });
    record("founder_viewed says continue", page.__sent.some(([n, d]) => n === "founder_viewed" && d.source === "continue"));
    await admin.from("profiles").update({ age_confirmed: false }).eq("id", learner.id);
    await founderButton(page).click();
    const box = page.getByRole("checkbox", { name: "I'm 13 or older" });
    record("No 13+ confirmation yet: it's asked right there (not on another page)", await box.waitFor({ timeout: 30000 }).then(() => true, () => false));
    record("founder_checkout_error says why: age", page.__sent.some(([n, d]) => n === "founder_checkout_error" && d.reason === "age" && d.source === "continue"));
    await box.check();
    await page.getByRole("button", { name: "Continue to checkout" }).click();
    // Then a checkout is created (Stripe opens) or a friendly error with a way forward shows.
    const outcome = await Promise.race([
      page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 }).then(() => "stripe-opened"),
      page.getByRole("alert").filter({ hasText: /Nothing was charged|try again/i }).waitFor({ timeout: 30000 }).then(() => "friendly-error"),
    ]).catch(() => "nothing");
    const confirmed = (await admin.from("profiles").select("age_confirmed").eq("id", learner.id).single()).data?.age_confirmed;
    record("Confirming 13+ there saves it and carries on to checkout", confirmed === true && outcome !== "nothing", `${outcome}`);
    if (outcome === "friendly-error") {
      record("…an error says nothing was charged, with Try again", (await page.getByRole("button", { name: "Try again" }).count()) === 1);
      record("…and founder_checkout_error has its reason", page.__sent.some(([n, d]) => n === "founder_checkout_error" && ["stripe", "network", "all_held"].includes(d.reason)));
    } else if (outcome === "stripe-opened") {
      record("…founder_checkout_created was sent", page.__sent.some(([n]) => n === "founder_checkout_created"));
    }
    await ctx.close();
  }

  // 2b. The daily-limit screen (today's 3 new lessons used): the link sits under the founding button.
  {
    const limited = await makeUser("limit");
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
    const opens = await admin.from("lesson_opens").insert(["memory-vs-storage", "meet-the-os", "meet-the-cpu"].map((lesson_id) => ({ user_id: limited.id, day: today, lesson_id })));
    if (opens.error) throw opens.error;
    const ctx = await browser.newContext({ viewport: PHONE, colorScheme: "dark", reducedMotion: "reduce", timezoneId: "Australia/Sydney" });
    const page = await signIn(ctx, limited.email);
    await page.goto(`${BASE}/lesson/files-and-folders`);
    const shown = await page.getByRole("heading", { name: /lessons today/ }).waitFor({ timeout: 30000 }).then(() => true, () => false);
    record("Daily limit (360x560): the limit screen, with the founding button", shown && (await founderButton(page).waitFor({ timeout: 15000 }).then(() => true, () => false)));
    const where = await inView(page, founderButton(page), PHONE.height);
    record("Daily limit (360x560): the button is in view", where.ok, where.detail);
    const parent = await parentLinkUnder(page, PHONE.height);
    record("Daily limit (360x560): \"Can't pay? Send it to a parent\" right under it, in view", parent.ok, parent.detail);
    await page.screenshot({ path: path.join(SHOTS, "limit-360x560.png") });
    const notNow = await inView(page, page.getByRole("link", { name: "Not now" }).first(), PHONE.height);
    record("Daily limit (360x560): Not now is in view too", notNow.ok, notNow.detail);
    record("Daily limit: \"Under 18? Ask a parent before buying.\"", (await page.getByText("Under 18? Ask a parent before buying.").count()) === 1);
    await page.setViewportSize({ width: 360, height: 640 });
    await page.waitForTimeout(500);
    record("Daily limit (360x640): one screen, no scrolling", !(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 1)));
    await page.screenshot({ path: path.join(SHOTS, "limit-360x640.png") });
    await ctx.close();
  }

  // 2c. "Send to a parent": a one-time link a parent opens on their own device (no account).
  {
    const learner = await makeUser("parent-link");
    const ctx = await browser.newContext({ viewport: PHONE, colorScheme: "dark", reducedMotion: "reduce" });
    const page = await signIn(ctx, learner.email);
    await page.goto(`${BASE}/pro`);
    const send = page.getByRole("button", { name: "Can't pay? Send it to a parent" });
    const placed = await parentLinkUnder(page, PHONE.height);
    record("\"Can't pay? Send it to a parent\" sits right under the buy button on /pro, above the tab bar (360x560)", placed.ok, placed.detail);
    await send.click();
    const field = page.getByRole("textbox", { name: "Link for a parent" });
    const made = await field.waitFor({ timeout: 30000 }).then(() => true, () => false);
    const url = made ? await field.inputValue() : "";
    record("It makes a link to /pay with a long one-time secret", /\/pay\?t=[A-Za-z0-9_-]{32}$/.test(url), url.replace(/t=.*/, "t=…"));
    await page.screenshot({ path: path.join(SHOTS, "parent-link-360x560.png") });
    record("parent_link_created carries only the screen", page.__sent.some(([n, d]) => n === "parent_link_created" && JSON.stringify(d) === JSON.stringify({ source: "pro_page" })));
    const token = new URL(url || "http://x/pay?t=").searchParams.get("t") ?? "";
    const rows = (await admin.from("founder_parent_links").select("token_hash, expires_at, paid_at").eq("user_id", learner.id)).data ?? [];
    record("Only a hash of the secret is stored, for 7 days", rows.length === 1 && /^[0-9a-f]{64}$/.test(rows[0].token_hash) && rows[0].token_hash !== token && Math.round((Date.parse(rows[0].expires_at) - Date.now()) / 86_400_000) === 7);
    await ctx.close();

    // The parent: their own browser, no account.
    const parent = await browser.newContext({ viewport: PHONE, colorScheme: "light", reducedMotion: "reduce" });
    const pp = await newPage(parent);
    await pp.goto(url);
    const named = pp.getByRole("heading", { name: /Lifetime Pro for E2e_/ });
    const priceOk = await named.waitFor({ timeout: 30000 }).then(() => true, () => false);
    if (priceOk) {
      record("The parent sees who it's for and one button to Stripe", (await pp.getByRole("button", { name: /Pay A\$29 securely with Stripe/ }).count()) === 1);
      await pp.screenshot({ path: path.join(SHOTS, "parent-pay-360x560.png") });
    } else {
      // No founding price in the Stripe sandbox: the page can't show a price locally (honest message).
      record("Without a price, the parent page says so honestly (no sandbox founding price)", await pp.getByText("We couldn't load the price just now.").isVisible());
    }
    const states = [
      ["a made-up link", `${BASE}/pay?t=${"x".repeat(32)}`, "This link doesn't work."],
      ["no link at all", `${BASE}/pay`, "This link doesn't work."],
    ];
    for (const [what, href, text] of states) {
      await pp.goto(href);
      record(`Parent page, ${what}: "${text}"`, await pp.getByText(text).first().waitFor({ timeout: 30000 }).then(() => true, () => false));
    }
    await admin.from("founder_parent_links").update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq("user_id", learner.id);
    await pp.goto(url);
    record("Parent page, an expired link: says to ask for a new one", await pp.getByText(/has expired/).waitFor({ timeout: 30000 }).then(() => true, () => false));
    await admin.from("founder_parent_links").update({ expires_at: new Date(Date.now() + 86_400_000).toISOString(), paid_at: new Date().toISOString() }).eq("user_id", learner.id);
    await pp.goto(url);
    record("Parent page, a used link: says it's already been used", await pp.getByText(/already been used/).waitFor({ timeout: 30000 }).then(() => true, () => false));
    await pp.goto(`${BASE}/pay/thanks?session_id=cs_test_notreal`);
    record("Thank-you page: an unconfirmed payment isn't celebrated", await pp.getByRole("heading", { name: "We couldn't confirm that payment yet" }).waitFor({ timeout: 30000 }).then(() => true, () => false));
    const robots = await (await pp.request.get(`${BASE}/pay`)).text();
    record("The parent page is never indexed", /noindex/.test(robots));
    await parent.close();
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
    await closeLeaguesWelcome(page);
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
    // Back on the free plan: Your plan shows the Pro box again (lifetime can be bought again), never the member's lifetime line.
    record("After a refund: back on the free plan, no Founding Member badge or lifetime line", await page2.getByText("You're on the free plan.").waitFor({ timeout: 30000 }).then(async () => (await page2.getByText(/for as long as CyberNet Training runs\./).count()) === 0 && (await page2.getByRole("link", { name: "Your plan: Founding Member" }).count()) === 0, () => false));
    await ctx2.close();
  }
} finally {
  await browser.close();
  for (const id of users) await admin.auth.admin.deleteUser(id);
}
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} check(s) FAILED` : `\nAll ${results.length} checks passed. Screenshots in .e2e-shots/founder/`);
process.exit(failed ? 1 : 0);
