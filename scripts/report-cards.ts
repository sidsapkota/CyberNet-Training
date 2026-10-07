/**
 * `npm run report:cards`: the 10 slowest and 10 most-failed cards per course over the last 7 days
 * (cards with at least 5 plays), from the anonymous card_plays table. Read-only.
 *   E2E_ENV_FILE=.env.production-checks npm run report:cards     (production; owner's say-so not needed: it only reads)
 *   DAYS=14 MIN_PLAYS=3 npm run report:cards
 * Paste the summary into docs/handover.md each week.
 */
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadContent } from "../src/lib/content/load";
import { type CardStat, cardStats, mostFailed, slowest } from "../src/lib/measure/cardPlays";
// @ts-expect-error: a plain .mjs helper shared with the e2e scripts
import { readEnvEntries } from "./e2e/lib/env.mjs";

const APP = path.resolve(import.meta.dirname, "..");
const env = Object.fromEntries(readEnvEntries(APP) as [string, string][]);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
const days = Number(process.env.DAYS ?? 7);
const minPlays = Number(process.env.MIN_PLAYS ?? 5);

async function main() {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows: { lesson_id: string; card_id: string; ms: number; first_try: boolean }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from("card_plays").select("lesson_id, card_id, ms, first_try").gte("created_at", since).range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  const { courses, lessons } = loadContent();
  const courseOf = new Map([...lessons.values()].map((l) => [l.id, l.courseId]));
  const title = new Map([...lessons.values()].map((l) => [l.id, l.title]));
  const stats = cardStats(rows, minPlays);
  const firstTry = rows.length ? rows.filter((r) => r.first_try).length / rows.length : 0;
  console.log(`Card plays, last ${days} days: ${rows.length} plays, ${Math.round(firstTry * 100)}% right first time (cards with ${minPlays}+ plays: ${stats.length}).\n`);
  const line = (s: CardStat) => `  ${title.get(s.lessonId) ?? s.lessonId} › ${s.cardId}: ${s.medianSeconds}s median, ${Math.round(s.firstTryRate * 100)}% first try (${s.plays} plays)`;
  for (const course of courses) {
    const mine = stats.filter((s) => courseOf.get(s.lessonId) === course.id);
    if (!mine.length) continue;
    console.log(`${course.title}`);
    console.log(" Slowest:");
    for (const s of slowest(mine)) console.log(line(s));
    console.log(" Most failed:");
    for (const s of mostFailed(mine)) console.log(line(s));
    console.log("");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
