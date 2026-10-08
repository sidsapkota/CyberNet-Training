// Review screenshots of /pro (the 8 Oct redesign) for the owner, saved to docs/plans/pro-redesign/:
// a guest at 360×560 (dark and light) and 1440×900, the same once Founding Member seats are gone
// (Lifetime disappears, Yearly is Best value), and a signed-in free learner. The Founding Member
// offer is the one production serves (0 of 50 sold: "First 50 learners only"), supplied to the page
// so the local sandbox needs no founding price. Also prints whether the buy button is in view above
// the phone tab bar. Run with a dev server (E2E_BASE_URL, default http://localhost:3000).
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";
import { readEnvEntries } from "./lib/env.mjs";
import { closeLeaguesWelcome } from "./lib/welcome.mjs";

const APP = path.resolve(import.meta.dirname, "../..");
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const OUT = path.join(APP, "docs/plans/pro-redesign");
fs.mkdirSync(OUT, { recursive: true });
const env = Object.fromEntries(readEnvEntries(APP));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const OFFER = {
  price: "A$29",
  headline: "Lifetime Pro for A$29, less than 4 months of the monthly plan",
  comparison: "A year of monthly is A$95.88. This is A$29, once.",
  counter: { left: 50, total: 50, soldOut: false, allHeld: false },
};
const PHONE = { width: 360, height: 560 };
const DESK = { width: 1440, height: 900 };

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });

async function shot(name, { viewport, scheme = "dark", offer = OFFER, email = null, full = false }) {
  const ctx = await browser.newContext({ viewport, colorScheme: scheme, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await prepare(page);
  await page.route("**/api/pro/founder", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(offer) }));
  if (email) {
    const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=/`);
    await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 60000 });
    await closeLeaguesWelcome(page);
  }
  await page.goto(`${BASE}/pro`);
  const name1 = offer ? /Get lifetime Pro/ : /Start 7-day free trial|Get yearly Pro/;
  const button = page.getByRole("button", { name: name1 }).or(page.getByRole("link", { name: name1 })).first();
  await button.waitFor({ timeout: 120000 });
  await page.waitForTimeout(600);
  const box = await button.boundingBox();
  const tabs = await page.locator("nav[aria-label=Main]").last().boundingBox();
  const limit = viewport.width < 640 && tabs && tabs.y > viewport.height / 2 ? tabs.y : viewport.height;
  console.log(`${name}: button bottom ${Math.round((box?.y ?? 0) + (box?.height ?? 0))}px, visible area ends at ${Math.round(limit)}px → ${box && box.y + box.height <= limit ? "in view" : "NOT in view"}`);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full });
  await ctx.close();
}

let user = null;
try {
  await shot("guest-360x560-dark", { viewport: PHONE });
  await shot("guest-360x560-light", { viewport: PHONE, scheme: "light" });
  await shot("guest-360-full-page", { viewport: PHONE, full: true });
  await shot("guest-1440x900-dark", { viewport: DESK });
  await shot("guest-1440x900-light", { viewport: DESK, scheme: "light" });
  await shot("sold-out-360x560", { viewport: PHONE, offer: null });
  await shot("sold-out-1440x900", { viewport: DESK, offer: null });

  const email = `pro-shots-${Date.now()}@example.com`;
  const made = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (made.error) throw made.error;
  user = made.data.user.id;
  await admin.from("profiles").update({ username: "PacketPilot482", age_confirmed: true }).eq("id", user);
  await admin.from("card_completions").insert({ user_id: user, lesson_id: "what-is-an-ip-address", card_id: "ip-purpose", xp: 10, completed_at: new Date().toISOString() });
  await shot("free-learner-360x560", { viewport: PHONE, email });
  await shot("free-learner-1440x900", { viewport: DESK, email });
} finally {
  if (user) await admin.auth.admin.deleteUser(user);
  await browser.close();
}
console.log(`Saved to ${path.relative(APP, OUT)}`);
