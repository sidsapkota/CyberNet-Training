/**
 * Reward rules, pure and tested. Spins are earned only by learning: finishing a module (passing
 * its quiz), finishing a course (passing its final) and reaching 7, 30 and 100-day streaks. Each
 * is earned once, ever. Every spin wins: the prize is drawn with equal chance from the spin items
 * the learner doesn't own yet (never a Pro item, so paying never changes a spin).
 */
import type { CourseOutline } from "@/lib/content/schema";
import { DEFAULT_AVATAR, itemById, PRO_IDS, SPIN_POOL, STARTER_IDS } from "./items";

export const STREAK_SPINS = [7, 30, 100] as const;

/** Every spin a learner has earned, as `earned_for` keys (module:<id>, course:<id>, streak:<n>). */
export function earnedSpins(input: { passedQuizIds: ReadonlySet<string>; courses: readonly CourseOutline[]; longestStreak: number }): string[] {
  const keys: string[] = [];
  for (const course of input.courses) {
    for (const mod of course.modules) {
      const quiz = mod.lessons.find((l) => l.kind === "quiz");
      if (quiz && input.passedQuizIds.has(quiz.id)) keys.push(`module:${mod.id}`);
    }
    // Finishing a course = passing its final (the last module's quiz), as for certificates.
    const final = course.modules.at(-1)?.lessons.find((l) => l.kind === "quiz");
    if (final && input.passedQuizIds.has(final.id)) keys.push(`course:${course.id}`);
  }
  for (const n of STREAK_SPINS) if (input.longestStreak >= n) keys.push(`streak:${n}`);
  return keys;
}

/** How many spins the content allows at most (the spin pool must be at least this big). */
export function maxEarnableSpins(courses: readonly CourseOutline[]): number {
  return courses.reduce((n, c) => n + c.modules.length + 1, 0) + STREAK_SPINS.length;
}

/** The prize: an unowned spin item, equally likely; null only if every spin item is owned. */
export function pickReward(owned: ReadonlySet<string>, random: () => number = Math.random): string | null {
  const pool = SPIN_POOL.filter((i) => !owned.has(i.id));
  if (pool.length === 0) return null;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]!.id;
}

/** Everything the learner can wear: starters, what they've won, and Pro items while they have Pro. */
export function ownedItems(won: Iterable<string>, hasPro: boolean): Set<string> {
  const owned = new Set<string>([...STARTER_IDS, ...won]);
  if (hasPro) for (const id of PRO_IDS) owned.add(id);
  return owned;
}

/**
 * What to show: the chosen avatar if it's a real item the learner may wear, else the plain
 * mascot. (When Pro ends, a Pro item falls back to the mascot until they choose another.)
 */
export function effectiveAvatar(avatar: string | null | undefined, pro: boolean): string {
  const item = itemById(avatar);
  if (!item) return DEFAULT_AVATAR;
  if (item.source === "pro" && !pro) return DEFAULT_AVATAR;
  return item.id;
}
