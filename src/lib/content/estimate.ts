import type { LessonOutline } from "./schema";

/**
 * Conservative time per card, used for "about X min" estimates. Most cards take 20 to 40 seconds;
 * 45 leaves room for reading explanations and retries, so estimates err on the long side.
 */
export const SECONDS_PER_CARD = 45;

/**
 * Whole minutes for a lesson's core cards (bonus cards are optional, so they're counted apart),
 * rounded, never less than 1. Quizzes are all core.
 */
export function estimateMinutes(lesson: Pick<LessonOutline, "coreCardIds">): number {
  return Math.max(1, Math.round((lesson.coreCardIds.length * SECONDS_PER_CARD) / 60));
}

/** How many optional bonus (challenge) cards a lesson has. */
export function bonusCards(lesson: Pick<LessonOutline, "cardCount" | "coreCardIds">): number {
  return lesson.cardCount - lesson.coreCardIds.length;
}

/** "about 4 min" or "about 4 min + 2 bonus cards". */
export function timeLine(lesson: Pick<LessonOutline, "cardCount" | "coreCardIds">): string {
  const bonus = bonusCards(lesson);
  return `about ${estimateMinutes(lesson)} min${bonus > 0 ? ` + ${bonus} bonus ${bonus === 1 ? "card" : "cards"}` : ""}`;
}
