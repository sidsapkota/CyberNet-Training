import type { InteractiveCardDefinition } from "../types";
import { BIT_COUNT } from "./binary";
import { BinaryToggleCardView } from "./BinaryToggleCardView";
import {
  describeBinaryToggleAnswer,
  describeBinaryToggleCorrect,
  gradeBinaryToggle,
} from "./grade";
import type { BinaryToggleAnswer, BinaryToggleCard } from "./schema";

export const binaryToggleDefinition: InteractiveCardDefinition<BinaryToggleCard, BinaryToggleAnswer> = {
  type: "binary_toggle",
  interactive: true,
  initialAnswer: () => Array.from({ length: BIT_COUNT }, () => false),
  // Any combination can be checked, including all bits off.
  isAnswerReady: () => true,
  grade: gradeBinaryToggle,
  describeAnswer: describeBinaryToggleAnswer,
  describeCorrectAnswer: describeBinaryToggleCorrect,
  Component: BinaryToggleCardView,
};
