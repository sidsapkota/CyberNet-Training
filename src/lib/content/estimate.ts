import type { LessonOutline } from "./schema";

/**
 * Conservative time per card, used for "about X min" estimates. Most cards take 20 to 40 seconds;
 * 45 leaves room for reading explanations and retries, so estimates err on the long side.
 */
export const SECONDS_PER_CARD = 45;

/**
 * Whole minutes for a lesson's core cards, rounded, never less than 1. Bonus cards are optional, so
 * they're counted apart, and photos (a quick look) aren't counted. Quizzes are all core.
 */
export function estimateMinutes(lesson: Pick<LessonOutline, "coreCardIds" | "photoCount">): number {
  const cards = lesson.coreCardIds.length - lesson.photoCount;
  return Math.max(1, Math.round((cards * SECONDS_PER_CARD) / 60));
}

/** How many optional bonus (challenge) cards a lesson has. */
export function bonusCards(lesson: Pick<LessonOutline, "cardCount" | "coreCardIds">): number {
  return lesson.cardCount - lesson.coreCardIds.length;
}

/** "about 4 min" or "about 4 min + 2 bonus cards". */
export function timeLine(lesson: Pick<LessonOutline, "cardCount" | "coreCardIds" | "photoCount">): string {
  const bonus = bonusCards(lesson);
  return `about ${estimateMinutes(lesson)} min${bonus > 0 ? ` + ${bonus} bonus ${bonus === 1 ? "card" : "cards"}` : ""}`;
}
