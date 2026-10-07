/**
 * Adaptive pacing (content quality pass, docs/plans/retention-and-fun.md). A card may carry `pace`:
 * - "easy": the easy win. Skipped when the first 3 graded cards of the visit were all right first time.
 * - "extra": one more worked example. Shown only straight after a wrong first answer on the card
 *   before it, otherwise skipped.
 * Paced cards may be skipped, so they're never required to finish a lesson (here, on the server
 * and in the content outline), and nothing later may rely on what they teach (concepts.ts).
 */
import type { Difficulty } from "./base";

export type Pace = "easy" | "extra";

/** Required to finish a lesson: core, and not a paced card. */
export function requiredForLesson(card: { difficulty: Difficulty; pace?: Pace }): boolean {
  return card.difficulty === "core" && !card.pace;
}

export interface PacingState {
  /** Graded cards answered so far this visit. */
  graded: number;
  /** All of them right on the first try. */
  allFirstTry: boolean;
  /** The last graded card's first answer was wrong. */
  lastMissed: boolean;
}

export const NO_PACING: PacingState = { graded: 0, allFirstTry: true, lastMissed: false };

export function afterAnswer(state: PacingState, firstTryRight: boolean): PacingState {
  return { graded: state.graded + 1, allFirstTry: state.allFirstTry && firstTryRight, lastMissed: !firstTryRight };
}

/** Skip the easy win once the first 3 graded cards were all right first time. */
export function skipEasy(state: PacingState): boolean {
  return state.graded >= 3 && state.allFirstTry;
}

/**
 * The next card to show after `from`, skipping paced cards that aren't needed: "easy" ones when
 * `skipEasy`, "extra" ones unless the card before was just missed. `isDone` cards always show (they
 * were played before). Returns cards.length when the lesson is over.
 */
export function nextCardIndex(cards: readonly { pace?: Pace }[], from: number, state: PacingState, isDone: (index: number) => boolean = () => false): number {
  let i = from + 1;
  while (i < cards.length) {
    const pace = cards[i]!.pace;
    const skip = !isDone(i) && ((pace === "easy" && skipEasy(state)) || (pace === "extra" && !state.lastMissed));
    if (!skip) return i;
    i++;
  }
  return cards.length;
}
