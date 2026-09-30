import { z } from "zod";
import { CardId, interactiveCardBase, nonEmpty } from "../base";

export const DragToOrderCardSchema = z
  .object({
    ...interactiveCardBase,
    type: z.literal("drag_to_order"),
    /** Authored in the CORRECT order. The player shuffles them. */
    items: z
      .array(z.object({ id: CardId, label: nonEmpty }))
      .min(3, "needs at least 3 items")
      .max(7, "allows at most 7 items"),
  })
  .refine((c) => new Set(c.items.map((i) => i.id)).size === c.items.length, {
    message: "item ids must be unique",
    path: ["items"],
  });

export type DragToOrderCard = z.infer<typeof DragToOrderCardSchema>;
/** Item ids in the learner's current order. */
export type DragToOrderAnswer = string[];
