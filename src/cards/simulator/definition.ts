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
 * unlocks once the learner has changed a control (or `playChanges` of them). The registry returns
 * this for `mode: "play"`.
 */
export const simulatorPlayDefinition: GuidedCardDefinition<SimulatorCard, SimulatorAnswer> = {
  type: "simulator",
  interactive: false,
  guided: true,
  initialState: initialSimulatorAnswer,
  isComplete: (answer, card) => {
    const start = initialSimulatorAnswer(card);
    const changed = Object.entries(answer).filter(([id, value]) => start[id] !== value).length;
    return changed >= (card.playChanges ?? 1);
  },
  Component: SimulatorCardView,
};
