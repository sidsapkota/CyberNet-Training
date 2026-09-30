import type { InteractiveCardDefinition } from "../types";
import { describeTeardownAnswer, describeTeardownCorrect, gradeTeardown, isTeardownReady } from "./grade";
import type { TeardownAnswer, TeardownCard } from "./schema";
import { TeardownCardView } from "./TeardownCardView";

export const teardownDefinition: InteractiveCardDefinition<TeardownCard, TeardownAnswer> = {
  type: "teardown",
  interactive: true,
  initialAnswer: () => ({ done: [], nudges: 0 }),
  isAnswerReady: isTeardownReady,
  grade: gradeTeardown,
  describeAnswer: describeTeardownAnswer,
  describeCorrectAnswer: describeTeardownCorrect,
  Component: TeardownCardView,
};
