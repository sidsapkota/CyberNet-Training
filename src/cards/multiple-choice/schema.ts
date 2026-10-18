import { z } from "zod";
import { CardId, interactiveCardBase, nonEmpty } from "../base";

/** Where an answer sits on the card's picture, in percent of the picture (left, top, width, height). */
export const AnswerArea = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  w: z.number().min(1).max(100),
  h: z.number().min(1).max(100),
});
export type AnswerArea = z.infer<typeof AnswerArea>;

/** The answer a Predict card adds for "I don't know yet" (Lesson Blueprint v1.1). */
export const NOT_SURE = "not-sure";

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
        /** A second image shown once the answer is checked, so the outcome plays out in the picture. */
        revealSrc: z.string().startsWith("/").optional(),
        revealAlt: nonEmpty.optional(),
      })
      .optional(),
    options: z
      .array(
        z.object({
          id: CardId,
          text: nonEmpty,
          /** Shown when this (wrong) option is picked: the misconception it reflects. Markdown. */
          nudge: nonEmpty.max(220).optional(),
          /** Answers you tap on the picture itself: where this one sits on it (needs `image`). */
          area: AnswerArea.optional(),
        }),
      )
      .min(2, "needs at least 2 options")
      .max(5, "allows at most 5 options"),
    correctOptionId: CardId,
    /**
     * Lesson Blueprint v1.1: a Predict card. Not scored: the player adds "Not sure", and any answer
     * goes straight to the reveal ("Here's what happens…"). Not counted in first-try accuracy.
     */
    predict: z.literal(true).optional(),
  })
  .refine((c) => new Set(c.options.map((o) => o.id)).size === c.options.length, {
    message: "option ids must be unique",
    path: ["options"],
  })
  .refine((c) => c.options.some((o) => o.id === c.correctOptionId), {
    message: "correctOptionId must match one of the option ids",
    path: ["correctOptionId"],
  })
  .refine((c) => !c.options.some((o) => o.area) || (c.image && c.options.every((o) => o.area)), {
    message: "answers on the picture need an image, and every option needs an area",
    path: ["options"],
  })
  .refine((c) => !c.options.some((o) => o.id === NOT_SURE), {
    message: `"${NOT_SURE}" is added by the player on Predict cards; don't use it as an option id`,
    path: ["options"],
  })
  .refine((c) => !c.options.find((o) => o.id === c.correctOptionId)?.nudge, {
    message: "the correct option can't have a nudge (nudges are for wrong answers)",
    path: ["options"],
  });

export type MultipleChoiceCard = z.infer<typeof MultipleChoiceCardSchema>;
/** Selected option id, or null before the learner picks one. */
export type MultipleChoiceAnswer = string | null;
