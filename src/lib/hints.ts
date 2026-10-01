/**
 * When the "Hint" button shows, and what using it costs. Pure, so the rules are unit-tested:
 * - lessons only: quizzes never show hints (one try, no help)
 * - only on graded cards that have a hint, and only until the card is answered correctly
 * - using it pays the retry XP; the note says so up front, unless the card pays nothing anyway
 */
import { isInteractiveCard, type Card } from "@/cards/schema";
import type { CardStatus } from "@/cards/types";
import { XP } from "@/lib/progress/xp";

export type PlayerMode = "lesson" | "quiz";

export function visibleHint(card: Card, mode: PlayerMode, status: CardStatus): string | null {
  if (mode !== "lesson" || !isInteractiveCard(card) || !card.hint) return null;
  return status === "correct" ? null : card.hint;
}

/** "costs 5 XP" (what using the hint takes off), or undefined when the card has already paid its XP. */
export function hintCost(card: Card, alreadyCompleted: boolean): string | undefined {
  if (alreadyCompleted) return undefined;
  const table = XP.card[card.difficulty];
  return `costs ${table.firstTry - table.retry} XP`;
}

