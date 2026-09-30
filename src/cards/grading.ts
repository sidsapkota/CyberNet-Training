/**
 * Grading without React: card type → its pure `grade` function. The server uses this to re-grade
 * quiz answers, so a score is never taken from the client. When adding a card type, add its
 * grader here too (registration step 3); `satisfies` makes the compiler insist.
 */
import { gradeBinaryToggle } from "./binary-toggle/grade";
import { gradeDragToOrder } from "./drag-to-order/grade";
import { gradeMatchPairs } from "./match-pairs/grade";
import { gradeMultipleChoice } from "./multiple-choice/grade";
import { gradeNumericInput } from "./numeric-input/grade";
import { gradePacketPath } from "./packet-path/grade";
import type { InteractiveCard } from "./schema";
import { gradeTerminal } from "./terminal/grade";
import type { GradeResult } from "./types";

type Graders = {
  [K in InteractiveCard["type"]]: (card: Extract<InteractiveCard, { type: K }>, answer: never) => GradeResult;
};

const GRADERS = {
  multiple_choice: gradeMultipleChoice,
  drag_to_order: gradeDragToOrder,
  binary_toggle: gradeBinaryToggle,
  numeric_input: gradeNumericInput,
  match_pairs: gradeMatchPairs,
  packet_path: gradePacketPath,
  terminal: gradeTerminal,
} satisfies Graders;

/**
 * Grades an untrusted answer. Answers come from the client, so a malformed one (wrong shape,
 * missing fields) counts as incorrect instead of throwing.
 */
export function gradeUntrusted(card: InteractiveCard, answer: unknown): boolean {
  const grade = GRADERS[card.type] as (card: InteractiveCard, answer: unknown) => GradeResult;
  try {
    return grade(card, answer).correct === true;
  } catch {
    return false;
  }
}
