import type { GuidedCardDefinition, InteractiveCardDefinition } from "../types";
import { describeHotspotAnswer, describeHotspotCorrect, gradeHotspot, isExploreComplete, isHotspotReady } from "./grade";
import { HotspotCardView } from "./HotspotCardView";
import { HotspotExploreView } from "./HotspotExploreView";
import type { HotspotAnswer, HotspotCard, HotspotExploreState } from "./schema";

export const hotspotDefinition: InteractiveCardDefinition<HotspotCard, HotspotAnswer> = {
  type: "hotspot",
  interactive: true,
  initialAnswer: () => ({ selected: [], placed: {} }),
  isAnswerReady: isHotspotReady,
  grade: gradeHotspot,
  describeAnswer: describeHotspotAnswer,
  describeCorrectAnswer: describeHotspotCorrect,
  Component: HotspotCardView,
};

/** Explore mode: ungraded. The registry returns this for hotspot cards with `mode: "explore"`. */
export const hotspotExploreDefinition: GuidedCardDefinition<HotspotCard, HotspotExploreState> = {
  type: "hotspot",
  interactive: false,
  guided: true,
  initialState: () => ({ seen: [] }),
  isComplete: isExploreComplete,
  Component: HotspotExploreView,
};
