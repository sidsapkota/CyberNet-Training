// The admin dashboard's access, end to end on STAGING (refuses production). The dev server must run
// with ADMIN_USER_IDS set to the staging admin test account (admin-e2e@example.com), never a real one.
// - A guest, a learner and a Pro member get the plain 404 on every admin page and on the reveal
//   endpoint, and nothing is written to the audit log for them.
// - The admin sees every page (laid out cleanly at 360 and desktop), each view is logged, and
//   revealing an email works and is logged with whose it was.
//   npm run e2e:admin
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";
import { readEnvEntries, PRODUCTION_REF } from "./lib/env.mjs";
import { layoutProblems } from "./lib/layout.mjs";

const APP = path.resolve(import.meta.dirname, "../..");
const env = Object.fromEntries(readEnvEntries(APP));
if (env.NEXT_PUBLIC_SUPABASE_URL.includes(PRODUCTION_REF)) throw new Error("e2e:admin signs in test accounts: staging only.");
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const PAGES = ["/admin", "/admin/funnel", "/admin/funnel?days=30", "/admin/learners", "/admin/lessons", "/admin/leagues", "/admin/feedback", "/admin/features"];
const ADMIN_EMAIL = "admin-e2e@example.com";

const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};
const users = [];
async function learner(label, { pro = false } = {}) {
  const email = `admin-e2e-${label}-${Date.now()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  users.push(data.user.id);
  await admin.from("profiles").update({ username: `Adm${label}${Math.floor(Math.random() * 900 + 100)}`, age_confirmed: true }).eq("id", data.user.id);
  if (pro) await admin.from("pro_grants").insert({ user_id: data.user.id, reason: "early_user", expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString() });
  return { id: data.user.id, email };
}
async function signIn(page, email) {
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=/courses`);
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 60000 });
}
const auditCount = async () => (await admin.from("admin_audit").select("id", { count: "exact", head: true })).count ?? 0;

/** Every admin page answers 404, shows the ordinary not-found page, and the reveal endpoint refuses. */
async function locked(page, who) {
  const statuses = [];
  for (const p of PAGES) {
    const r = await page.goto(`${BASE}${p}`);
    statuses.push(r?.status() ?? 0);
  }
  const notFoundText = await page.getByRole("heading", { name: /couldn.t reach that page/ }).isVisible().catch(() => false);
  const leaked = (await page.content()).match(/Admin · read only|Show email|Sign-ups per day/);
  const reveal = await page.evaluate(async (id) => (await fetch("/api/admin/reveal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: id }) })).status, users[0] ?? "00000000-0000-4000-8000-000000000000");
  record(`${who}: every admin page is a plain 404 and the reveal endpoint refuses`, statuses.every((s) => s === 404) && notFoundText && !leaked && reveal === 404, `${statuses.join(",")} reveal ${reveal}`);
}

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  const before = await auditCount();
  const plain = await learner("learner");
  const pro = await learner("pro", { pro: true });

  for (const [who, email] of [["A guest", null], ["A learner", plain.email], ["A Pro member", pro.email]]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await prepare(page);
    if (email) await signIn(page, email);
    await locked(page, who);
    await ctx.close();
  }
  record("Nothing is logged for them", (await auditCount()) === before);

  // The admin (signed in just now).
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const adminUser = list.users.find((u) => u.email === ADMIN_EMAIL);
  if (!adminUser) throw new Error("The staging admin test account is missing (admin-e2e@example.com)");
  for (const [w, h] of [[360, 640], [1440, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await prepare(page);
    await signIn(page, ADMIN_EMAIL);
    const ok = [];
    const layouts = [];
    for (const p of PAGES) {
      const r = await page.goto(`${BASE}${p}`);
      const shell = await page.getByText("Admin · read only").isVisible().catch(() => false);
      ok.push(r?.status() === 200 && shell);
      layouts.push(...(await page.evaluate(layoutProblems, null)).map((x) => `${p}: ${x.kind} ${x.what}`));
    }
    record(`The admin sees every page (${w}x${h})`, ok.every(Boolean), ok.join(","));
    record(`Admin pages lay out cleanly (${w}x${h})`, layouts.length === 0, layouts.slice(0, 4).join("; "));
    if (w === 1440) {
      await page.goto(`${BASE}/admin/learners`);
      const button = page.getByRole("button", { name: /Show email/ }).first();
      const hidden = !(await page.content()).includes(plain.email);
      await button.click();
      await page.waitForTimeout(1500);
      const views = (await admin.from("admin_audit").select("action").eq("admin_id", adminUser.id).gte("at", new Date(Date.now() - 5 * 60_000).toISOString())).data ?? [];
      const reveals = (await admin.from("admin_audit").select("target").eq("admin_id", adminUser.id).eq("action", "reveal-email").gte("at", new Date(Date.now() - 5 * 60_000).toISOString())).data ?? [];
      record("Emails are hidden until revealed", hidden);
      record("Every admin page view is logged", ["view:overview", "view:funnel", "view:learners", "view:lessons", "view:leagues", "view:feedback", "view:features"].every((a) => views.some((v) => v.action === a)));
      record("Revealing an email is logged with whose it was", reveals.length >= 1 && reveals.every((r) => /^[0-9a-f-]{36}$/.test(r.target ?? "")));
      await page.goto(`${BASE}/admin`);
      await page.screenshot({ path: path.join(APP, ".e2e-shots", "admin-overview-1440.png"), fullPage: true });
    }
    await ctx.close();
  }
  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const robots = await (await fetch(`${BASE}/robots.txt`)).text();
  record("/admin isn't in the sitemap or robots.txt", !sitemap.includes("/admin") && !robots.includes("/admin"));
} finally {
  await browser.close();
  for (const id of users) await admin.auth.admin.deleteUser(id);
}
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} check(s) failed.` : `\n✓ All ${results.length} admin checks passed.`);
process.exit(failed ? 1 : 0);
