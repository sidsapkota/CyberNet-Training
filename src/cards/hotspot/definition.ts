import type { InteractiveCardDefinition } from "../types";
import { describeHotspotAnswer, describeHotspotCorrect, gradeHotspot, isHotspotReady } from "./grade";
import { HotspotCardView } from "./HotspotCardView";
import type { HotspotAnswer, HotspotCard } from "./schema";

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
