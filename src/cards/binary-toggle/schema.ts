import { z } from "zod";
import { interactiveCardBase, nonEmpty } from "../base";
import { PLACE_VALUES } from "./binary";

export const BinaryToggleCardSchema = z
  .object({
    ...interactiveCardBase,
    type: z.literal("binary_toggle"),
    /** Decimal number the learner must build with 8 bits. */
    target: z.number().int().min(0).max(255),
    /**
     * A worked example (worked example, then fade): up to 4 short steps under the question, and place
     * values already switched on and locked (`locked: [32]`). Solved card: every step and every bit of
     * the answer locked; half-done: the first steps and bits; alone: no `worked`.
     */
    worked: z
      .object({
        steps: z.array(nonEmpty.max(100)).min(1).max(4),
        locked: z.array(z.number().int()).max(8).default([]),
      })
      .optional(),
  })
  .refine((c) => (c.worked?.locked ?? []).every((v) => (PLACE_VALUES as readonly number[]).includes(v) && (c.target & v) === v), {
    message: "locked bits must be place values that are part of the target",
    path: ["worked", "locked"],
  });

export type BinaryToggleCard = z.infer<typeof BinaryToggleCardSchema>;
/** 8 bits, most significant first: index 0 is the 128s place. */
export type BinaryToggleAnswer = boolean[];
