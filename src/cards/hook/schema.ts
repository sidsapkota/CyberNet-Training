import { z } from "zod";
import { cardBase, nonEmpty } from "../base";

/**
 * Lesson Blueprint beat 1, the Hook: a real-life situation the learner recognises, as one big
 * picture and one line, then "Start". Not graded and pays no XP (like an explainer).
 */
export const HookCardSchema = z.object({
  ...cardBase,
  type: z.literal("hook"),
  /** The situation, in one short line (under 15 words). Markdown. */
  situation: nonEmpty.max(120),
  image: z.object({
    /** Path under /public, e.g. "/illustrations/sso/mia-game-club.svg". Fills the card's width. */
    src: z.string().startsWith("/"),
    alt: nonEmpty,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
});

export type HookCard = z.infer<typeof HookCardSchema>;
