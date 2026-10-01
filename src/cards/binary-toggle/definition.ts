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
  // Check waits for at least one switch (all off is only a real answer when the target is 0).
  isAnswerReady: (answer, card) => answer.some(Boolean) || card.target === 0,
  grade: gradeBinaryToggle,
  describeAnswer: describeBinaryToggleAnswer,
  describeCorrectAnswer: describeBinaryToggleCorrect,
  Component: BinaryToggleCardView,
};
