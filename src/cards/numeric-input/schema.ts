import { z } from "zod";
import { interactiveCardBase, nonEmpty } from "../base";

export const NumericBase = z.enum(["decimal", "binary", "hex"]);
export type NumericBase = z.infer<typeof NumericBase>;

const finite = z.number().finite();

export const NumericInputCardSchema = z
  .object({
    ...interactiveCardBase,
    type: z.literal("numeric_input"),
    /** Optional nudge, revealed behind a "Show hint" toggle. Markdown. */
    hint: nonEmpty.optional(),
    /** Number system the learner types in. Binary and hex get a mono field with a badge. */
    base: NumericBase.default("decimal"),
    /** One accepted value, or several (e.g. 255 or 256 when both are defensible). */
    answer: z.union([finite, z.array(finite).min(1, "needs at least one accepted answer")]),
    /** Shown after the field, e.g. "hosts" or "bytes". */
    unit: nonEmpty.max(20).optional(),
  })
  .refine(
    (c) =>
      c.base === "decimal" ||
      (Array.isArray(c.answer) ? c.answer : [c.answer]).every((n) => Number.isSafeInteger(n) && n >= 0),
    { message: "binary and hex answers must be whole numbers of 0 or more", path: ["answer"] },
  );

export type NumericInputCard = z.infer<typeof NumericInputCardSchema>;
/** Exactly what the learner typed. Parsed with `parseNumericInput`. */
export type NumericInputAnswer = string;
