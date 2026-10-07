/**
 * The right answer for a byte's card, for the "export as video" view (the interaction plays itself).
 * Pure; tested against each card type's own grader, so it can't drift from the rules.
 */
import { decimalToBits } from "@/cards/binary-toggle/binary";
import type { InteractiveCard } from "@/cards/schema";

export function rightAnswer(card: InteractiveCard): unknown {
  switch (card.type) {
    case "multiple_choice":
    case "fill_gap":
      return card.correctOptionId;
    case "true_false":
      return card.answer;
    case "binary_toggle":
      return decimalToBits(card.target);
    case "sort_bins":
      return Object.fromEntries(card.items.map((i) => [i.id, i.bin]));
    case "next_word":
      return card.goal.type === "pick" ? { temperature: card.temperature.start, pick: card.goal.word } : null;
    default:
      return null; // not a Feed type: the video shows the reveal only
  }
}
