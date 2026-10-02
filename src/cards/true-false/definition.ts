import type { InteractiveCardDefinition } from "../types";
import { describeTrueFalseAnswer, describeTrueFalseCorrect, gradeTrueFalse } from "./grade";
import type { TrueFalseAnswer, TrueFalseCard } from "./schema";
import { TrueFalseCardView } from "./TrueFalseCardView";

export const trueFalseDefinition: InteractiveCardDefinition<TrueFalseCard, TrueFalseAnswer> = {
  type: "true_false",
  interactive: true,
  initialAnswer: () => null,
  isAnswerReady: (answer) => typeof answer === "boolean",
  grade: gradeTrueFalse,
  describeAnswer: describeTrueFalseAnswer,
  describeCorrectAnswer: describeTrueFalseCorrect,
  Component: TrueFalseCardView,
};
