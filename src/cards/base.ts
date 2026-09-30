import { z } from "zod";

/** Stable, URL-safe id. Progress is keyed on it, so never rename a published card's id. */
export const CardId = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be kebab-case (a-z, 0-9, dashes)");

export const Difficulty = z.enum(["core", "challenge"]);
export type Difficulty = z.infer<typeof Difficulty>;

export const nonEmpty = z.string().trim().min(1);

/** Fields every card has. */
export const cardBase = {
  id: CardId,
  difficulty: Difficulty,
};

/**
 * Fields every interactive (gradable) card has. Keeping `prompt` and `explanation`
 * uniform lets the lesson player and quiz review screen treat all card types alike.
 */
export const interactiveCardBase = {
  ...cardBase,
  /** The question shown above the interaction. Markdown. */
  prompt: nonEmpty,
  /** Shown after answering (lessons) or on the review screen (quizzes). Markdown. */
  explanation: nonEmpty,
  /**
   * Lessons only (hidden in quizzes), behind a "Hint" button. Points the way without giving the
   * answer. Using it pays the retry XP. Markdown.
   */
  hint: nonEmpty.max(300).optional(),
  /**
   * Lessons only: shown after a wrong attempt, instead of "Have another go". Addresses the likely
   * misconception without revealing the answer. Markdown.
   */
  nudge: nonEmpty.max(220).optional(),
};
