import type { InteractiveCardDefinition } from "../types";
import { describeTerminalAnswer, describeTerminalCorrect, gradeTerminal, isTerminalReady } from "./grade";
import type { TerminalAnswer, TerminalCard } from "./schema";
import { TerminalCardView } from "./TerminalCardView";

export const terminalDefinition: InteractiveCardDefinition<TerminalCard, TerminalAnswer> = {
  type: "terminal",
  interactive: true,
  initialAnswer: () => ({ history: [], response: "" }),
  isAnswerReady: isTerminalReady,
  grade: gradeTerminal,
  describeAnswer: describeTerminalAnswer,
  describeCorrectAnswer: describeTerminalCorrect,
  Component: TerminalCardView,
};
