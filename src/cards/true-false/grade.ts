import type { GradeResult } from "../types";
import type { TrueFalseAnswer, TrueFalseCard } from "./schema";

export function gradeTrueFalse(card: TrueFalseCard, answer: TrueFalseAnswer): GradeResult {
  return { correct: typeof answer === "boolean" && answer === card.answer };
}

const word = (b: boolean | null | undefined) => (b === true ? "True" : b === false ? "False" : "No answer");

export function describeTrueFalseAnswer(_card: TrueFalseCard, answer: TrueFalseAnswer): string {
  return word(answer);
}

export function describeTrueFalseCorrect(card: TrueFalseCard): string {
  return word(card.answer);
}
