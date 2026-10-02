import { seededShuffle } from "../shared/shuffle";
import type { GradeResult } from "../types";
import { type FillGapAnswer, type FillGapCard, GAP } from "./schema";

/** The words in a stable shuffle per card, so the right one's written position gives nothing away. */
export function gapOptions(card: FillGapCard): FillGapCard["options"] {
  return seededShuffle(card.options, `${card.id}:gap`);
}

export function gradeFillGap(card: FillGapCard, answer: FillGapAnswer): GradeResult {
  return { correct: answer === card.correctOptionId };
}

/** The sentence with a word in the gap (or a blank). Pure. */
export function filled(card: FillGapCard, optionId: string | null | undefined): string {
  const word = card.options.find((o) => o.id === optionId)?.text ?? "____";
  return card.prompt.replace(GAP, word);
}

export function describeFillGapAnswer(card: FillGapCard, answer: FillGapAnswer): string {
  return answer ? filled(card, answer) : "No word chosen";
}

export function describeFillGapCorrect(card: FillGapCard): string {
  return filled(card, card.correctOptionId);
}
