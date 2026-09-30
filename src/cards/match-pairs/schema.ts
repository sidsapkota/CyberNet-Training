import { z } from "zod";
import { CardId, interactiveCardBase, nonEmpty } from "../base";

const unique = (values: string[]) => new Set(values).size === values.length;

export const MatchPairsCardSchema = z
  .object({
    ...interactiveCardBase,
    type: z.literal("match_pairs"),
    /**
     * Each pair is one correct connection. Wrap technical values in `backticks` for mono.
     * The right-hand column is shuffled deterministically per card.
     */
    pairs: z
      .array(z.object({ id: CardId, left: nonEmpty.max(60), right: nonEmpty.max(60) }))
      .min(3, "needs at least 3 pairs")
      .max(6, "allows at most 6 pairs"),
  })
  .refine((c) => unique(c.pairs.map((p) => p.id)), { message: "pair ids must be unique", path: ["pairs"] })
  .refine((c) => unique(c.pairs.map((p) => p.left)), { message: "left items must be unique", path: ["pairs"] })
  .refine((c) => unique(c.pairs.map((p) => p.right)), { message: "right items must be unique", path: ["pairs"] });

export type MatchPairsCard = z.infer<typeof MatchPairsCardSchema>;
/** left pair id → the pair id whose right item the learner connected it to. */
export type MatchPairsAnswer = Record<string, string>;
