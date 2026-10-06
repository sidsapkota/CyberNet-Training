// Usernames end to end (throwaway accounts, deleted afterwards). Needs the secret key, so run it
// against a local production build or production:
//   E2E_BASE_URL=http://localhost:3100 npm run e2e:usernames
// A new account lands on "Pick a username" with a suggestion; Shuffle changes it; a rude name gets
// the friendly message only; a taken name (any case) says so; a good name saves and carries on;
// the header shows it; one change in settings, then it's locked for 30 days.
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
const rand = () => Math.random().toString(36).slice(2).replace(/[0-9]/g, "").slice(0, 8) || "abcdefgh";

const results = [];
const record = (check, ok, detail = "") => {
  results.push({ check, ok });
  console.log(`${ok ? "✓" : "✗"} ${check}${detail ? ` (${detail})` : ""}`);
};

const users = [];
async function makeUser(username) {
  const email = `usernames-${Date.now()}-${users.length}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  users.push(data.user.id);
  await admin.from("profiles").update({ age_confirmed: true, ...(username ? { username } : {}) }).eq("id", data.user.id);
  return { id: data.user.id, email };
}

const taken = `Taken_${rand()}`;
const fresh = `Fresh_${rand()}`;
const changed = `Moved_${rand()}`;
const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  await makeUser(taken);
  const me = await makeUser(null);
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.route(/\/script\.js$|\/_vercel\/insights\//, (r) => r.abort());
  await prepare(page);
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email: me.email });
  await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=/courses`);
  await page.waitForURL((u) => u.pathname === "/account", { timeout: 60000 });
  record("A new account is asked to pick a username", new URL(page.url()).searchParams.get("welcome") === "1");

  const input = page.getByLabel("Pick a username");
  await page.waitForFunction(() => (document.querySelector("input[autocomplete=username]")?.value ?? "") !== "", null, { timeout: 30000 });
  const suggestion = await input.inputValue();
  record("…with a fun suggestion already filled in", /^[A-Z][a-z]+[A-Z][a-z]+[0-9]{2,3}$/.test(suggestion), suggestion.replace(/./g, "•"));
  await page.getByRole("button", { name: "Shuffle" }).click();
  await page.waitForFunction((before) => document.querySelector("input[autocomplete=username]")?.value !== before, suggestion, { timeout: 30000 });
  record("Shuffle gives another suggestion", true);
  // Pages that read league data (the league settings here, the dashboard's league card) must never
  // save a username: until the learner picks one, they have none (fixed 6 Oct 2026).
  const before = (await admin.from("profiles").select("username").eq("id", me.id).single()).data;
  const leaguesOpen = (await admin.rpc("leagues_open")).data === true;
  record(`Nothing saves a name before the learner picks one (leagues ${leaguesOpen ? "open" : "closed"})`, before?.username === null, String(before?.username !== null));

  await input.fill("sh1t_lord");
  await page.getByRole("button", { name: "Use this" }).click();
  // (Next's route announcer is also role="alert", so match the message itself.)
  const rude = page.getByRole("alert").filter({ hasText: "Try a different username." });
  await rude.waitFor({ timeout: 30000 });
  record("A rude name gets only “Try a different username.”", (await rude.innerText()).trim() === "Try a different username.");

  await input.fill(taken.toLowerCase());
  await page.getByRole("button", { name: "Use this" }).click();
  await page.getByRole("alert").filter({ hasText: "taken" }).waitFor({ timeout: 30000 }).catch(async (e) => {
    await page.screenshot({ path: path.join(APP, ".e2e-shots", "usernames-taken.png") });
    throw e;
  });
  record("A taken name (in any case) says it's taken", true);

  await input.fill(fresh);
  await page.getByRole("button", { name: "Use this" }).click();
  await page.waitForURL((u) => u.pathname === "/courses", { timeout: 60000 });
  record("A good name saves and carries on to where they were going", true);
  await page.getByRole("link", { name: new RegExp(fresh) }).first().waitFor({ timeout: 30000 });
  record("The header shows the username", true);

  await page.goto(`${BASE}/account`);
  const field = page.getByLabel("Username", { exact: true });
  record("Account settings show the username", (await field.inputValue()) === fresh);
  await field.fill(changed);
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("status").filter({ hasText: "Saved." }).waitFor({ timeout: 30000 });
  const lockedNote = await page.getByText(/You can change it again/).innerText();
  record("The first change is free, then it's locked", (await field.isDisabled()) && /again/.test(lockedNote));
  const row = (await admin.from("profiles").select("username, username_changed_at").eq("id", me.id).single()).data;
  record("The server saved it and dated the change", row?.username === changed && Boolean(row?.username_changed_at));

  // A second change straight away is refused on the server too (not only by the disabled field).
  await page.reload();
  record("After a reload it's still locked, with the date", await page.getByLabel("Username", { exact: true }).isDisabled());

  // A name the app generated (league placement, the scan) isn't a pick: the learner is asked to
  // pick one, and that first pick is free (no 30-day lock).
  const gen = await makeUser(`Gen_${rand()}`);
  await admin.from("profiles").update({ username_generated: true }).eq("id", gen.id);
  const page2 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page2.route(/\/script\.js$|\/_vercel\/insights\//, (r) => r.abort());
  await prepare(page2);
  const link2 = await admin.auth.admin.generateLink({ type: "magiclink", email: gen.email });
  await page2.goto(`${BASE}/auth/callback?token_hash=${link2.data.properties.hashed_token}&type=magiclink&next=/courses`);
  await page2.waitForURL((u) => u.pathname === "/account" || u.pathname === "/courses", { timeout: 60000 });
  record("A learner with a generated name is asked to pick one", new URL(page2.url()).searchParams.get("welcome") === "1", page2.url());
  const picked = `Mine_${rand()}`;
  await page2.getByLabel("Pick a username").fill(picked);
  await page2.getByRole("button", { name: "Use this" }).click();
  await page2.waitForURL((u) => u.pathname === "/courses", { timeout: 60000 });
  const genRow = (await admin.from("profiles").select("username, username_changed_at, username_generated").eq("id", gen.id).single()).data;
  record("Their first pick is free: saved, not generated any more, no lock", genRow?.username === picked && genRow.username_changed_at === null && genRow.username_generated === false, JSON.stringify({ ...genRow, username: genRow?.username === picked }));
  await page2.close();
} catch (error) {
  console.error(error);
  results.push({ check: "no errors", ok: false });
} finally {
  await browser.close();
  for (const id of users) await admin.auth.admin.deleteUser(id);
  const left = (await admin.from("profiles").select("id").in("id", users)).data ?? [];
  console.log(`cleanup: ${users.length} account(s) deleted, rows left ${left.length}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `${failed} check(s) failed` : `All ${results.length} checks passed.`);
process.exit(failed ? 1 : 0);
