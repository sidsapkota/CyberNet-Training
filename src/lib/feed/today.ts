import { byteXp, DAILY_BYTES, FEED_LESSON_ID, feedXpOn } from "./rules";

/**
 * Today's bytes (the Feed is finite: DAILY_BYTES a day). Pure rules, tested in feed.test.ts, plus a
 * small per-device record so a reload shows the same three and remembers which were answered (wrong
 * answers aren't stored anywhere else).
 */

type LedgerEvent = { day: string; lessonId: string; cardId?: string | null; xp: number };

/** Bytes answered right (and paid) on `day`, from the XP ledger. */
export function feedBytesOn(events: readonly LedgerEvent[], day: string): string[] {
  return events.filter((e) => e.day === day && e.lessonId === FEED_LESSON_ID && e.cardId).map((e) => e.cardId!);
}

/** The XP a right answer on a new byte earns now: nothing once today's bytes are paid, else byteXp. */
export function byteXpToday(rare: boolean, events: readonly LedgerEvent[], day: string): number {
  if (feedBytesOn(events, day).length >= DAILY_BYTES) return 0;
  return byteXp(rare, feedXpOn(events, day));
}

/** What this device remembers about today's Feed. */
export interface FeedDay {
  day: string;
  /** "guest" or the user id: a different learner on the same device gets their own three. */
  who: string;
  ids: string[];
  /** Answered today, right or wrong. */
  answered: string[];
}

/**
 * Today's bytes: the saved three when the day and learner match and they all still exist, otherwise
 * the bytes already finished today (`doneToday`: the landing page's byte, or another device's) and
 * then the first of `ordered`, DAILY_BYTES in all.
 */
export function pickToday<B extends { id: string }>(
  ordered: readonly B[],
  saved: FeedDay | null,
  day: string,
  who: string,
  doneToday: readonly string[] = [],
): { bytes: B[]; record: FeedDay } {
  const byId = new Map(ordered.map((b) => [b.id, b]));
  const same = saved && saved.day === day && saved.who === who && saved.ids.length > 0 && saved.ids.every((id) => byId.has(id));
  const first = doneToday.flatMap((id) => byId.get(id) ?? []);
  const bytes = same ? saved.ids.map((id) => byId.get(id)!) : [...first, ...ordered.filter((b) => !first.includes(b))].slice(0, DAILY_BYTES);
  return { bytes, record: same ? saved : { day, who, ids: bytes.map((b) => b.id), answered: [] } };
}

/** How many of today's bytes are left: answered on this device, or paid today (on any device). */
export function bytesLeft(saved: FeedDay | null, rightToday: readonly string[], day: string, who: string): number {
  const played = new Set(rightToday);
  if (saved && saved.day === day && saved.who === who) for (const id of saved.answered) played.add(id);
  return Math.max(0, DAILY_BYTES - played.size);
}

const KEY = "cybernet.feed.today";

export function readFeedDay(): FeedDay | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null") as FeedDay | null;
    return value && typeof value.day === "string" && Array.isArray(value.ids) && Array.isArray(value.answered) ? value : null;
  } catch {
    return null;
  }
}

export function writeFeedDay(value: FeedDay): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // storage blocked: today's three are worked out again from the seed, nothing else lost
  }
}
