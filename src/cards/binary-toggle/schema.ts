import { z } from "zod";
import { interactiveCardBase } from "../base";

export const BinaryToggleCardSchema = z.object({
  ...interactiveCardBase,
  type: z.literal("binary_toggle"),
  /** Decimal number the learner must build with 8 bits. */
  target: z.number().int().min(0).max(255),
});

export type BinaryToggleCard = z.infer<typeof BinaryToggleCardSchema>;
/** 8 bits, most significant first: index 0 is the 128s place. */
export type BinaryToggleAnswer = boolean[];
