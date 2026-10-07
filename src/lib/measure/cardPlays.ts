/**
 * Card measurements (content quality pass): per graded card, time to the first Check and whether the
 * first answer was right. Anonymous by design: no user, session or device id. Pure helpers (tested);
 * the browser sends with `sendCardPlay`, the server checks and stores (src/lib/measure/server.ts).
 */
import { z } from "zod";

/** Longer than this is someone who walked away: the play is still stored, capped. */
export const MAX_MS = 3_600_000;

export const CardPlaySchema = z.object({
  lessonId: z.string().regex(/^[a-z0-9-]{1,120}$/),
  cardId: z.string().regex(/^[a-z0-9-]{1,120}$/),
  ms: z.number().int().min(0),
  firstTry: z.boolean(),
  quiz: z.boolean().optional(),
});
export type CardPlay = z.infer<typeof CardPlaySchema>;

export function cappedMs(ms: number): number {
  return Math.max(0, Math.min(MAX_MS, Math.round(ms)));
}

/** Fire and forget from the browser: never blocks or breaks the lesson. */
export function sendCardPlay(play: CardPlay): void {
  try {
    const body = JSON.stringify({ ...play, ms: cappedMs(play.ms) });
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/card-plays", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/card-plays", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch {
    // Measuring is a nicety; the lesson carries on.
  }
}

const started = new Map<string, number>();

/** The card has appeared (call from an effect). */
export function startCardTimer(lessonId: string, cardId: string): void {
  if (typeof performance !== "undefined") started.set(`${lessonId}/${cardId}`, performance.now());
}

/** Its first Check: sends the time since it appeared, and whether the answer was right. */
export function measureFirstCheck(lessonId: string, cardId: string, firstTry: boolean, quiz = false): void {
  const at = started.get(`${lessonId}/${cardId}`);
  sendCardPlay({ lessonId, cardId, firstTry, quiz, ms: at === undefined || typeof performance === "undefined" ? 0 : performance.now() - at });
}

export interface CardStat {
  lessonId: string;
  cardId: string;
  plays: number;
  /** Median time to the first Check, in seconds. */
  medianSeconds: number;
  /** Share right on the first try, 0 to 1. */
  firstTryRate: number;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
};

/** Per-card stats from raw plays, keeping cards with at least `minPlays` plays. */
export function cardStats(plays: readonly { lesson_id: string; card_id: string; ms: number; first_try: boolean }[], minPlays = 5): CardStat[] {
  const by = new Map<string, { lessonId: string; cardId: string; ms: number[]; right: number }>();
  for (const p of plays) {
    const key = `${p.lesson_id}/${p.card_id}`;
    const entry = by.get(key) ?? { lessonId: p.lesson_id, cardId: p.card_id, ms: [], right: 0 };
    entry.ms.push(p.ms);
    if (p.first_try) entry.right++;
    by.set(key, entry);
  }
  return [...by.values()]
    .filter((e) => e.ms.length >= minPlays)
    .map((e) => ({ lessonId: e.lessonId, cardId: e.cardId, plays: e.ms.length, medianSeconds: Math.round(median(e.ms) / 100) / 10, firstTryRate: e.right / e.ms.length }));
}

export const slowest = (stats: readonly CardStat[], n = 10) => [...stats].sort((a, b) => b.medianSeconds - a.medianSeconds).slice(0, n);
export const mostFailed = (stats: readonly CardStat[], n = 10) => [...stats].sort((a, b) => a.firstTryRate - b.firstTryRate || b.plays - a.plays).slice(0, n);
