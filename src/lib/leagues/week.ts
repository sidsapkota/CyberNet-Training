/**
 * The league week: Monday 00:00 to the next Monday 00:00 in Australia/Sydney. The same rule as
 * the database's `league_week()`, so the server, the UI and the tests agree. Daylight saving moves
 * the instant (UTC+10 or +11) but never the Monday.
 */
import { addDays, dayStart, localDay } from "@/lib/progress/daily";
import { LEAGUE_TIME_ZONE } from "./config";

/** The week's key: the Sydney date ("YYYY-MM-DD") of the Monday it starts on. */
export function leagueWeek(at: Date | number): string {
  const day = localDay(at, LEAGUE_TIME_ZONE);
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const isoDow = new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7; // Monday 1 … Sunday 7
  return addDays(day, 1 - isoDow);
}

/** When a week starts and ends (epoch ms; the end is the next week's start). */
export function weekWindow(week: string): { starts: number; ends: number } {
  return { starts: dayStart(week, LEAGUE_TIME_ZONE), ends: dayStart(addDays(week, 7), LEAGUE_TIME_ZONE) };
}

export const previousWeek = (week: string): string => addDays(week, -7);
export const nextWeek = (week: string): string => addDays(week, 7);

/** "2d 5h", "5h 12m" or "12m": time left in the week, for the countdown. */
export function timeLeft(now: number, week: string): string {
  const ms = Math.max(0, weekWindow(week).ends - now);
  const mins = Math.floor(ms / 60_000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** The reset moment in the learner's own time zone, e.g. "Monday 12:00 am" or "Sunday 2:00 pm". */
export function resetInZone(week: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-AU", { weekday: "long", hour: "numeric", minute: "2-digit", timeZone })
    .format(new Date(weekWindow(week).ends))
    .replace(",", "");
}
