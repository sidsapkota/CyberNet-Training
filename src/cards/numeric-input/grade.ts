import type { GradeResult } from "../types";
import type { NumericBase, NumericInputAnswer, NumericInputCard } from "./schema";

export type ParsedNumber =
  | { status: "empty" }
  | { status: "invalid"; message: string }
  | { status: "ok"; value: number };

const BASE_INFO: Record<Exclude<NumericBase, "decimal">, { prefix: string; radix: number; digits: RegExp; message: (ch: string) => string }> = {
  binary: {
    prefix: "0b",
    radix: 2,
    digits: /^[01]$/,
    message: (ch) => `"${ch}" isn't a binary digit: binary only uses 0 and 1.`,
  },
  hex: {
    prefix: "0x",
    radix: 16,
    digits: /^[0-9a-f]$/,
    message: (ch) => `"${ch}" isn't a hex digit: hex uses 0–9 and A–F.`,
  },
};

/**
 * Parses what the learner typed. Pure.
 * - Spaces and underscores are ignored everywhere (so "1010 1010" works).
 * - Binary accepts an optional 0b prefix; hex an optional 0x prefix, any letter case.
 * - Decimal accepts a sign, a decimal point and thousands commas ("1,024").
 * Invalid input returns a friendly message instead of a value; it is never graded.
 */
export function parseNumericInput(raw: string, base: NumericBase): ParsedNumber {
  const compact = raw.replace(/[\s_]/g, "");
  if (compact === "") return { status: "empty" };

  if (base === "decimal") {
    const cleaned = compact.replace(/,/g, "");
    if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(cleaned)) {
      const bad = [...cleaned].find((ch, i) => !/[\d.]/.test(ch) && !(i === 0 && /[+-]/.test(ch)));
      return {
        status: "invalid",
        message: bad
          ? `"${bad}" isn't part of a number. Use the digits 0–9 (and a . for decimals).`
          : "That isn't a number yet. Try something like 42 or 3.5.",
      };
    }
    return { status: "ok", value: Number(cleaned) };
  }

  const info = BASE_INFO[base];
  let digits = compact.toLowerCase();
  if (digits.startsWith(info.prefix)) digits = digits.slice(info.prefix.length);
  if (digits === "") {
    return { status: "invalid", message: `Add some digits after ${info.prefix}.` };
  }
  const bad = [...digits].find((ch) => !info.digits.test(ch));
  if (bad !== undefined) return { status: "invalid", message: info.message(bad) };

  const value = Number.parseInt(digits, info.radix);
  if (!Number.isSafeInteger(value)) {
    return { status: "invalid", message: "That number is too long to check. Try a shorter one." };
  }
  return { status: "ok", value };
}

export function acceptedAnswers(card: NumericInputCard): number[] {
  return Array.isArray(card.answer) ? card.answer : [card.answer];
}

/** A value written in the card's base, e.g. 42 → "101010" (binary) or "2A" (hex). */
export function formatInBase(value: number, base: NumericBase): string {
  if (base === "binary") return value.toString(2);
  if (base === "hex") return value.toString(16).toUpperCase();
  return value.toLocaleString("en-US", { maximumFractionDigits: 10 });
}

function withUnit(text: string, card: NumericInputCard) {
  return card.unit ? `${text} ${card.unit}` : text;
}

function describeValue(value: number, card: NumericInputCard): string {
  if (card.base === "decimal") return withUnit(formatInBase(value, "decimal"), card);
  return withUnit(`${formatInBase(value, card.base)} (${value})`, card);
}

export function isNumericAnswerReady(answer: NumericInputAnswer, card: NumericInputCard): boolean {
  return parseNumericInput(answer, card.base).status === "ok";
}

export function gradeNumericInput(card: NumericInputCard, answer: NumericInputAnswer): GradeResult {
  const parsed = parseNumericInput(answer, card.base);
  if (parsed.status !== "ok") return { correct: false };
  return { correct: acceptedAnswers(card).some((n) => Math.abs(n - parsed.value) < 1e-9) };
}

export function describeNumericAnswer(card: NumericInputCard, answer: NumericInputAnswer): string {
  const parsed = parseNumericInput(answer, card.base);
  if (parsed.status === "empty") return "No answer";
  if (parsed.status === "invalid") return answer.trim();
  return describeValue(parsed.value, card);
}

export function describeNumericCorrect(card: NumericInputCard): string {
  return acceptedAnswers(card)
    .map((n) => describeValue(n, card))
    .join(" or ");
}
