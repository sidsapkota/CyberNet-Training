import { z } from "zod";
import { cardBase, nonEmpty } from "../base";

export const ExplainerCardSchema = z.object({
  ...cardBase,
  type: z.literal("explainer"),
  title: nonEmpty,
  /** Markdown. Keep it short: 2 to 4 small paragraphs. */
  body: nonEmpty,
  image: z
    .object({
      /** Path under /public, e.g. "/illustrations/switches.svg". */
      src: z.string().startsWith("/"),
      alt: nonEmpty,
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      caption: z.string().optional(),
    })
    .optional(),
  /**
   * Safety notes only (Brand → Mascot exception): the mascot presents the note. Kept to one
   * expression so it can't creep into ordinary cards.
   */
  mascot: z.literal("presenting").optional(),
});

export type ExplainerCard = z.infer<typeof ExplainerCardSchema>;
