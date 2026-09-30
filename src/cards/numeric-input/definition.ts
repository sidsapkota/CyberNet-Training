import type { InteractiveCardDefinition } from "../types";
import {
  describeNumericAnswer,
  describeNumericCorrect,
  gradeNumericInput,
  isNumericAnswerReady,
} from "./grade";
import { NumericInputCardView } from "./NumericInputCardView";
import type { NumericInputAnswer, NumericInputCard } from "./schema";

export const numericInputDefinition: InteractiveCardDefinition<NumericInputCard, NumericInputAnswer> = {
  type: "numeric_input",
  interactive: true,
  initialAnswer: () => "",
  // Invalid formats (e.g. a 2 in binary) keep Check disabled, so they never count as an attempt.
  isAnswerReady: isNumericAnswerReady,
  grade: gradeNumericInput,
  describeAnswer: describeNumericAnswer,
  describeCorrectAnswer: describeNumericCorrect,
  Component: NumericInputCardView,
};
