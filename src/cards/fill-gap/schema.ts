import { z } from "zod";
import { CardId, interactiveCardBase, nonEmpty } from "../base";

export const GAP = "___";

/**
 * Fill the gap: a sentence with one gap (`___` in the prompt) and 2–4 short word choices. Tap a word
 * to drop it into the gap, then Check. Quick: about 12 seconds.
 */
export const FillGapCardSchema = z
  .object({
    ...interactiveCardBase,
    type: z.literal("fill_gap"),
    options: z
      .array(z.object({ id: CardId, text: nonEmpty.max(30), nudge: nonEmpty.max(220).optional() }))
      .min(2, "needs at least 2 words")
      .max(4, "allows at most 4 words"),
    correctOptionId: CardId,
  })
  .refine((c) => c.prompt.split(GAP).length === 2, { message: `the prompt needs exactly one gap (${GAP})`, path: ["prompt"] })
  .refine((c) => new Set(c.options.map((o) => o.id)).size === c.options.length, { message: "option ids must be unique", path: ["options"] })
  .refine((c) => c.options.some((o) => o.id === c.correctOptionId), { message: "correctOptionId must match one of the option ids", path: ["correctOptionId"] })
  .refine((c) => !c.options.find((o) => o.id === c.correctOptionId)?.nudge, { message: "the correct word can't have a nudge", path: ["options"] });

export type FillGapCard = z.infer<typeof FillGapCardSchema>;
/** The word chosen for the gap, or null. */
export type FillGapAnswer = string | null;
