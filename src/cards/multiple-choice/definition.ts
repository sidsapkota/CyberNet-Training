import type { InteractiveCardDefinition } from "../types";
import {
  describeMultipleChoiceAnswer,
  describeMultipleChoiceCorrect,
  gradeMultipleChoice,
} from "./grade";
import { MultipleChoiceCardView } from "./MultipleChoiceCardView";
import type { MultipleChoiceAnswer, MultipleChoiceCard } from "./schema";

export const multipleChoiceDefinition: InteractiveCardDefinition<
  MultipleChoiceCard,
  MultipleChoiceAnswer
> = {
  type: "multiple_choice",
  interactive: true,
  initialAnswer: () => null,
  isAnswerReady: (answer) => answer !== null,
  grade: gradeMultipleChoice,
  describeAnswer: describeMultipleChoiceAnswer,
  describeCorrectAnswer: describeMultipleChoiceCorrect,
  Component: MultipleChoiceCardView,
};
