// The guest sign-up gate, end to end: a guest's first lesson has its cards in the page, the next one
// doesn't (the server refuses it), finishing lesson 1 shows the gate with its XP, and signing up
// carries the guest's progress into the new account and opens the next lesson. Help lessons stay
// open. The throwaway account is deleted afterwards.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";

// Run with the dev server up (`npm run dev`), then `npm run e2e:guest-gate`. Needs .env.local with
// the Supabase URL and SUPABASE_SECRET_KEY. Uses an installed Edge or Chrome (E2E_BROWSER=chrome).
const APP = path.resolve(import.meta.dirname, "../..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(APP, ".env.local"), "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SHOTS = path.join(APP, ".e2e-shots");
fs.mkdirSync(SHOTS, { recursive: true });
const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};

const LESSONS = path.join(APP, "content/courses/stay-safe-online/modules/01-lock-your-accounts/lessons");
const lesson1 = JSON.parse(fs.readFileSync(path.join(LESSONS, "01-strong-passwords.json"), "utf8"));
const lesson2 = JSON.parse(fs.readFileSync(path.join(LESSONS, "02-two-step-sign-in.json"), "utf8"));
const GATE = "Create a free account to keep going.";

// Guest progress: every card of lesson 1 but its last (the recap), so Continue finishes it.
const at = new Date(Date.now() - 10 * 60_000).toISOString();
const done = lesson1.cards.slice(0, -1);
const xpOf = (card) => (card.type === "explainer" || card.type === "photo" ? 0 : card.difficulty === "challenge" ? 20 : 10);
const guestProgress = {
  cards: Object.fromEntries(done.map((c) => [`${lesson1.id}/${c.id}`, { completedAt: at, xp: xpOf(c) }])),
  lessons: {},
  quizzes: {},
  preferences: { mode: "path", sound: false, coachSeen: [], dailyGoal: 50, dailyGoalChosen: true },
  xpEvents: [],
  goalDays: {},
  totalXp: done.reduce((n, c) => n + xpOf(c), 0),
};

const email = `gate-e2e-${Date.now()}@example.com`;
let userId = null;
const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  // 1. The page HTML: lesson 1's cards are there; lesson 2's never are. (Fetched through a browser
  // context, so a protected preview's share cookie goes with it.)
  const htmlContext = await browser.newContext();
  const htmlPage = await htmlContext.newPage();
  await prepare(htmlPage);
  const html1 = await (await htmlPage.request.get(`${BASE}/lesson/${lesson1.id}`)).text();
  const html2 = await (await htmlPage.request.get(`${BASE}/lesson/${lesson2.id}`)).text();
  await htmlContext.close();
  const secret = lesson2.cards.find((c) => c.prompt)?.prompt.slice(0, 30);
  record("A course's first lesson has its cards in the page", html1.includes(lesson1.cards[1].title ?? lesson1.cards[1].prompt.slice(0, 30)));
  record("A lesson that needs an account never ships its cards in the page", Boolean(secret) && !html2.includes(secret));

  const context = await browser.newContext({ viewport: { width: 360, height: 900 }, colorScheme: "dark", reducedMotion: "reduce" });
  const page = await context.newPage();
  await prepare(page);
  await page.goto(BASE);
  await page.evaluate((p) => localStorage.setItem("cybernet.progress.v1", JSON.stringify(p)), guestProgress);

  // 2. The server: guests get 401 "account" for lesson 2, and help lessons are open.
  const api = await page.evaluate(async (ids) => {
    const out = {};
    for (const id of ids) {
      const r = await fetch(`/api/lessons/${id}`);
      out[id] = [r.status, (await r.json()).reason ?? "ok"];
    }
    return out;
  }, [lesson2.id, "getting-help", "signs-of-a-hack"]);
  record("The server asks guests for an account on lesson 2", api[lesson2.id][0] === 401 && api[lesson2.id][1] === "account", JSON.stringify(api));
  record("When Things Go Wrong stays open to guests", api["getting-help"][0] === 200 && api["signs-of-a-hack"][0] === 200);

  // 3. Lesson 2 as a guest: the gate, with "Not now".
  await page.goto(`${BASE}/lesson/${lesson2.id}`, { waitUntil: "networkidle" });
  const gated = await page.getByRole("heading", { name: GATE }).waitFor({ timeout: 15_000 }).then(() => true, () => false);
  record("Lesson 2 shows the sign-up gate to a guest", gated && (await page.getByRole("link", { name: "Not now" }).isVisible()));
  record("…with the perks, including leagues", await page.getByText(/Weekly leagues/).isVisible());
  await page.screenshot({ path: path.join(SHOTS, "360-gate-lesson.png"), fullPage: true });

  // 4. Finishing lesson 1: the lesson-complete screen offers the gate with this lesson's XP.
  await page.goto(`${BASE}/lesson/${lesson1.id}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Continue" }).last().click();
  await page.getByText("Lesson complete").waitFor({ timeout: 15_000 });
  const xpLine = await page.getByText(/XP comes with you\./).first().textContent().catch(() => "");
  record("Finishing lesson 1 shows the gate with that lesson's XP", /Your \d+ XP comes with you\./.test(xpLine ?? ""), xpLine ?? "");
  record("…and no 'Next lesson' button into the gate", (await page.getByRole("link", { name: "Next lesson" }).count()) === 0);
  await page.waitForTimeout(1500); // the screen fades in
  await page.screenshot({ path: path.join(SHOTS, "360-gate-complete.png"), fullPage: true });

  // 5. Sign up from the gate (as SignInOptions does: the age flag, the return path and the lesson),
  // then the magic link. New account → name → back on lesson 2, which now plays.
  const { data: created } = await admin.auth.admin.createUser({ email, email_confirm: true });
  userId = created.user.id;
  await page.evaluate((lessonId) => {
    localStorage.setItem("cybernet.ageConfirmed.pending", "1");
    localStorage.setItem("cybernet.signupLesson", JSON.stringify({ lesson: lessonId, at: Date.now() }));
    document.cookie = `cybernet_next=${encodeURIComponent("/lesson/two-step-sign-in")}; Path=/; Max-Age=3600; SameSite=Lax`;
  }, lesson1.id);
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink`);
  await page.waitForURL(/\/account\?welcome=1/, { timeout: 15_000 });
  record("A new account picks a name first, keeping where it was going", page.url().includes(`next=${encodeURIComponent("/lesson/two-step-sign-in")}`), page.url());
  await page.getByLabel("Display name").fill("Gate Tester");
  await page.getByRole("button", { name: /Save/ }).first().click();
  await page.waitForURL(/\/lesson\/two-step-sign-in/, { timeout: 15_000 });
  const plays = await page.getByRole("heading", { name: GATE }).isVisible().catch(() => false);
  await page.waitForTimeout(2500);
  const first = lesson2.cards[0];
  // The first card's title, or a plain bit of its prompt (markdown and glossary marks removed).
  const firstText = (first.title ?? first.prompt.replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, "$1").replace(/[*`_]/g, "")).slice(0, 24);
  const cardShown = await page.getByText(firstText).first().isVisible().catch(() => false);
  record("…then lesson 2 opens and plays", !plays && cardShown);
  await page.screenshot({ path: path.join(SHOTS, "360-gate-after-signup.png"), fullPage: true });

  // 6. The guest's progress came with them (merged and validated on the server).
  let merged = [];
  for (let i = 0; i < 10 && merged.length === 0; i++) {
    await page.waitForTimeout(1000);
    merged = (await admin.from("lesson_completions").select("lesson_id, xp").eq("user_id", userId)).data ?? [];
  }
  const cards = (await admin.from("card_completions").select("card_id").eq("user_id", userId).eq("lesson_id", lesson1.id)).data ?? [];
  record("Lesson 1 and its cards moved into the account", merged.some((l) => l.lesson_id === lesson1.id) && cards.length === lesson1.cards.length, `${cards.length} cards`);
  await context.close();
} finally {
  await browser.close();
  if (userId) await admin.auth.admin.deleteUser(userId);
  const left = userId ? ((await admin.from("card_completions").select("card_id").eq("user_id", userId)).data ?? []).length : 0;
  console.log(`cleanup: rows left ${left}`);
}
console.log(results.length && results.every(Boolean) ? `All ${results.length} checks passed.` : `${results.filter((r) => !r).length || "some"} FAILED`);
process.exitCode = results.every(Boolean) ? 0 : 1;
