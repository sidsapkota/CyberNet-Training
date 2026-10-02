import type { Card } from "@/cards/schema";
import type { LessonOutline } from "./schema";

/**
 * How long each kind of card takes, in seconds (honest, a little on the long side, including
 * reading the explanation). "Learn before you do" lessons have many quick cards, so lessons are
 * measured in time, not card counts: about 3–5 minutes of core cards.
 */
export const SECONDS_BY_TYPE: Record<Card["type"], number> = {
  explainer: 15,
  photo: 0, // a quick look; not counted
  reveal: 8,
  true_false: 8,
  fill_gap: 12,
  multiple_choice: 20,
  numeric_input: 25,
  drag_to_order: 25,
  binary_toggle: 30,
  sort_bins: 30,
  match_pairs: 30,
  next_word: 30,
  scenario: 35,
  hotspot: 40,
  packet_path: 45,
  teardown: 50,
  simulator: 50,
  terminal: 50,
  train_model: 50,
};

/** Seconds for one card (an explore hotspot is a little quicker than a test). */
export function cardSeconds(card: Card): number {
  if (card.type === "hotspot" && card.mode === "explore") return 30;
  return SECONDS_BY_TYPE[card.type];
}

/** The old flat estimate, for outlines made before `coreSeconds` existed. */
export const SECONDS_PER_CARD = 45;

/**
 * Whole minutes for a lesson's core cards, rounded, never less than 1. Bonus cards are optional, so
 * they're counted apart, and photos (a quick look) aren't counted. Quizzes are all core.
 */
export function estimateMinutes(lesson: Pick<LessonOutline, "coreCardIds" | "photoCount"> & { coreSeconds?: number }): number {
  const seconds = lesson.coreSeconds ?? (lesson.coreCardIds.length - lesson.photoCount) * SECONDS_PER_CARD;
  return Math.max(1, Math.round(seconds / 60));
}

/** How many optional bonus (challenge) cards a lesson has. */
export function bonusCards(lesson: Pick<LessonOutline, "cardCount" | "coreCardIds">): number {
  return lesson.cardCount - lesson.coreCardIds.length;
}

/** "about 4 min" or "about 4 min + 2 bonus cards". */
export function timeLine(lesson: Pick<LessonOutline, "cardCount" | "coreCardIds" | "photoCount"> & { coreSeconds?: number }): string {
  const bonus = bonusCards(lesson);
  return `about ${estimateMinutes(lesson)} min${bonus > 0 ? ` + ${bonus} bonus ${bonus === 1 ? "card" : "cards"}` : ""}`;
}
