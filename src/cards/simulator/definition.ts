import type { InteractiveCardDefinition } from "../types";
import {
  describeSimulatorAnswer,
  describeSimulatorCorrect,
  gradeSimulator,
  initialSimulatorAnswer,
  isSimulatorReady,
} from "./grade";
import type { SimulatorAnswer, SimulatorCard } from "./schema";
import { SimulatorCardView } from "./SimulatorCardView";

export const simulatorDefinition: InteractiveCardDefinition<SimulatorCard, SimulatorAnswer> = {
  type: "simulator",
  interactive: true,
  initialAnswer: initialSimulatorAnswer,
  isAnswerReady: isSimulatorReady,
  grade: gradeSimulator,
  describeAnswer: describeSimulatorAnswer,
  describeCorrectAnswer: describeSimulatorCorrect,
  Component: SimulatorCardView,
};
