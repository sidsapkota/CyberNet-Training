import { z } from "zod";
import { interactiveCardBase } from "../base";

/**
 * True or false: one short statement (the prompt), tap True or False, then Check. Quick: about 8
 * seconds. The statement must be clearly true or clearly false from what the lesson showed (no trick
 * wording, no double negatives).
 */
export const TrueFalseCardSchema = z.object({
  ...interactiveCardBase,
  type: z.literal("true_false"),
  /** Whether the statement in `prompt` is true. */
  answer: z.boolean(),
});

export type TrueFalseCard = z.infer<typeof TrueFalseCardSchema>;
/** The learner's pick, or null before they choose. */
export type TrueFalseAnswer = boolean | null;
