// How fast production feels from here: a lesson save, the dashboard load and a lesson fetch, timed
// with a throwaway Pro account (deleted afterwards). Prints each sample and the median, plus the
// function region from `x-vercel-id` (edge::function). Used to compare Vercel function regions.
//   E2E_BASE_URL=https://cybernettraining.com npm run e2e:latency
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
const SAMPLES = Number(process.env.SAMPLES ?? 5);

// Lessons whose first card is multiple choice: one fresh card save each.
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}
const lessons = walk(path.join(APP, "content/courses"))
  .filter((f) => f.includes(`${path.sep}lessons${path.sep}`))
  .map((f) => JSON.parse(fs.readFileSync(f, "utf8")))
  .filter((l) => l.kind === "lesson" && l.cards[0].type === "multiple_choice")
  .slice(0, SAMPLES + 1);

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const report = (name, xs) => console.log(`${name}: median ${Math.round(median(xs))} ms  [${xs.map((x) => Math.round(x)).join(", ")}]`);

const region = await fetch(`${BASE}/review`, { redirect: "manual" }).then((r) => r.headers.get("x-vercel-id") ?? "local");
console.log(`${BASE}  x-vercel-id: ${region}`);

const email = `latency-${Date.now()}@example.com`;
let userId = null;
const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  const { data: created, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  userId = created.user.id;
  // Explore mode: no "Play it anyway" gate on later lessons.
  await admin.from("profiles").update({ display_name: "Latency Tester", age_confirmed: true, learning_mode: "explore" }).eq("id", userId);
  const now = Date.now();
  await admin.from("pro_grants").insert({
    user_id: userId,
    reason: "early_user",
    starts_at: new Date(now - 60_000).toISOString(),
    expires_at: new Date(now + 86_400_000).toISOString(),
    thanked_at: new Date(now).toISOString(),
  });
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=/account`);
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"), { timeout: 30000 });

  // 1. Lesson save: Check on a right answer → the card-save server action's round trip.
  const saves = [];
  const fetches = [];
  for (const [i, lesson] of lessons.entries()) {
    const card = lesson.cards[0];
    const lessonFetch = page.waitForResponse((r) => r.url().includes(`/api/lessons/${lesson.id}`));
    await page.goto(`${BASE}/lesson/${lesson.id}`);
    const res = await lessonFetch;
    const t = res.request().timing();
    const right = card.options.find((o) => o.id === card.correctOptionId).text;
    await page.getByRole("radio", { name: right }).click();
    // Every server action this Check sends (the card save, and on a first wrong try the mistake):
    // the longest round trip is the save the learner waits on.
    const actions = [];
    const onRequest = (r) => {
      if (r.method() !== "POST" || !r.headers()["next-action"]) return;
      const sent = Date.now();
      actions.push(r.response().then((res) => res?.finished()).then(() => Date.now() - sent));
    };
    page.on("request", onRequest);
    await page.getByRole("button", { name: "Check" }).click();
    await page.getByRole("button", { name: "Continue" }).waitFor();
    await page.waitForLoadState("networkidle");
    page.off("request", onRequest);
    const took = Math.max(...(await Promise.all(actions)));
    // The first round warms the function up; it's reported apart.
    if (i === 0) console.log(`warm-up: lesson fetch ${Math.round(t.responseEnd)} ms, save ${Math.round(took)} ms`);
    else {
      saves.push(took);
      fetches.push(t.responseEnd);
    }
  }
  report("Lesson save (server action round trip)", saves);
  report("Lesson fetch (/api/lessons/<id>, auth + Pro check)", fetches);

  // 2. Dashboard: navigation until the Continue hero shows, and its server actions settled.
  const loads = [];
  for (let i = 0; i < SAMPLES; i++) {
    const started = Date.now();
    await page.goto(`${BASE}/`);
    await page.getByRole("heading", { name: "Your courses" }).waitFor({ timeout: 60000 });
    const shown = Date.now() - started;
    await page.waitForLoadState("networkidle");
    loads.push(shown);
    if (i === 0) console.log(`  (dashboard settled after ${Date.now() - started} ms)`);
  }
  report("Dashboard load (navigation → dashboard drawn)", loads);
  await ctx.close();
} finally {
  await browser.close();
  if (userId) await admin.auth.admin.deleteUser(userId);
}
