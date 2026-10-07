/**
 * The Feed (docs/plans/feed.md), as pure rules (tested): XP and its daily cap, the guest limit, the
 * break card, the order bytes come in, and session-length buckets for analytics.
 */

/** The byte new visitors play on the landing page (it has a picture). */
export const HERO_BYTE = "red-ball";

/** Byte XP rides on the normal card ledger under this lesson id (card id = byte id). */
export const FEED_LESSON_ID = "feed";
export const BYTE_XP = 5;
export const RARE_BYTE_XP = 15;
/** Feed XP a day, at most, so it can't be farmed. Lessons still earn XP after it. */
export const FEED_DAILY_CAP = 50;
/** Guests play this many bytes, then the sign-up card. */
export const GUEST_BYTES = 5;
/** After this long in one session, a friendly "take a break?" card (once a session). */
export const BREAK_AFTER_MS = 15 * 60_000;

/** The XP a right answer on a new byte earns today, after the cap. */
export function byteXp(rare: boolean, earnedToday: number): number {
  return Math.max(0, Math.min(rare ? RARE_BYTE_XP : BYTE_XP, FEED_DAILY_CAP - earnedToday));
}

/** Feed XP already earned on `day` (from the XP ledger). */
export function feedXpOn(events: readonly { day: string; lessonId: string; xp: number }[], day: string): number {
  return events.filter((e) => e.day === day && e.lessonId === FEED_LESSON_ID).reduce((s, e) => s + e.xp, 0);
}

/** A small seeded generator (mulberry32): the same order for the same seed, never Math.random. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * The order bytes come in: a seeded shuffle (per learner per day), lightly weighted toward courses
 * they like (finished lessons in, or tapped "Go deeper" on): each byte draws a key `r^(1/w)` (weighted
 * random sampling), so a liked course comes up a bit earlier without crowding the rest out. Bytes
 * already answered right go to the end. Variety: never two bytes of the same course in a row when
 * another course is waiting.
 */
export function feedOrder<B extends { id: string; courseId: string }>(
  bytes: readonly B[],
  seed: number,
  courseWeight: (courseId: string) => number = () => 1,
  done: ReadonlySet<string> = new Set(),
): B[] {
  const random = seeded(seed);
  const keyed = bytes.map((b) => ({ b, key: random() ** (1 / Math.max(0.1, courseWeight(b.courseId))) }));
  const fresh = keyed.filter((k) => !done.has(k.b.id)).sort((x, y) => y.key - x.key).map((k) => k.b);
  const seen = keyed.filter((k) => done.has(k.b.id)).sort((x, y) => y.key - x.key).map((k) => k.b);
  return [...spread(fresh), ...spread(seen)];
}

function spread<B extends { courseId: string }>(list: B[]): B[] {
  const out: B[] = [];
  const left = [...list];
  while (left.length) {
    const last = out.at(-1)?.courseId;
    const i = left.findIndex((b) => b.courseId !== last);
    out.push(left.splice(i === -1 ? 0 : i, 1)[0]!);
  }
  return out;
}

/** Courses a learner likes: 1 for none, up to 2 with finished lessons and "Go deeper" taps. */
export function courseWeights(finishedByCourse: Readonly<Record<string, number>>, deeperByCourse: Readonly<Record<string, number>>): (courseId: string) => number {
  return (courseId) => 1 + Math.min(1, ((finishedByCourse[courseId] ?? 0) + 2 * (deeperByCourse[courseId] ?? 0)) / 6);
}

/** `feed_session_length` buckets (analytics properties are short words, never numbers). */
export function sessionBucket(ms: number): string {
  if (ms < 60_000) return "under-1m";
  if (ms < 5 * 60_000) return "1-5m";
  if (ms < 15 * 60_000) return "5-15m";
  return "15m-plus";
}
