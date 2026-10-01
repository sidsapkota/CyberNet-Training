/**
 * First-time "how to play" panels. Each interaction style gets one short demo the first time a
 * learner meets it; which ones they've seen is saved in `preferences.coachSeen` (synced like the
 * other preferences). Pure, so it's unit-tested.
 */
import type { Card } from "@/cards/schema";

export const COACH_KEYS = [
  "numeric_input",
  "binary_toggle",
  "drag_to_order",
  "match_pairs",
  "packet_path",
  "terminal",
  "hotspot-explore",
  "hotspot-tap",
  "hotspot-label",
  "teardown",
  "simulator",
  "scenario",
  "sort_bins",
  "train_model",
  "next_word",
] as const;
export type CoachKey = (typeof COACH_KEYS)[number];

const KNOWN = new Set<string>(COACH_KEYS);
export const isCoachKey = (key: string): key is CoachKey => KNOWN.has(key);

/** The coach panel a card needs, or null (explainers and multiple choice explain themselves). */
export function coachKeyFor(card: Card): CoachKey | null {
  if (card.type === "hotspot") return `hotspot-${card.mode}`;
  return isCoachKey(card.type) ? card.type : null;
}

/** Show the panel if this card has one and the learner hasn't dismissed it before. */
export function shouldShowCoach(seen: readonly string[] | undefined, card: Card): CoachKey | null {
  const key = coachKeyFor(card);
  return key && !(seen ?? []).includes(key) ? key : null;
}

/** Records a dismissed panel: known keys only, no duplicates, stable order. */
export function markCoachSeen(seen: readonly string[] | undefined, key: CoachKey): CoachKey[] {
  return cleanCoachSeen([...(seen ?? []), key]);
}

/** Drops unknown or repeated keys (e.g. from an older app version or a tampered client). */
export function cleanCoachSeen(seen: readonly unknown[] | null | undefined): CoachKey[] {
  const out: CoachKey[] = [];
  for (const k of seen ?? []) if (typeof k === "string" && isCoachKey(k) && !out.includes(k)) out.push(k);
  return out;
}

/**
 * A newcomer's very first card skips the how-to-play panel: on a phone the panel would fill the
 * first screen and push the card itself out of sight. That card's own prompt says what to do in
 * one line instead, and the panel shows the next time that kind of card comes up.
 */
export function coachAllowedOn(cardIndex: number, newcomer: boolean): boolean {
  return !(newcomer && cardIndex === 0);
}
