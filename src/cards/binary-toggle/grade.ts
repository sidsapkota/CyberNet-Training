import type { GradeResult } from "../types";
import { BIT_COUNT, bitsToDecimal, decimalToBits, formatBits } from "./binary";
import type { BinaryToggleAnswer, BinaryToggleCard } from "./schema";

export function gradeBinaryToggle(card: BinaryToggleCard, answer: BinaryToggleAnswer): GradeResult {
  return { correct: answer.length === BIT_COUNT && bitsToDecimal(answer) === card.target };
}

export function describeBinaryToggleAnswer(_card: BinaryToggleCard, answer: BinaryToggleAnswer): string {
  return `${formatBits(answer)} (${bitsToDecimal(answer)})`;
}

export function describeBinaryToggleCorrect(card: BinaryToggleCard): string {
  return `${formatBits(decimalToBits(card.target))} (${card.target})`;
}
