/**
 * The daily lesson limit for free accounts. Pure, so it's tested; the database enforces it
 * (`open_lesson`, called by /api/lessons/[id]).
 *
 * - Free accounts open up to DAILY_LESSON_LIMIT new lessons a day (quizzes count). Pro: unlimited.
 * - Never counted: lessons guests can play (each course's first lesson and the help modules, which
 *   the API sends before checking anything), lessons already finished (replays), and opening the
 *   same lesson again on the same day.
 * - The day is the learner's own (their saved time zone, else Sydney). The database only lets the
 *   saved zone change once every 7 days, so switching zones can't reset the day.
 */
import { isValidTimeZone } from "@/lib/progress/daily";

export const DAILY_LESSON_LIMIT = 3;
export const LIMIT_FALLBACK_TIME_ZONE = "Australia/Sydney";

/** The learner's day ("YYYY-MM-DD") for the limit, as the database works it out. */
export function limitDay(timeZone: string | null | undefined, now: Date): string {
  const tz = isValidTimeZone(timeZone) ? timeZone : LIMIT_FALLBACK_TIME_ZONE;
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export interface DailyLessons {
  /** False for Pro learners (and guests): no limit applies. */
  limited: boolean;
  used: number;
  limit: number;
}

export function lessonsLeft(d: DailyLessons): number {
  return d.limited ? Math.max(0, d.limit - d.used) : Infinity;
}

/**
 * Whether opening a lesson counts toward today's limit (before the database checks room).
 * `guestOpen`: guests can play it. `finished`: a replay.
 */
export function countsTowardLimit(o: { guestOpen: boolean; hasPro: boolean; finished: boolean }): boolean {
  return !o.guestOpen && !o.hasPro && !o.finished;
}

/** One line for the course path popover, or null when there's nothing worth saying. */
export function lessonsLeftLine(d: DailyLessons): string | null {
  if (!d.limited) return null;
  const left = lessonsLeft(d);
  if (left === 0) return "No new lessons left today. Replays are free.";
  return `${left} new ${left === 1 ? "lesson" : "lessons"} left today`;
}
