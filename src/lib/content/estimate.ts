import type { LessonOutline } from "./schema";

/**
 * Conservative time per card, used for "about X min" estimates. Most cards take 20 to 40 seconds;
 * 45 leaves room for reading explanations and retries, so estimates err on the long side.
 */
export const SECONDS_PER_CARD = 45;

/** Whole minutes to finish a lesson or quiz, rounded, never less than 1. */
export function estimateMinutes(lesson: Pick<LessonOutline, "cardCount">): number {
  return Math.max(1, Math.round((lesson.cardCount * SECONDS_PER_CARD) / 60));
}
