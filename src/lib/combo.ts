/**
 * The lesson combo: graded cards answered right on the first try, in a row, in one visit. From the
 * third, the footer says so ("3 in a row!") with a small flame, and the correct sound gets an extra,
 * rising note. A wrong answer quietly resets it (never "combo lost"). Pure, so it's easy to test.
 */

/** The first combo worth showing. */
export const COMBO_FROM = 3;
/** The rising note stops climbing here, so long combos never get shrill. */
const PITCH_STEPS = 5;

/** The combo after an answer: +1 for right first time, 0 after a wrong answer, unchanged otherwise. */
export function nextCombo(combo: number, correct: boolean, attempts: number): number {
  if (!correct) return 0;
  return attempts === 1 ? combo + 1 : combo;
}

/** "3 in a row!", or null below `COMBO_FROM`. */
export function comboLabel(combo: number): string | null {
  return combo >= COMBO_FROM ? `${combo} in a row!` : null;
}

/** Pitch multiplier for the combo note: a semitone higher per step past the first, capped. */
export function comboPitch(combo: number): number {
  const steps = Math.min(Math.max(combo - COMBO_FROM, 0), PITCH_STEPS);
  return 2 ** (steps / 12);
}
