import type { InteractiveCardDefinition } from "../types";
import { describeSortBinsAnswer, describeSortBinsCorrect, gradeSortBins, isSortBinsReady } from "./grade";
import type { SortBinsAnswer, SortBinsCard } from "./schema";
import { SortBinsCardView } from "./SortBinsCardView";

export const sortBinsDefinition: InteractiveCardDefinition<SortBinsCard, SortBinsAnswer> = {
  type: "sort_bins",
  interactive: true,
  initialAnswer: () => ({}),
  isAnswerReady: isSortBinsReady,
  grade: gradeSortBins,
  describeAnswer: describeSortBinsAnswer,
  describeCorrectAnswer: describeSortBinsCorrect,
  Component: SortBinsCardView,
};
