import { z } from "zod";
import { CardId, interactiveCardBase, nonEmpty } from "../base";

export const MultipleChoiceCardSchema = z
  .object({
    ...interactiveCardBase,
    type: z.literal("multiple_choice"),
    /**
     * An optional illustration shown above the options (same shape as an explainer's), so a card can
     * let the learner **watch** something and predict from it, not just read. Keep it compact so the
     * prompt, image and options all fit 360×560.
     */
    image: z
      .object({
        src: z.string().startsWith("/"),
        alt: nonEmpty,
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .optional(),
    options: z
      .array(
        z.object({
          id: CardId,
          text: nonEmpty,
          /** Shown when this (wrong) option is picked: the misconception it reflects. Markdown. */
          nudge: nonEmpty.max(220).optional(),
        }),
      )
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
  })
  .refine((c) => !c.options.find((o) => o.id === c.correctOptionId)?.nudge, {
    message: "the correct option can't have a nudge (nudges are for wrong answers)",
    path: ["options"],
  });

export type MultipleChoiceCard = z.infer<typeof MultipleChoiceCardSchema>;
/** Selected option id, or null before the learner picks one. */
export type MultipleChoiceAnswer = string | null;
