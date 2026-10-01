/**
 * The mascot's one-line reactions to an answer in a lesson. Pure, so it's tested. Friendly and
 * varied, never mocking; every wrong-answer line says plainly that it isn't right yet (the cross
 * icon says so too), so the line works as the feedback heading. Lessons only: quizzes stay calm.
 */
import type { MascotExpression } from "@/components/mascot/poses";

export const RIGHT_LINES = [
  "Nailed it.",
  "That's the one.",
  "Spot on.",
  "You got it.",
  "Exactly right.",
  "Correct. Nice thinking.",
  "Yes! That's it.",
  "Right first time.",
  "Correct. You're getting this.",
  "Bang on.",
  "That's right.",
  "Correct. Well worked out.",
  "Good call. Correct.",
  "Correct. Smooth.",
  "Yep, that's it.",
] as const;

export const WRONG_LINES = [
  "Not quite. Have another look.",
  "Close, but not this time.",
  "Not quite. Good guess, though.",
  "Not yet. You're nearly there.",
  "Not this one. Try another angle.",
  "Not quite. A common mix-up.",
  "Not yet. One more go?",
  "Not quite. Lots of people pick that.",
  "Not this time. Have a rethink.",
  "Not quite. Worth another try.",
] as const;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * The line for a card's answer. The same lesson, card and attempt always get the same line (no
 * randomness during render), and the next card or the next attempt always gets a different one.
 */
export function reactionLine(lessonId: string, cardIndex: number, attempt: number, correct: boolean): string {
  // "Right first time." only ever on a first try.
  const lines: readonly string[] = correct ? (attempt > 1 ? RIGHT_LINES.filter((l) => l !== "Right first time.") : RIGHT_LINES) : WRONG_LINES;
  // Stepping by 1 per card and per attempt never lands on the same line twice in a row.
  const i = (hash(lessonId) + cardIndex + (correct ? 0 : attempt)) % lines.length;
  return lines[i]!;
}

/** Right answers: a happy wave (a celebrating hop for bonus cards). Wrong: confused or thinking. */
export function reactionExpression(correct: boolean, bonus: boolean, attempt: number): MascotExpression {
  if (correct) return bonus ? "celebrating" : "happy";
  return attempt % 2 === 1 ? "confused" : "thinking";
}
