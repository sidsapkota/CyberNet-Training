import type { ComponentType } from "react";

/**
 * - `answering`: learner can change their answer.
 * - `correct` / `incorrect`: answer has been checked; the card is read-only.
 */
export type CardStatus = "answering" | "correct" | "incorrect";

export interface CardComponentProps<C, A> {
  card: C;
  answer: A;
  onAnswerChange: (answer: A) => void;
  status: CardStatus;
}

export interface GradeResult {
  correct: boolean;
}

/**
 * Contract for a gradable card type. Everything except `Component` must be pure
 * so it can be unit-tested (and reused server-side later).
 */
export interface InteractiveCardDefinition<C extends { type: string }, A> {
  type: C["type"];
  interactive: true;
  initialAnswer: (card: C) => A;
  /** Whether the Check button is enabled. */
  isAnswerReady: (answer: A) => boolean;
  grade: (card: C, answer: A) => GradeResult;
  /** Human-readable answer for the quiz review screen. */
  describeAnswer: (card: C, answer: A) => string;
  describeCorrectAnswer: (card: C) => string;
  Component: ComponentType<CardComponentProps<C, A>>;
}

/** Contract for a read-only card type (e.g. explainer). */
export interface StaticCardDefinition<C extends { type: string }> {
  type: C["type"];
  interactive: false;
  Component: ComponentType<{ card: C }>;
}
