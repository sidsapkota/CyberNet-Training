/**
 * Daily goals: the XP ledger, local days and time zones. Pure (pass `now` and the time zone in),
 * shared by both progress stores, the Server Actions and the dashboard.
 *
 * - Every XP-earning moment is an **XP event**, dated with the learner's local day *when it
 *   happens*. Old events are never re-dated, so travelling can't rewrite history.
 * - Days never go backwards: an event is dated no earlier than the latest event already recorded
 *   (flying west can't create a second copy of a day).
 * - A day's goal is met once that day's XP reaches the goal. Met days are recorded with the goal
 *   and time zone at that moment; streaks are calculated from them (streak.ts).
 * - **Practice XP** (replaying a card already finished) counts toward the daily goal only, never
 *   toward total XP: the retry amount, once per card per day.
 */
import type { DailyGoalDay, ProgressSnapshot, XpEvent, XpEventKind } from "./types";

export const DAILY_GOALS = [
  { xp: 20, label: "Casual" },
  { xp: 50, label: "Regular" },
  { xp: 100, label: "Serious" },
] as const;
export type DailyGoal = (typeof DAILY_GOALS)[number]["xp"];
export const DEFAULT_DAILY_GOAL: DailyGoal = 50;
export const DAILY_GOAL_VALUES: readonly number[] = DAILY_GOALS.map((g) => g.xp);

export function isDailyGoal(value: unknown): value is DailyGoal {
  return typeof value === "number" && DAILY_GOAL_VALUES.includes(value);
}

export function dailyGoalLabel(goal: number): string {
  return DAILY_GOALS.find((g) => g.xp === goal)?.label ?? "Custom";
}

/** Guests keep at most this many events in the browser (oldest dropped); the merge caps uploads too. */
export const MAX_LOCAL_XP_EVENTS = 5000;

// ── Time zones and local days ────────────────────────────────────────────────

export const FALLBACK_TIME_ZONE = "UTC";

/** True for an IANA time zone name this runtime knows (e.g. "Australia/Sydney"). */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function safeTimeZone(tz: unknown): string {
  return isValidTimeZone(tz) ? tz : FALLBACK_TIME_ZONE;
}

/** The browser's time zone (client only). */
export function browserTimeZone(): string {
  try {
    return safeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(tz, f);
  }
  return f;
}

function wallClock(ms: number, tz: string) {
  const parts: Record<string, number> = {};
  for (const p of formatter(tz).formatToParts(ms)) if (p.type !== "literal") parts[p.type] = Number(p.value);
  return parts as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** "YYYY-MM-DD" for a moment in a time zone. */
export function localDay(at: Date | number, tz: string): string {
  const w = wallClock(typeof at === "number" ? at : at.getTime(), tz);
  return `${pad(w.year, 4)}-${pad(w.month)}-${pad(w.day)}`;
}

function dayParts(day: string): [number, number, number] {
  const [y, m, d] = day.split("-").map(Number);
  return [y ?? 1970, m ?? 1, d ?? 1];
}

/** Calendar arithmetic on "YYYY-MM-DD" (no time zones involved, so DST can't affect it). */
export function addDays(day: string, n: number): string {
  const [y, m, d] = dayParts(day);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Whole calendar days from `a` to `b` (b − a). */
export function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = dayParts(a);
  const [by, bm, bd] = dayParts(b);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** The UTC instant (ms) when `day` begins in `tz`: local midnight, or the first moment after it. */
export function dayStart(day: string, tz: string): number {
  const [y, m, d] = dayParts(day);
  const wallMidnight = Date.UTC(y, m - 1, d);
  const offsetAt = (ms: number) => {
    const w = wallClock(ms, tz);
    return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - Math.floor(ms / 1000) * 1000;
  };
  let t = wallMidnight - offsetAt(wallMidnight);
  t = wallMidnight - offsetAt(t);
  // A DST jump at midnight can skip it; step to the first moment that is on `day`.
  if (localDay(t, tz) < day) t += 3_600_000;
  return t;
}

const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

// ── The ledger ───────────────────────────────────────────────────────────────

export interface Ledger {
  xpEvents: XpEvent[];
  goalDays: Record<string, DailyGoalDay>;
}

/** The latest day any event is dated (events are appended, but merges can mix the order). */
export function latestEventDay(events: readonly XpEvent[]): string | null {
  let latest: string | null = null;
  for (const e of events) if (latest === null || e.day > latest) latest = e.day;
  return latest;
}

/** Today's date for the learner: their local date, but never earlier than their latest event. */
export function currentDay(now: Date, tz: string, events: readonly XpEvent[]): string {
  const local = localDay(now, tz);
  const latest = latestEventDay(events);
  return latest !== null && latest > local ? latest : local;
}

export function dayXp(events: readonly XpEvent[], day: string): number {
  let total = 0;
  for (const e of events) if (e.day === day) total += e.xp;
  return total;
}

/**
 * League XP: every XP event except practice (replays pay toward today's goal only, never total XP,
 * so they never count toward a league either). Keeps weekly league XP within total XP.
 */
export function countsForLeague(e: Pick<XpEvent, "kind">): boolean {
  return e.kind !== "practice";
}

/**
 * The XP events that survive a reset. Resetting clears the XP earned by what was reset (all of it,
 * or one lesson's), so replaying it can't pay first-time XP twice into the same week. Met days
 * (goal_days) are separate and always kept, so the streak survives.
 */
export function eventsAfterReset(events: readonly XpEvent[], lessonId?: string): XpEvent[] {
  return lessonId === undefined ? [] : events.filter((e) => e.lessonId !== lessonId);
}

export function practicedOn(events: readonly XpEvent[], day: string, lessonId: string, cardId: string): boolean {
  return events.some((e) => e.kind === "practice" && e.day === day && e.lessonId === lessonId && e.cardId === cardId);
}

export interface XpInput {
  kind: XpEventKind;
  lessonId: string;
  cardId?: string;
  xp: number;
}

export interface XpResult {
  ledger: Ledger;
  /** The recorded event, or null if nothing was recorded (no XP, or practice already counted today). */
  event: XpEvent | null;
  /** The day whose goal this event met, if it was the one that crossed it. */
  goalMet: string | null;
}

/** Records the goal for `day` as met if its XP has reached `goal` (no-op if already met). */
export function checkGoal(ledger: Ledger, day: string, tz: string, goal: DailyGoal, now: Date): { ledger: Ledger; goalMet: string | null } {
  if (ledger.goalDays[day] || dayXp(ledger.xpEvents, day) < goal) return { ledger, goalMet: null };
  return {
    ledger: { ...ledger, goalDays: { ...ledger.goalDays, [day]: { tz, goal, metAt: now.toISOString() } } },
    goalMet: day,
  };
}

/**
 * Adds one XP event, dated for the learner right now, and records the day's goal if this event
 * crossed it. Events with no XP aren't recorded; practice counts once per card per day.
 */
export function addXpEvent(ledger: Ledger, input: XpInput, now: Date, tz: string, goal: DailyGoal): XpResult {
  const xp = Math.max(0, Math.floor(input.xp));
  if (xp === 0) return { ledger, event: null, goalMet: null };
  const day = currentDay(now, tz, ledger.xpEvents);
  if (input.kind === "practice" && input.cardId && practicedOn(ledger.xpEvents, day, input.lessonId, input.cardId)) {
    return { ledger, event: null, goalMet: null };
  }
  const event: XpEvent = {
    at: now.toISOString(),
    day,
    tz,
    kind: input.kind,
    lessonId: input.lessonId,
    ...(input.cardId ? { cardId: input.cardId } : {}),
    xp,
  };
  const withEvent = { ...ledger, xpEvents: [...ledger.xpEvents, event].slice(-MAX_LOCAL_XP_EVENTS) };
  const checked = checkGoal(withEvent, day, tz, goal, now);
  return { ledger: checked.ledger, event, goalMet: checked.goalMet };
}

export interface TodayProgress {
  day: string;
  xp: number;
  goal: number;
  met: boolean;
}

export function todayProgress(snapshot: Pick<ProgressSnapshot, "xpEvents" | "goalDays" | "preferences">, now: Date, tz: string): TodayProgress {
  const day = currentDay(now, tz, snapshot.xpEvents);
  const goal = snapshot.preferences.dailyGoal;
  return { day, xp: dayXp(snapshot.xpEvents, day), goal, met: Boolean(snapshot.goalDays[day]) };
}

// ── Checking events that come from elsewhere (the guest merge) ───────────────

/**
 * True if an event's stored day is believable for its time: its local day in its own time zone,
 * or up to one day later (dates never go backwards, so travel can push one forward). Never in the
 * future beyond a small clock allowance.
 */
export function plausibleEvent(e: XpEvent, now: Date): boolean {
  const at = Date.parse(e.at);
  if (Number.isNaN(at) || at > now.getTime() + 5 * 60_000) return false;
  if (!isValidTimeZone(e.tz) || !isDay(e.day)) return false;
  const local = localDay(at, e.tz);
  const shift = dayDiff(local, e.day);
  return shift >= 0 && shift <= 1;
}
