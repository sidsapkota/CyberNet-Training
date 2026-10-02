import type { InteractiveCard } from "./schema";

/**
 * The nudge to show after a wrong attempt: the picked option's own nudge (multiple choice), else
 * the card's. Undefined means the player falls back to a generic "have another go". Pure.
 */
export function nudgeFor(card: InteractiveCard, answer: unknown): string | undefined {
  if (card.type === "multiple_choice" || card.type === "fill_gap") {
    const picked = card.options.find((o) => o.id === answer);
    if (picked?.nudge) return picked.nudge;
  }
  return card.nudge;
}
