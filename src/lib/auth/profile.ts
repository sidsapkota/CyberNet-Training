import { z } from "zod";

/** Display names: 1 to 40 characters, no control characters. The only personal detail we ask for. */
export const DisplayNameSchema = z
  .string()
  .transform((s) => s.replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(1, "Enter a name.")
      .max(40, "Keep it to 40 characters or fewer.")
      .regex(/^[^\u0000-\u001f\u007f]+$/, "That name has characters we can't use."),
  );

/** What the header shows when no display name is set yet. */
export const FALLBACK_DISPLAY_NAME = "Learner";

export function initialOf(name: string | null | undefined): string {
  const first = (name ?? FALLBACK_DISPLAY_NAME).trim().charAt(0);
  return first ? first.toLocaleUpperCase() : "L";
}
