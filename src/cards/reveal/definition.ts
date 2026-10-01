import type { GuidedCardDefinition } from "../types";
import { initialRevealState, isRevealComplete } from "./grade";
import { RevealCardView } from "./RevealCardView";
import type { RevealCard, RevealState } from "./schema";

/** The learning card: guided (ungraded), like explore. Continue unlocks once it's been tapped. */
export const revealDefinition: GuidedCardDefinition<RevealCard, RevealState> = {
  type: "reveal",
  interactive: false,
  guided: true,
  initialState: initialRevealState,
  isComplete: (state) => isRevealComplete(state),
  Component: RevealCardView,
};
