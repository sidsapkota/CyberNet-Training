import type { RevealState } from "./schema";

/** Before the tap. */
export function initialRevealState(): RevealState {
  return { revealed: false };
}

/** Continue unlocks once it's been tapped (a malformed state counts as not yet). Pure. */
export function isRevealComplete(state: RevealState | null | undefined): boolean {
  return state?.revealed === true;
}
