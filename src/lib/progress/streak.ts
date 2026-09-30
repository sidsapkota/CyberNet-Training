/**
 * Streaks, calculated (never stored) from the days the daily goal was met. Pure: the same function
 * runs on the server and for the header and dashboard, so nothing about a streak can be tampered
 * with on its own.
 *
 * Rules:
 * - A day counts when its daily goal was met.
 * - **Freezes:** one is earned each time the streak reaches a multiple of 7 days (at most 2 held).
 *   Each missed day uses one automatically; a frozen day keeps the streak alive but doesn't add to
 *   it. More missed days than freezes: the streak restarts (and the freezes are used up).
 * - **Missed days are fair:**
 *   - In one time zone, days are counted by calendar date, so daylight saving (23- or 25-hour
 *     days) never matters.
 *   - Across a time zone change, a day only counts as missed if the learner had a whole day to
 *     learn in: the real time between the end of the last met day and the start of the next day
 *     must be a full 24 hours (with 3 hours' tolerance). Flying east over the date line can skip a
 *     calendar date; that never breaks a streak.
 * - Today isn't missed until it's over.
 */
import { addDays, dayDiff, dayStart, type TodayProgress, todayProgress } from "./daily";
import type { DailyGoalDay, ProgressSnapshot } from "./types";

export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100] as const;
export const FREEZE_EVERY = 7;
export const MAX_FREEZES = 2;
/** Tolerance when a time zone changed between two days (covers DST-sized shifts). */
const TRAVEL_TOLERANCE_HOURS = 3;

export interface DayRef {
  day: string;
  tz: string;
}

/**
 * Days that genuinely went by with no chance of meeting the goal, between met day `a` and the day
 * `b` (exclusive at both ends).
 */
export function missedDaysBetween(a: DayRef, b: DayRef): number {
  const calendar = dayDiff(a.day, b.day) - 1;
  if (calendar <= 0) return 0;
  if (a.tz === b.tz) return calendar;
  const hours = (dayStart(b.day, b.tz) - dayStart(addDays(a.day, 1), a.tz)) / 3_600_000;
  return Math.min(calendar, Math.max(0, Math.floor((hours + TRAVEL_TOLERANCE_HOURS) / 24)));
}

export interface StreakState {
  /** Days in the current streak (0 = no streak). */
  current: number;
  longest: number;
  /** Freezes held now (after any used for days already missed). */
  freezes: number;
  /** Today's goal is already met. */
  todayMet: boolean;
  /** Dates covered by a freeze. */
  frozenDays: string[];
  /** The learner had a streak before and it has ended (for the "fresh start" message). */
  ended: boolean;
}

/**
 * `maxFreezesOn(day)` is the most freezes the learner can hold on that day (Pro holds one more;
 * see src/lib/pro/entitlement.ts). Applied day by day: when Pro ends, an unused extra freeze drops
 * away, but one already used stays used, so a lapse never breaks a streak after the fact.
 */
export function computeStreak(
  goalDays: Readonly<Record<string, DailyGoalDay>>,
  today: DayRef,
  maxFreezesOn: (day: string) => number = () => MAX_FREEZES,
): StreakState {
  const days = Object.keys(goalDays)
    .filter((d) => d <= today.day)
    .sort();
  let run = 0;
  let freezes = 0;
  let longest = 0;
  const frozenDays: string[] = [];
  let prev: DayRef | null = null;

  const cover = (from: DayRef, missed: number): boolean => {
    const covered: string[] = [];
    for (let i = 1; i <= missed; i++) {
      const day = addDays(from.day, i);
      freezes = Math.min(freezes, maxFreezesOn(day));
      if (freezes === 0) return false;
      freezes -= 1;
      covered.push(day);
    }
    frozenDays.push(...covered);
    return true;
  };

  for (const day of days) {
    const here: DayRef = { day, tz: goalDays[day]!.tz };
    if (prev && !cover(prev, missedDaysBetween(prev, here))) run = 0;
    run += 1;
    const cap = maxFreezesOn(day);
    freezes = Math.min(freezes, cap);
    if (run % FREEZE_EVERY === 0 && freezes < cap) freezes += 1;
    longest = Math.max(longest, run);
    prev = here;
  }

  const todayMet = Boolean(goalDays[today.day]);
  let current = run;
  if (prev && !todayMet && !cover(prev, missedDaysBetween(prev, today))) current = 0;
  freezes = Math.min(freezes, maxFreezesOn(today.day));

  return { current, longest, freezes, todayMet, frozenDays, ended: prev !== null && current === 0 };
}

/** The milestone just reached going from `before` to `after` days, if any (the highest one). */
export function milestoneReached(before: number, after: number): number | null {
  let hit: number | null = null;
  for (const m of STREAK_MILESTONES) if (before < m && after >= m) hit = m;
  return hit;
}

export function streakLabel(days: number): string {
  return `${days}-day streak`;
}

export interface DailyStatus {
  today: TodayProgress;
  streak: StreakState;
}

/** Today's goal progress and the streak, for a learner in time zone `tz` at `now`. */
export function dailyStatus(
  snapshot: Pick<ProgressSnapshot, "xpEvents" | "goalDays" | "preferences">,
  now: Date,
  tz: string,
  maxFreezesOn?: (day: string) => number,
): DailyStatus & { maxFreezes: number } {
  const today = todayProgress(snapshot, now, tz);
  return {
    today,
    streak: computeStreak(snapshot.goalDays, { day: today.day, tz }, maxFreezesOn),
    maxFreezes: maxFreezesOn?.(today.day) ?? MAX_FREEZES,
  };
}

/** The streak in words, for screen readers (the header pill, the dashboard). */
export function streakSummary({ today, streak }: DailyStatus): string {
  const days = streak.current === 0 ? "No streak yet" : streakLabel(streak.current);
  return `${days}. Today's goal ${today.met ? "met" : `${Math.min(today.xp, today.goal)} of ${today.goal} XP`}.`;
}
