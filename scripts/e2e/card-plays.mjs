// Card measurements, end to end on STAGING (refuses production). A guest plays the first two cards of
// "Spot the AI" (right first time, then wrong first time): each first Check is stored once, with the
// time and whether it was right, and nothing that identifies the learner. Junk is refused.
//   npm run e2e:card-plays        (dev server running)
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";
import { allLessons, answerCard } from "./lib/answer.mjs";
import { readEnvEntries, PRODUCTION_REF } from "./lib/env.mjs";

const APP = path.resolve(import.meta.dirname, "../..");
const env = Object.fromEntries(readEnvEntries(APP));
if (env.NEXT_PUBLIC_SUPABASE_URL.includes(PRODUCTION_REF)) throw new Error("e2e:card-plays writes measurements: staging only.");
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const lesson = allLessons(APP).find((l) => l.id === "spot-the-ai");
const [first, second] = lesson.cards;
if (first.type !== "multiple_choice" || second.type !== "multiple_choice") throw new Error("spot-the-ai changed shape; update e2e:card-plays");

const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};
const since = new Date().toISOString();
const rowsFor = async (cardId) => (await admin.from("card_plays").select("*").match({ lesson_id: lesson.id, card_id: cardId }).gte("created_at", since)).data ?? [];
const until = async (check) => {
  for (let t = 0; t < 40; t++) {
    if (await check()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 360, height: 560 } });
  await prepare(page);
  await page.goto(`${BASE}/lesson/${lesson.id}`);
  await page.waitForTimeout(1200); // a little time on the card
  await answerCard(page, first);
  await page.getByRole("button", { name: "Continue", exact: true }).click({ timeout: 30000 });
  await answerCard(page, second, { wrong: true });
  await page.getByRole("button", { name: "Try again", exact: true }).click({ timeout: 30000 });
  await answerCard(page, second);
  await until(async () => (await rowsFor(first.id)).length >= 1 && (await rowsFor(second.id)).length >= 1);
  const a = await rowsFor(first.id);
  const b = await rowsFor(second.id);
  record("A right first answer is stored once, with its time", a.length === 1 && a[0].first_try === true && a[0].ms >= 1000, JSON.stringify(a.map((r) => [r.ms, r.first_try])));
  record("A wrong first answer is stored once (the retry isn't)", b.length === 1 && b[0].first_try === false, JSON.stringify(b.map((r) => r.first_try)));
  record("Nothing identifies the learner", a[0] && Object.keys(a[0]).sort().join() === "card_id,created_at,day,first_try,id,lesson_id,ms,quiz");
  const junk = await fetch(`${BASE}/api/card-plays`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: "not-a-lesson", cardId: "x", ms: 5, firstTry: true }) });
  const badShape = await fetch(`${BASE}/api/card-plays`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  record("Made-up lessons and bad requests are refused", junk.status === 422 && badShape.status === 400, `${junk.status} ${badShape.status}`);
} finally {
  await browser.close();
  await admin.from("card_plays").delete().eq("lesson_id", lesson.id).gte("created_at", since);
}
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} check(s) failed.` : `\n✓ All ${results.length} card measurement checks passed.`);
process.exit(failed ? 1 : 0);
