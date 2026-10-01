import type { InteractiveCardDefinition } from "../types";
import { FillGapCardView } from "./FillGapCardView";
import { describeFillGapAnswer, describeFillGapCorrect, gradeFillGap } from "./grade";
import type { FillGapAnswer, FillGapCard } from "./schema";

export const fillGapDefinition: InteractiveCardDefinition<FillGapCard, FillGapAnswer> = {
  type: "fill_gap",
  interactive: true,
  initialAnswer: () => null,
  isAnswerReady: (answer) => answer !== null,
  grade: gradeFillGap,
  describeAnswer: describeFillGapAnswer,
  describeCorrectAnswer: describeFillGapCorrect,
  Component: FillGapCardView,
};
