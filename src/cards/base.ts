import { z } from "zod";

/** Stable, URL-safe id. Progress is keyed on it, so never rename a published card's id. */
export const CardId = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be kebab-case (a-z, 0-9, dashes)");

export const Difficulty = z.enum(["core", "challenge"]);
export type Difficulty = z.infer<typeof Difficulty>;

export const nonEmpty = z.string().trim().min(1);

/**
 * A concept a course teaches or relies on: kebab-case, scoped to the course (`bit`, `byte-max-255`,
 * `ipv4-address`). See src/lib/content/concepts.ts: a card may only use what an earlier core card
 * in the same course (or its own prompt) has taught.
 */
export const ConceptId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "concepts are kebab-case");

/** Fields every card has. */
export const cardBase = {
  id: CardId,
  difficulty: Difficulty,
  /** Concepts this card teaches (an explainer, a reveal, or a prompt that explains an idea itself). */
  teaches: z.array(ConceptId).max(8).optional(),
  /** Concepts the learner must already know to answer or follow this card (never outside knowledge). */
  uses: z.array(ConceptId).max(8).optional(),
  /**
   * Adaptive pacing (src/cards/pace.ts): "easy" (the easy win, skipped after 3 right first time) or
   * "extra" (one more worked example, shown only after a miss). Never required to finish a lesson.
   */
  pace: z.enum(["easy", "extra"]).optional(),
  /**
   * Overrides the card's play tag (src/lib/content/play.ts): what the learner does on it. Use it when
   * the type's default is wrong, e.g. a multiple choice that asks for a prediction.
   */
  play: z.enum(["recognise", "predict", "build", "consequence"]).optional(),
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
