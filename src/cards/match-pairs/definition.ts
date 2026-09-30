import type { InteractiveCardDefinition } from "../types";
import {
  describeMatchPairsAnswer,
  describeMatchPairsCorrect,
  gradeMatchPairs,
  isMatchPairsReady,
} from "./grade";
import { MatchPairsCardView } from "./MatchPairsCardView";
import type { MatchPairsAnswer, MatchPairsCard } from "./schema";

export const matchPairsDefinition: InteractiveCardDefinition<MatchPairsCard, MatchPairsAnswer> = {
  type: "match_pairs",
  interactive: true,
  initialAnswer: () => ({}),
  isAnswerReady: isMatchPairsReady,
  grade: gradeMatchPairs,
  describeAnswer: describeMatchPairsAnswer,
  describeCorrectAnswer: describeMatchPairsCorrect,
  Component: MatchPairsCardView,
};
