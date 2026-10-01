/**
 * Merging a guest's local progress into their account on sign-in. Pure and idempotent: merging
 * the same local progress twice gives the same result, so repeated sign-ins are safe.
 *
 * Rules:
 * - Cards and lessons: the union; where both have a record, the EARLIEST completedAt wins (the
 *   activity chart depends on real completion dates).
 * - Quiz attempts: the union, de-duplicated by (quiz, time); best score and first pass time are
 *   derived from the attempts.
 * - XP is RECOMPUTED from the content, never added up, so nothing is counted twice.
 * - Records for lessons or cards that no longer exist are dropped.
 * - Path/Explore and sound: the guest's choice wins if they changed it from the default
 *   ("path", sound on). "How to play" panels seen: the union of both. Daily goal: the guest's
 *   wins if they picked one.
 * - Daily goals and streaks (mergeLedger): the guest's XP events are re-priced from the content
 *   and checked against their own time and time zone; duplicates are dropped, and first-time XP
 *   (a card, a lesson bonus, a quiz pass) counts once ever across both sides. Met days are the
 *   union: the account's, plus each guest met day whose merged XP really reaches its goal. So the
 *   streak afterwards is at least as long as either one.
 */
import { cleanCoachSeen } from "@/lib/coach";
import { type ContentIndex, cardXpFor, practiceXpFor } from "./authority";
import { dayXp, isDailyGoal, isValidTimeZone, type Ledger, MAX_LOCAL_XP_EVENTS, plausibleEvent } from "./daily";
import {
  type CardCompletion,
  type DailyGoalDay,
  type LessonCompletion,
  type ProgressSnapshot,
  type QuizAttempt,
  type QuizProgress,
  sumXp,
  type XpEvent,
} from "./types";
import { XP } from "./xp";

const time = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
};

function earliest<T extends { completedAt: string }>(a: T | undefined, b: T | undefined): T | undefined {
  if (!a) return b;
  if (!b) return a;
  return time(b.completedAt) < time(a.completedAt) ? b : a;
}

function unionRecords<T extends { completedAt: string }>(
  a: Record<string, T>,
  b: Record<string, T>,
): Record<string, T> {
  const out: Record<string, T> = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const winner = earliest(a[key], b[key]);
    if (winner) out[key] = winner;
  }
  return out;
}

/** Quiz progress derived from a list of attempts (best score, first pass). */
export function quizProgressFrom(attempts: QuizAttempt[]): QuizProgress {
  const sorted = [...attempts].sort((x, y) => time(x.at) - time(y.at));
  return {
    attempts: sorted,
    bestScore: sorted.reduce((best, a) => Math.max(best, a.score), 0),
    passedAt: sorted.find((a) => a.passed)?.at ?? null,
  };
}

/**
 * Brings every XP value in line with the content rules and drops unknown ids:
 * card XP from its difficulty (first try or not), +20 per completed lesson, and +50 for the
 * first passed attempt of each quiz only.
 */
export function recomputeXp(snapshot: Omit<ProgressSnapshot, "totalXp">, index: ContentIndex): ProgressSnapshot {
  const cards: Record<string, CardCompletion> = {};
  for (const [key, record] of Object.entries(snapshot.cards)) {
    const slash = key.indexOf("/");
    const xp = cardXpFor(index, key.slice(0, slash), key.slice(slash + 1), record.xp);
    if (xp !== null) cards[key] = { completedAt: record.completedAt, xp };
  }

  const lessons: Record<string, LessonCompletion> = {};
  for (const [id, record] of Object.entries(snapshot.lessons)) {
    if (index.get(id)?.kind === "lesson") lessons[id] = { completedAt: record.completedAt, xp: XP.lessonComplete };
  }

  const quizzes: Record<string, QuizProgress> = {};
  for (const [id, progress] of Object.entries(snapshot.quizzes)) {
    if (index.get(id)?.kind !== "quiz" || progress.attempts.length === 0) continue;
    const derived = quizProgressFrom(progress.attempts);
    let paid = false;
    const attempts = derived.attempts.map((a) => {
      const xp = a.passed && !paid ? XP.quizPass : 0;
      if (a.passed) paid = true;
      return { ...a, xp };
    });
    quizzes[id] = { ...derived, attempts };
  }

  const next = { cards, lessons, quizzes, preferences: snapshot.preferences, xpEvents: snapshot.xpEvents, goalDays: snapshot.goalDays };
  return { ...next, totalXp: sumXp(next) };
}

/**
 * Guest progress in Pro lessons, at sign-in. Guests can't open Pro lessons once Pro has launched,
 * so Pro records from after launch could only come from tampering: they're kept only if the
 * account has Pro. Records from before launch (or before any launch date is set) always stay, so
 * nobody loses progress they really made.
 */
export function withoutUnentitledPro(
  local: ProgressSnapshot,
  index: ContentIndex,
  launchAt: Date | null,
  hasPro: boolean,
): ProgressSnapshot {
  if (hasPro || !launchAt) return local;
  const launch = launchAt.getTime();
  return keepRecords(local, (lessonId, at) => index.get(lessonId)?.access !== "pro" || time(at) < launch);
}

/**
 * When guests had to make a free account for every lesson but each course's first (and the help
 * modules). Records a guest made on account-only lessons after this could only come from
 * tampering, so the merge drops them; earlier ones (when every free lesson was open) stay.
 * null: the gate hasn't launched, so everything stays.
 */
export const GUEST_GATE_AT: Date | null = null;

/** Guest progress on lessons that need an account, made after the gate launched, is dropped. */
export function withoutGatedGuestProgress(local: ProgressSnapshot, index: ContentIndex, gateAt: Date | null): ProgressSnapshot {
  if (!gateAt) return local;
  const gate = gateAt.getTime();
  return keepRecords(local, (lessonId, at) => {
    const lesson = index.get(lessonId);
    // Pro lessons are judged by withoutUnentitledPro; unknown ids are dropped by the merge.
    return !lesson || lesson.access === "pro" || lesson.guests || time(at) < gate;
  });
}

function keepRecords(local: ProgressSnapshot, keep: (lessonId: string, at: string) => boolean): ProgressSnapshot {
  const cards = Object.fromEntries(Object.entries(local.cards).filter(([key, c]) => keep(key.slice(0, key.indexOf("/")), c.completedAt)));
  const lessons = Object.fromEntries(Object.entries(local.lessons).filter(([id, l]) => keep(id, l.completedAt)));
  const quizzes = Object.fromEntries(
    Object.entries(local.quizzes).flatMap(([id, q]) => {
      const attempts = q.attempts.filter((a) => keep(id, a.at));
      return attempts.length ? [[id, quizProgressFrom(attempts)]] : [];
    }),
  );
  const xpEvents = local.xpEvents.filter((e) => keep(e.lessonId, e.at));
  const next = { ...local, cards, lessons, quizzes, xpEvents };
  return { ...next, totalXp: sumXp(next) };
}

/** The XP an event is worth under the content rules, or null if it can't be (unknown ids, no XP). */
export function priceEvent(index: ContentIndex, e: XpEvent, passedQuizzes: ReadonlySet<string>): number | null {
  let xp: number | null = null;
  if (e.kind === "card") xp = e.cardId ? cardXpFor(index, e.lessonId, e.cardId, e.xp) : null;
  else if (e.kind === "practice") xp = e.cardId ? practiceXpFor(index, e.lessonId, e.cardId) : null;
  else if (e.kind === "lesson") xp = index.get(e.lessonId)?.kind === "lesson" ? XP.lessonComplete : null;
  else if (e.kind === "quiz") xp = index.get(e.lessonId)?.kind === "quiz" && passedQuizzes.has(e.lessonId) ? XP.quizPass : null;
  return xp && xp > 0 ? xp : null;
}

const eventKey = (e: XpEvent) => `${time(e.at)}|${e.kind}|${e.lessonId}|${e.cardId ?? ""}`;
const practiceKey = (e: XpEvent) => `${e.day}|${e.lessonId}|${e.cardId ?? ""}`;
/** First-time XP (a card, a lesson's bonus, a quiz pass) happens once ever. */
const firstTimeKey = (e: XpEvent) => (e.kind === "practice" ? null : `${e.kind}|${e.lessonId}|${e.cardId ?? ""}`);

export interface LedgerMerge {
  ledger: Ledger;
  /** Guest events that were accepted (to insert). */
  newEvents: XpEvent[];
  /** Guest met days that were accepted (to insert). */
  newGoalDays: [string, DailyGoalDay][];
}

/**
 * Merges a guest's daily-goal ledger into the account's. `passedQuizzes` are the quizzes the
 * guest really passed (after re-grading), the only ones whose quiz events count.
 */
export function mergeLedger(
  account: Ledger,
  local: Ledger,
  index: ContentIndex,
  passedQuizzes: ReadonlySet<string>,
  now: Date,
): LedgerMerge {
  const seen = new Set(account.xpEvents.map(eventKey));
  const practiced = new Set(account.xpEvents.filter((e) => e.kind === "practice").map(practiceKey));
  const firstTimes = new Set(account.xpEvents.map(firstTimeKey).filter((k) => k !== null));
  const newEvents: XpEvent[] = [];
  for (const e of local.xpEvents.slice(-MAX_LOCAL_XP_EVENTS)) {
    if (!plausibleEvent(e, now)) continue;
    const xp = priceEvent(index, e, passedQuizzes);
    if (xp === null) continue;
    const event: XpEvent = { ...e, at: new Date(e.at).toISOString(), xp };
    if (seen.has(eventKey(event))) continue;
    if (event.kind === "practice") {
      if (practiced.has(practiceKey(event))) continue;
      practiced.add(practiceKey(event));
    } else {
      const key = firstTimeKey(event)!;
      if (firstTimes.has(key)) continue;
      firstTimes.add(key);
    }
    seen.add(eventKey(event));
    newEvents.push(event);
  }
  const xpEvents = [...account.xpEvents, ...newEvents].sort((a, b) => time(a.at) - time(b.at));

  const goalDays = { ...account.goalDays };
  const newGoalDays: [string, DailyGoalDay][] = [];
  for (const [day, g] of Object.entries(local.goalDays)) {
    if (goalDays[day] || !isDailyGoal(g.goal) || !isValidTimeZone(g.tz)) continue;
    if (dayXp(xpEvents, day) < g.goal) continue;
    const metAt = time(g.metAt) <= now.getTime() ? new Date(g.metAt).toISOString() : now.toISOString();
    const accepted: DailyGoalDay = { tz: g.tz, goal: g.goal, metAt };
    goalDays[day] = accepted;
    newGoalDays.push([day, accepted]);
  }
  return { ledger: { xpEvents, goalDays }, newEvents, newGoalDays };
}

/** Merges local (guest) progress into the account's progress. See the rules at the top. */
export function mergeProgress(
  account: ProgressSnapshot,
  local: ProgressSnapshot,
  index: ContentIndex,
  now: Date = new Date(),
): ProgressSnapshot {
  const quizzes: Record<string, QuizProgress> = {};
  for (const id of new Set([...Object.keys(account.quizzes), ...Object.keys(local.quizzes)])) {
    const seen = new Map<number, QuizAttempt>();
    for (const attempt of [...(account.quizzes[id]?.attempts ?? []), ...(local.quizzes[id]?.attempts ?? [])]) {
      const key = time(attempt.at);
      if (!seen.has(key)) seen.set(key, attempt);
    }
    quizzes[id] = quizProgressFrom([...seen.values()]);
  }

  const passedQuizzes = new Set(
    Object.entries(local.quizzes)
      .filter(([, q]) => q.attempts.some((a) => a.passed))
      .map(([id]) => id),
  );
  const { ledger } = mergeLedger(account, local, index, passedQuizzes, now);

  return recomputeXp(
    {
      ...ledger,
      cards: unionRecords(account.cards, local.cards),
      lessons: unionRecords(account.lessons, local.lessons),
      quizzes,
      preferences: {
        mode: local.preferences.mode !== "path" ? local.preferences.mode : account.preferences.mode,
        sound: local.preferences.sound === false ? false : account.preferences.sound,
        coachSeen: cleanCoachSeen([...account.preferences.coachSeen, ...local.preferences.coachSeen]),
        dailyGoal: local.preferences.dailyGoalChosen ? local.preferences.dailyGoal : account.preferences.dailyGoal,
        dailyGoalChosen: local.preferences.dailyGoalChosen || account.preferences.dailyGoalChosen,
      },
    },
    index,
  );
}
