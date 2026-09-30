import { plainText } from "../shared/text";
import { seededShuffle } from "../shared/shuffle";
import type { GradeResult } from "../types";
import type { MatchPairsAnswer, MatchPairsCard } from "./schema";

/** Right-hand column order: shuffled per card, never lined up with the left column. */
export function rightColumnOrder(card: MatchPairsCard): string[] {
  return seededShuffle(
    card.pairs.map((p) => p.id),
    `${card.id}:right`,
  );
}

/**
 * Connects `leftId` to `rightId`, removing any other connection either one had.
 * Returns a new answer object (pure).
 */
export function connect(answer: MatchPairsAnswer, leftId: string, rightId: string): MatchPairsAnswer {
  const next: MatchPairsAnswer = {};
  for (const [l, r] of Object.entries(answer)) {
    if (l !== leftId && r !== rightId) next[l] = r;
  }
  next[leftId] = rightId;
  return next;
}

export function disconnect(answer: MatchPairsAnswer, leftId: string): MatchPairsAnswer {
  const next = { ...answer };
  delete next[leftId];
  return next;
}

export interface PairResult {
  leftId: string;
  rightId: string | null;
  correct: boolean;
}

/** Per-connection results, in left-column order. Used to show which pairs were wrong. */
export function pairResults(card: MatchPairsCard, answer: MatchPairsAnswer): PairResult[] {
  return card.pairs.map((p) => {
    const rightId = answer[p.id] ?? null;
    return { leftId: p.id, rightId, correct: rightId === p.id };
  });
}

export function isMatchPairsReady(answer: MatchPairsAnswer, card: MatchPairsCard): boolean {
  return card.pairs.every((p) => typeof answer[p.id] === "string");
}

export function gradeMatchPairs(card: MatchPairsCard, answer: MatchPairsAnswer): GradeResult {
  return { correct: pairResults(card, answer).every((r) => r.correct) };
}

export function describeMatchPairsAnswer(card: MatchPairsCard, answer: MatchPairsAnswer): string {
  const rightText = new Map(card.pairs.map((p) => [p.id, plainText(p.right)]));
  return card.pairs
    .map((p) => {
      const r = answer[p.id];
      return `${plainText(p.left)} → ${r ? (rightText.get(r) ?? "?") : "(no match)"}`;
    })
    .join("; ");
}

export function describeMatchPairsCorrect(card: MatchPairsCard): string {
  return card.pairs.map((p) => `${plainText(p.left)} → ${plainText(p.right)}`).join("; ");
}
