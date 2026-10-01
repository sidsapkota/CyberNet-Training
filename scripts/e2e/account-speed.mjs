// How fast the account page opens from the header's profile icon (a throwaway account, deleted
// afterwards). For each sample: from the tap until something of the new page shows (a loading
// skeleton or the page itself), until the page's real content shows, and the server's response time
// for /account. Medians are printed. Compare deployments with E2E_BASE_URL.
//   E2E_BASE_URL=https://cybernettraining.com npm run e2e:account-speed
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";

const APP = path.resolve(import.meta.dirname, "../..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(APP, ".env.local"), "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SAMPLES = Number(process.env.SAMPLES ?? 6);
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const report = (name, xs) => console.log(`${name}: median ${Math.round(median(xs))} ms  [${xs.map((x) => Math.round(x)).join(", ")}]`);

const email = `account-speed-${Date.now()}@example.com`;
const { data: created, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
if (error) throw error;
const userId = created.user.id;
const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  await admin.from("profiles").update({ display_name: "Speedy", age_confirmed: true }).eq("id", userId);
  await admin.from("card_completions").insert({ user_id: userId, lesson_id: "what-is-an-ip-address", card_id: "ip-purpose", xp: 10, completed_at: new Date().toISOString() });
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  // PHONE=1: a phone on a mobile network (4G-like: 150 ms round trips, 1.6 Mbps down).
  const phone = process.env.PHONE === "1";
  const ctx = await browser.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1280, height: 800 }, isMobile: phone, hasTouch: phone });
  const page = await ctx.newPage();
  if (phone) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  }
  // Never send test analytics.
  await page.route(/\/script\.js$|\/_vercel\/insights\//, (route) => route.abort());
  // A protected preview: open Vercel's share link first (it sets an access cookie).
  if (process.env.E2E_SHARE_URL) await page.goto(process.env.E2E_SHARE_URL);
  await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=/`);
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 30000 });

  const firstPaint = [];
  const content = [];
  const server = [];
  for (let i = 0; i <= SAMPLES; i++) {
    await page.goto(`${BASE}/`);
    await page.getByRole("heading", { name: "Your courses" }).waitFor({ timeout: 60000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800); // let any prefetch finish, as it would for a real visitor
    let rscStart = 0;
    let rscMs = null;
    const onReq = (r) => {
      if (new URL(r.url()).pathname === "/account" && r.headers()["rsc"]) rscStart = Date.now();
    };
    const onRes = async (r) => {
      if (new URL(r.url()).pathname === "/account" && r.request().headers()["rsc"] && rscStart) {
        await r.finished().catch(() => {});
        rscMs = Date.now() - rscStart;
      }
    };
    page.on("request", onReq);
    page.on("response", onRes);
    const t0 = Date.now();
    await (phone ? page.getByRole("navigation", { name: "Main" }).last().getByRole("link", { name: "Account" }) : page.getByRole("link", { name: /^Account:/ })).click();
    // Something of the new page: its skeleton (data-loading) or the page itself.
    await page.locator('[data-loading="account"], main h1').filter({ hasText: /.*/ }).first().waitFor({ timeout: 60000 }).catch(() => {});
    await page.waitForFunction(() => location.pathname === "/account" || document.querySelector('[data-loading="account"]'), null, { timeout: 60000 });
    const shown = Date.now() - t0;
    await page.getByRole("heading", { name: "Speedy" }).waitFor({ timeout: 60000 });
    const done = Date.now() - t0;
    page.off("request", onReq);
    page.off("response", onRes);
    if (i === 0) {
      console.log(`warm-up: shown ${shown} ms, content ${done} ms`);
      continue;
    }
    firstPaint.push(shown);
    content.push(done);
    if (rscMs !== null) server.push(rscMs);
  }
  console.log(phone ? "Phone, 4G-like network:" : "Desktop, this connection:");
  report("Tap → new page shows (skeleton or page)", firstPaint);
  report("Tap → account content", content);
  if (server.length) report("/account server response after the tap (RSC)", server);
  // The server alone: the /account RSC payload fetched directly with the session cookie.
  const direct = [];
  for (let i = 0; i < SAMPLES; i++) {
    const t0 = Date.now();
    const res = await page.request.get(`${BASE}/account`, { headers: { RSC: "1" } });
    await res.body();
    direct.push(Date.now() - t0);
  }
  report("/account server (direct RSC fetch)", direct);
} finally {
  await browser.close();
  await admin.auth.admin.deleteUser(userId);
}
