import { seededShuffle } from "../shared/shuffle";
import type { GradeResult } from "../types";
import { type MultipleChoiceAnswer, type MultipleChoiceCard, NOT_SURE } from "./schema";

/**
 * The order options are shown in: a stable shuffle per card, so the right answer's position (often
 * first, as written) never gives it away, and it's the same every time the card is shown. Grading
 * only ever compares option ids, so the order can't change a score.
 */
export function displayOptions(card: MultipleChoiceCard): MultipleChoiceCard["options"] {
  const shuffled = seededShuffle(card.options, `${card.id}:options`);
  // A Predict card (Lesson Blueprint v1.1) always ends with "Not sure", never shuffled in.
  return card.predict ? [...shuffled, { id: NOT_SURE, text: "Not sure" }] : shuffled;
}

export function gradeMultipleChoice(
  card: MultipleChoiceCard,
  answer: MultipleChoiceAnswer,
): GradeResult {
  return { correct: answer !== null && answer === card.correctOptionId };
}

export function describeMultipleChoiceAnswer(
  card: MultipleChoiceCard,
  answer: MultipleChoiceAnswer,
): string {
  if (answer === NOT_SURE) return "Not sure";
  return card.options.find((o) => o.id === answer)?.text ?? "No answer";
}

export function describeMultipleChoiceCorrect(card: MultipleChoiceCard): string {
  return describeMultipleChoiceAnswer(card, card.correctOptionId);
}
