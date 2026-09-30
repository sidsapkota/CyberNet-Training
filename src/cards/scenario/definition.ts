import type { InteractiveCardDefinition } from "../types";
import { describeScenarioAnswer, describeScenarioCorrect, gradeScenario, isScenarioReady } from "./grade";
import { ScenarioCardView } from "./ScenarioCardView";
import type { ScenarioAnswer, ScenarioCard } from "./schema";

export const scenarioDefinition: InteractiveCardDefinition<ScenarioCard, ScenarioAnswer> = {
  type: "scenario",
  interactive: true,
  initialAnswer: () => [],
  isAnswerReady: isScenarioReady,
  grade: gradeScenario,
  describeAnswer: describeScenarioAnswer,
  describeCorrectAnswer: describeScenarioCorrect,
  Component: ScenarioCardView,
};
