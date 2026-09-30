import type { GradeResult } from "../types";
import type { MultipleChoiceAnswer, MultipleChoiceCard } from "./schema";

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
  return card.options.find((o) => o.id === answer)?.text ?? "No answer";
}

export function describeMultipleChoiceCorrect(card: MultipleChoiceCard): string {
  return describeMultipleChoiceAnswer(card, card.correctOptionId);
}
