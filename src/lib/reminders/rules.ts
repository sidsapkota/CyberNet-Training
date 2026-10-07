/**
 * Reminder emails (opt-in), as pure rules: who gets which one, and when. The hourly job
 * (src/lib/reminders/server.ts) reads the data and asks these.
 * - Streak: about 7 pm in the learner's own time zone, only with a streak to keep and no XP today.
 *   "Ends tonight" only when no freeze would save it (honest: never a fake deadline).
 * - League: Sunday 6 pm Sydney (6 hours before the Monday reset), only while leagues are open, only
 *   to learners ranked in a league this week with XP, and only at a decent hour where they are.
 * - At most one a day (the league one wins on a Sunday); the database enforces it too.
 */
import { LEAGUE_TIME_ZONE } from "@/lib/leagues/config";

/** Local hour the streak reminder goes out (7 pm). */
export const STREAK_REMINDER_HOUR = 19;
/** Sydney day and hour the league reminder goes out: Sunday (7) at 6 pm, 6 hours before the reset. */
export const LEAGUE_REMINDER = { weekday: 7, hour: 18 } as const;
/** League reminders only reach learners between these local hours (8:00 to 21:59). */
export const DECENT_HOURS = { from: 8, to: 21 } as const;

export type Reminder =
  | { kind: "streak"; days: number; endsTonight: boolean }
  | { kind: "league"; rank: number; hoursLeft: number };

export interface Clock {
  /** YYYY-MM-DD in the time zone. */
  day: string;
  hour: number;
  /** ISO weekday: Monday 1 … Sunday 7. */
  weekday: number;
}

const WEEKDAYS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

/** The date, hour and weekday at `now` in `tz`. */
export function clockIn(now: Date, tz: string): Clock {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-AU", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", hourCycle: "h23", weekday: "short" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), weekday: WEEKDAYS[parts.weekday ?? ""] ?? 0 };
}

export function streakReminder(input: { localHour: number; streak: number; freezes: number; xpToday: number }): Reminder | null {
  if (input.localHour !== STREAK_REMINDER_HOUR) return null;
  if (input.streak < 1 || input.xpToday > 0) return null;
  return { kind: "streak", days: input.streak, endsTonight: input.freezes === 0 };
}

/** Whether `now` is the league reminder hour (Sunday 6 pm Sydney). */
export function isLeagueReminderHour(now: Date): boolean {
  const sydney = clockIn(now, LEAGUE_TIME_ZONE);
  return sydney.weekday === LEAGUE_REMINDER.weekday && sydney.hour === LEAGUE_REMINDER.hour;
}

export function leagueReminder(input: {
  open: boolean;
  leagueHour: boolean;
  localHour: number;
  /** Their place this week, or null when they're not ranked (not in a league, or hidden). */
  rank: number | null;
  weeklyXp: number;
  hoursLeft: number;
}): Reminder | null {
  if (!input.open || !input.leagueHour || input.rank === null || input.weeklyXp <= 0) return null;
  if (input.localHour < DECENT_HOURS.from || input.localHour > DECENT_HOURS.to) return null;
  return { kind: "league", rank: input.rank, hoursLeft: Math.max(1, input.hoursLeft) };
}

/** One a day: the league reminder (rarer, time-boxed) wins over the streak one. */
export function pickReminder(league: Reminder | null, streak: Reminder | null): Reminder | null {
  return league ?? streak;
}
