import type { GuidedCardDefinition, InteractiveCardDefinition } from "../types";
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

/**
 * Play mode (Lesson Blueprint's Play beat): the same simulator as a toy. Never graded; Continue
 * unlocks once the learner has changed a control. The registry returns this for `mode: "play"`.
 */
export const simulatorPlayDefinition: GuidedCardDefinition<SimulatorCard, SimulatorAnswer> = {
  type: "simulator",
  interactive: false,
  guided: true,
  initialState: initialSimulatorAnswer,
  isComplete: (answer, card) => {
    const start = initialSimulatorAnswer(card);
    return Object.entries(answer).some(([id, value]) => start[id] !== value);
  },
  Component: SimulatorCardView,
};
