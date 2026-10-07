// Challenge a friend, end to end on STAGING (refuses production). Dev server running.
// - A learner who finished a lesson makes a challenge at 360x560 (one try each) and gets a link;
//   a learner who hasn't finished it is asked to first.
// - A guest opens the link: the challenger's username and score, never their email; plays with two
//   health bars; wins; sends "GG" (the Pro emotes aren't offered, and the server refuses them).
// - Signing up from the result claims the guest's go (challenge_signup).
// - The challenger sees who played and their reaction; /account lists the challenge.
// - Bad answers, unknown links and expired links are handled.
//   npm run e2e:challenge
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";
import { allLessons, ANSWERABLE, answerCard } from "./lib/answer.mjs";
import { readEnvEntries, PRODUCTION_REF } from "./lib/env.mjs";
import { layoutProblems } from "./lib/layout.mjs";

const APP = path.resolve(import.meta.dirname, "../..");
const env = Object.fromEntries(readEnvEntries(APP));
if (env.NEXT_PUBLIC_SUPABASE_URL.includes(PRODUCTION_REF)) throw new Error("e2e:challenge creates learners and challenges: staging only.");
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SHOTS = path.join(APP, ".e2e-shots");

// The same pick as src/lib/challenges/rules.ts: the last 5 interactive core cards.
const NOT_GRADED = new Set(["explainer", "photo", "reveal"]);
const questions = (lesson) => lesson.cards.filter((c) => c.difficulty === "core" && !NOT_GRADED.has(c.type) && !(c.type === "hotspot" && c.mode === "explore")).slice(-5);
const lesson = allLessons(APP).find((l) => l.kind === "lesson" && questions(l).length >= 3 && questions(l).every((c) => ANSWERABLE.has(c.type)));
if (!lesson) throw new Error("No lesson whose challenge questions this test can answer");
const cards = questions(lesson);
console.log(`Using "${lesson.title}" (${cards.length} questions: ${cards.map((c) => c.type).join(", ")})`);

const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};
const users = [];
async function learner(label, { finished = false } = {}) {
  const email = `challenge-e2e-${label}-${Date.now()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  const id = data.user.id;
  users.push(id);
  const username = `Duel${label.slice(0, 4)}${Math.floor(Math.random() * 900 + 100)}`;
  await admin.from("profiles").update({ username, age_confirmed: true, outfit: ["cap"] }).eq("id", id);
  if (finished) await admin.from("lesson_completions").insert({ user_id: id, lesson_id: lesson.id, xp: 20, completed_at: new Date().toISOString() });
  return { id, email, username };
}
async function signIn(page, who, next) {
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email: who.email });
  await page.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=${encodeURIComponent(next)}`);
  await page.waitForURL((u) => u.pathname === next.split("?")[0], { timeout: 60000 });
}
const nextButton = (page) => page.getByRole("button", { name: /Next question|See the result/ });

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
try {
  const creator = await learner("maker", { finished: true });
  const notYet = await learner("notyet");

  // 1. Not finished: asked to finish first.
  {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 560 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await prepare(page);
    await signIn(page, notYet, `/challenge/new/${lesson.id}`);
    record("A learner who hasn't finished the lesson is asked to first", await page.getByRole("heading", { name: "Finish the lesson first" }).isVisible());
    await ctx.close();
  }

  // 2. Make a challenge: all right but the last.
  let challengeId;
  {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 560 }, colorScheme: "dark", reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await prepare(page);
    await signIn(page, creator, `/challenge/new/${lesson.id}`);
    await page.getByRole("button", { name: "Start", exact: true }).click({ timeout: 30000 });
    for (let i = 0; i < cards.length; i++) {
      await answerCard(page, cards[i], { wrong: i === cards.length - 1 });
      if (i === 0) {
        const layout = await page.evaluate(layoutProblems, null);
        record("The challenge run lays out cleanly at 360x560", layout.length === 0, JSON.stringify(layout));
        await page.screenshot({ path: path.join(SHOTS, "challenge-make-360.png") });
      }
      await nextButton(page).click();
    }
    await page.getByText("Now send it to a friend").waitFor({ timeout: 30000 });
    const shown = await page.getByText(`${cards.length - 1}/${cards.length}`, { exact: true }).isVisible();
    const row = (await admin.from("challenges").select("id, score, card_ids").eq("creator_id", creator.id)).data?.[0];
    challengeId = row?.id;
    record("Making a challenge saves the server's score and shows the link", shown && row?.score === cards.length - 1 && row.card_ids.length === cards.length && (await page.getByText(`/c/${challengeId}`).isVisible()));
    await page.screenshot({ path: path.join(SHOTS, "challenge-share-360.png") });
    await ctx.close();
  }

  // 3. A guest plays the link and wins.
  const guestCtx = await browser.newContext({ viewport: { width: 360, height: 560 }, colorScheme: "light", reducedMotion: "reduce" });
  const guest = await guestCtx.newPage();
  await prepare(guest);
  await guest.goto(`${BASE}/c/${challengeId}`);
  await guest.getByRole("heading", { name: new RegExp(`${creator.username} scored ${cards.length - 1}/${cards.length}`) }).waitFor({ timeout: 30000 });
  const html = await guest.content();
  record("The link shows the challenger's username and score, never their email", !html.includes(creator.email) && !html.includes(creator.id));
  const introLayout = await guest.evaluate(layoutProblems, null);
  record("The challenge intro lays out cleanly at 360x560", introLayout.length === 0, JSON.stringify(introLayout));
  await guest.screenshot({ path: path.join(SHOTS, "challenge-intro-360.png") });
  await guest.getByRole("button", { name: "Accept the challenge" }).click();
  for (let i = 0; i < cards.length; i++) {
    await answerCard(guest, cards[i]);
    if (i === cards.length - 1) {
      const rivalLine = await guest.getByText(`${creator.username} missed this one.`).isVisible();
      const bars = await guest.getByLabel(`${cards.length - 1} of ${cards.length} health`).isVisible();
      record("After each answer the rival's answer is revealed and their health drops", rivalLine && bars);
      await guest.screenshot({ path: path.join(SHOTS, "challenge-duel-360.png") });
    }
    await nextButton(guest).click();
  }
  await guest.getByRole("heading", { name: `You beat ${creator.username}!` }).waitFor({ timeout: 30000 });
  const attempt = (await admin.from("challenge_attempts").select("id, player_id, score").eq("challenge_id", challengeId)).data?.[0];
  record("The guest's go is saved, re-graded on the server, as a guest", attempt?.score === cards.length && attempt.player_id === null);
  record("Guests get only the free emotes", (await guest.getByRole("button", { name: "GG" }).isVisible()) && !(await guest.getByRole("button", { name: "Wow" }).isVisible()));
  const resultLayout = await guest.evaluate(layoutProblems, null);
  record("The result screen lays out cleanly at 360x560", resultLayout.length === 0, JSON.stringify(resultLayout));
  await guest.screenshot({ path: path.join(SHOTS, "challenge-result-360.png") });
  await guest.getByRole("button", { name: "GG" }).click();
  await guest.getByText("Sent").waitFor({ timeout: 15000 });
  record("Sending GG saves it", (await admin.from("challenge_attempts").select("emote").eq("id", attempt.id).single()).data?.emote === "gg");
  const local = await guest.evaluate((id) => JSON.parse(localStorage.getItem(`cybernet.challenge.${id}`) ?? "null"), challengeId);
  const proEmote = await fetch(`${BASE}/api/challenges/${challengeId}/emote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attemptId: local.attemptId, key: local.key, emote: "wow" }) });
  record("The server refuses a Pro emote from a guest", proEmote.status === 403);

  // 4. Sign up from the result: the go becomes theirs.
  const newcomer = await learner("newbie");
  await guest.getByRole("link", { name: "Sign up to save your score and challenge back" }).click();
  await guest.waitForURL((u) => u.pathname === "/login", { timeout: 30000 });
  await signIn(guest, newcomer, `/c/${challengeId}`);
  await guest.getByRole("link", { name: "Challenge back" }).waitFor({ timeout: 30000 });
  const claimed = await (async () => {
    for (let t = 0; t < 30; t++) {
      const row = (await admin.from("challenge_attempts").select("player_id").eq("id", attempt.id).single()).data;
      if (row?.player_id === newcomer.id) return true;
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  })();
  record("Signing up claims the guest's go, and offers Challenge back", claimed);
  await guestCtx.close();

  // 5. The challenger's view and /account.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await prepare(page);
    await signIn(page, creator, `/c/${challengeId}`);
    await page.getByRole("heading", { name: "Who played" }).waitFor({ timeout: 30000 });
    record("The challenger sees who played, their score and reaction", (await page.getByText(newcomer.username).isVisible()) && (await page.getByText("GG", { exact: true }).isVisible()));
    await page.goto(`${BASE}/account`);
    await page.getByRole("heading", { name: "Challenges" }).waitFor({ timeout: 30000 });
    record("/account lists the challenge with its players", await page.getByText("1 player").isVisible());
    await ctx.close();
  }

  // 6. Bad input, unknown and expired links.
  const bad = await fetch(`${BASE}/api/challenges/${challengeId}/attempts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: [1] }) });
  record("Answers that don't fit the challenge are refused", bad.status === 409 || bad.status === 400, String(bad.status));
  const unknown = await fetch(`${BASE}/c/zzzzzzzzzzzz`);
  record("An unknown challenge is a 404", unknown.status === 404);
  await admin.from("challenges").update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq("id", challengeId);
  const late = await browser.newPage();
  await late.goto(`${BASE}/c/${challengeId}`);
  record("An expired challenge says so and offers the lesson", (await late.getByText("This challenge has ended.").isVisible({ timeout: 30000 }).catch(() => false)) || (await late.getByText("This challenge has ended.").waitFor({ timeout: 30000 }).then(() => true, () => false)));
  await late.close();
} finally {
  await browser.close();
  for (const id of users) await admin.auth.admin.deleteUser(id);
}
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} check(s) failed.` : `\n✓ All ${results.length} challenge checks passed.`);
process.exit(failed ? 1 : 0);
