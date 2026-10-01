import type { InteractiveCardDefinition } from "../types";
import { describeNextWordAnswer, describeNextWordCorrect, gradeNextWord, initialNextWordAnswer, isNextWordReady } from "./grade";
import { NextWordCardView } from "./NextWordCardView";
import type { NextWordAnswer, NextWordCard } from "./schema";

export const nextWordDefinition: InteractiveCardDefinition<NextWordCard, NextWordAnswer> = {
  type: "next_word",
  interactive: true,
  initialAnswer: initialNextWordAnswer,
  isAnswerReady: isNextWordReady,
  grade: gradeNextWord,
  describeAnswer: describeNextWordAnswer,
  describeCorrectAnswer: describeNextWordCorrect,
  Component: NextWordCardView,
};
