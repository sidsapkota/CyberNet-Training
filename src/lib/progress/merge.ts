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
 *   ("path", sound on).
 */
import { type ContentIndex, cardXpFor } from "./authority";
import {
  type CardCompletion,
  type LessonCompletion,
  type ProgressSnapshot,
  type QuizAttempt,
  type QuizProgress,
  sumXp,
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

  const next = { cards, lessons, quizzes, preferences: snapshot.preferences };
  return { ...next, totalXp: sumXp(next) };
}

/** Merges local (guest) progress into the account's progress. See the rules at the top. */
export function mergeProgress(
  account: ProgressSnapshot,
  local: ProgressSnapshot,
  index: ContentIndex,
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

  return recomputeXp(
    {
      cards: unionRecords(account.cards, local.cards),
      lessons: unionRecords(account.lessons, local.lessons),
      quizzes,
      preferences: {
        mode: local.preferences.mode !== "path" ? local.preferences.mode : account.preferences.mode,
        sound: local.preferences.sound === false ? false : account.preferences.sound,
      },
    },
    index,
  );
}
