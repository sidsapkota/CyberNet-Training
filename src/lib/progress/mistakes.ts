/**
 * Mistake review: which cards count as a learner's mistakes. Pure. The server uses these before it
 * writes or reads `card_mistakes`, so nothing is recorded or shown for a lesson or card that isn't
 * in the loaded content, a card that can't be graded, or an answer that was actually right.
 */
import { gradeUntrusted } from "@/cards/grading";
import { type InteractiveCard, isInteractiveCard } from "@/cards/schema";
import type { ContentIndex } from "./authority";
import type { QuizAttempt } from "./types";

export interface MistakeKey {
  lessonId: string;
  cardId: string;
}

/** The graded card at this lesson and card id, or null when either isn't in the content. */
export function gradedCard(index: ContentIndex, lessonId: string, cardId: string): InteractiveCard | null {
  const card = index.get(lessonId)?.cards.get(cardId);
  return card && isInteractiveCard(card) ? card : null;
}

/**
 * A wrong answer on a regular lesson's card: the key to record, or null when the lesson or card
 * isn't in the content, the card isn't graded, it's a quiz (quiz mistakes come from server-graded
 * attempts instead), or the answer is in fact right.
 */
export function lessonMistake(index: ContentIndex, lessonId: string, cardId: string, answer: unknown): MistakeKey | null {
  if (index.get(lessonId)?.kind !== "lesson") return null;
  const card = gradedCard(index, lessonId, cardId);
  if (!card || gradeUntrusted(card, answer)) return null;
  return { lessonId, cardId };
}

/** The wrong answers in a quiz attempt the server has graded, for cards still in that quiz. */
export function quizMistakes(index: ContentIndex, quizId: string, attempt: Pick<QuizAttempt, "answers">): MistakeKey[] {
  if (index.get(quizId)?.kind !== "quiz") return [];
  return attempt.answers.filter((a) => !a.correct && gradedCard(index, quizId, a.cardId)).map((a) => ({ lessonId: quizId, cardId: a.cardId }));
}

/** Stored mistakes that are still in the content (a card removed since is quietly left out). */
export function reviewableMistakes<T extends { lesson_id: string; card_id: string }>(index: ContentIndex, rows: readonly T[]): T[] {
  return rows.filter((r) => gradedCard(index, r.lesson_id, r.card_id));
}

/** Re-grades a review answer: true when right, false when wrong, null for an unknown card. */
export function reviewAnswerCorrect(index: ContentIndex, lessonId: string, cardId: string, answer: unknown): boolean | null {
  const card = gradedCard(index, lessonId, cardId);
  return card ? gradeUntrusted(card, answer) : null;
}

/** The most mistakes one review sends at a time (newest first). */
export const REVIEW_BATCH = 30;
