/**
 * Reward rules, pure and tested. Spins are earned only by learning: finishing a module (passing
 * its quiz), finishing a course (passing its final) and reaching 7, 30 and 100-day streaks. Each
 * is earned once, ever. A spin is only offered while there's an unowned spin item left, so every
 * spin that's spun wins (equal chance, never a Pro item); the rest are saved for new items.
 */
import type { CourseOutline } from "@/lib/content/schema";
import { AVATAR_ITEMS, FREE_IDS, itemById, PRO_IDS, SLOTS, SPIN_POOL } from "./items";

export const STREAK_SPINS = [7, 30, 100] as const;

interface Progress {
  passedQuizIds: ReadonlySet<string>;
  courses: readonly CourseOutline[];
  longestStreak: number;
}

/** Finishing a course = passing its final (the last module's quiz), as for certificates. */
function finishedCourse(course: CourseOutline, passedQuizIds: ReadonlySet<string>): boolean {
  const final = course.modules.at(-1)?.lessons.find((l) => l.kind === "quiz");
  return Boolean(final && passedQuizIds.has(final.id));
}

/** Every spin a learner has earned, as `earned_for` keys (module:<id>, course:<id>, streak:<n>). */
export function earnedSpins(input: Progress): string[] {
  const keys: string[] = [];
  for (const course of input.courses) {
    for (const mod of course.modules) {
      const quiz = mod.lessons.find((l) => l.kind === "quiz");
      if (quiz && input.passedQuizIds.has(quiz.id)) keys.push(`module:${mod.id}`);
    }
    if (finishedCourse(course, input.passedQuizIds)) keys.push(`course:${course.id}`);
  }
  for (const n of STREAK_SPINS) if (input.longestStreak >= n) keys.push(`streak:${n}`);
  return keys;
}

export interface Milestones {
  longestStreak: number;
  /** At least one course finished. */
  finishedCourse: boolean;
}

export const NO_MILESTONES: Milestones = { longestStreak: 0, finishedCourse: false };

export function milestonesFrom(input: Progress): Milestones {
  return { longestStreak: input.longestStreak, finishedCourse: input.courses.some((c) => finishedCourse(c, input.passedQuizIds)) };
}

/** Milestone items, unlocked for good (a longest streak never shrinks; a finished course stays finished). */
export function milestoneItems(m: Milestones): string[] {
  return AVATAR_ITEMS.filter((item) => {
    if (item.source !== "milestone" || !item.milestone) return false;
    return item.milestone.kind === "course" ? m.finishedCourse : m.longestStreak >= item.milestone.days;
  }).map((i) => i.id);
}

/** Everything the learner can wear: free items, spin items won, milestones, and Pro items while Pro. */
export function ownedItems(won: Iterable<string>, hasPro: boolean, milestones: Milestones = NO_MILESTONES): Set<string> {
  const owned = new Set<string>([...FREE_IDS, ...milestoneItems(milestones)]);
  for (const id of won) if (itemById(id)?.source === "spin") owned.add(id);
  if (hasPro) for (const id of PRO_IDS) owned.add(id);
  return owned;
}

/** The prize: an unowned spin item, equally likely; null when every spin item is owned. */
export function pickReward(owned: ReadonlySet<string>, random: () => number = Math.random): string | null {
  const pool = SPIN_POOL.filter((i) => !owned.has(i.id));
  if (pool.length === 0) return null;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]!.id;
}

/** Waiting spins: ready to spin (there's something left to win) and saved for new items. */
export function spinCounts(waiting: number, owned: ReadonlySet<string>): { ready: number; saved: number } {
  const left = SPIN_POOL.filter((i) => !owned.has(i.id)).length;
  const ready = Math.min(waiting, left);
  return { ready, saved: waiting - ready };
}

function bySlot(ids: string[]): string[] {
  return ids.sort((a, b) => SLOTS.indexOf(itemById(a)!.slot) - SLOTS.indexOf(itemById(b)!.slot));
}

/** Puts an item on (replacing whatever is in its slot), or takes it off if it's already worn. */
export function wearItem(outfit: readonly string[], itemId: string): string[] {
  const item = itemById(itemId);
  if (!item) return [...outfit];
  if (outfit.includes(itemId)) return outfit.filter((id) => id !== itemId);
  return bySlot([...outfit.filter((id) => itemById(id)?.slot !== item.slot), itemId]);
}

/**
 * What to draw: known items only, one per slot (the first wins), and Pro items only while the
 * learner has Pro (when Pro ends they come off; the rest of the outfit stays).
 */
export function effectiveOutfit(outfit: readonly string[] | null | undefined, pro: boolean): string[] {
  const slots = new Set<string>();
  const out: string[] = [];
  for (const id of outfit ?? []) {
    const item = itemById(id);
    if (!item || slots.has(item.slot) || (item.source === "pro" && !pro)) continue;
    slots.add(item.slot);
    out.push(id);
  }
  return bySlot(out);
}

/** An outfit the server may save: every item real and owned, at most one per slot. */
export function validOutfit(outfit: readonly string[], owned: ReadonlySet<string>): boolean {
  const slots = new Set<string>();
  for (const id of outfit) {
    const item = itemById(id);
    if (!item || !owned.has(id) || slots.has(item.slot)) return false;
    slots.add(item.slot);
  }
  return true;
}
