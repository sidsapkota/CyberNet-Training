import { z } from "zod";
import { CardId, interactiveCardBase, nonEmpty } from "../base";

export const MultipleChoiceCardSchema = z
  .object({
    ...interactiveCardBase,
    type: z.literal("multiple_choice"),
    options: z
      .array(z.object({ id: CardId, text: nonEmpty }))
      .min(2, "needs at least 2 options")
      .max(5, "allows at most 5 options"),
    correctOptionId: CardId,
  })
  .refine((c) => new Set(c.options.map((o) => o.id)).size === c.options.length, {
    message: "option ids must be unique",
    path: ["options"],
  })
  .refine((c) => c.options.some((o) => o.id === c.correctOptionId), {
    message: "correctOptionId must match one of the option ids",
    path: ["correctOptionId"],
  });

export type MultipleChoiceCard = z.infer<typeof MultipleChoiceCardSchema>;
/** Selected option id, or null before the learner picks one. */
export type MultipleChoiceAnswer = string | null;
