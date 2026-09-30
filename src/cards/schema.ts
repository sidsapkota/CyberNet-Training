import { z } from "zod";
import { BinaryToggleCardSchema } from "./binary-toggle/schema";
import { DragToOrderCardSchema } from "./drag-to-order/schema";
import { ExplainerCardSchema } from "./explainer/schema";
import { MultipleChoiceCardSchema } from "./multiple-choice/schema";

/**
 * Every card type. Registration step 1 of 2 when adding a card type
 * (step 2 is `registry.ts`).
 */
export const CardSchema = z.discriminatedUnion("type", [
  ExplainerCardSchema,
  MultipleChoiceCardSchema,
  DragToOrderCardSchema,
  BinaryToggleCardSchema,
]);

export type Card = z.infer<typeof CardSchema>;
export type CardType = Card["type"];

/** Card types that can be graded (everything except read-only ones). */
export type InteractiveCard = Exclude<Card, { type: "explainer" }>;

export function isInteractiveCard(card: Card): card is InteractiveCard {
  return card.type !== "explainer";
}
