"use client";

import { getCardDefinition, isGuidedDefinition } from "@/cards/registry";
import { type Card, isInteractiveCard } from "@/cards/schema";
import { CheckIcon } from "@/components/ui/icons";
import { Markdown } from "@/components/ui/Markdown";

/** How an earlier card stands when the learner goes back to it. */
export type ReviewState =
  /** Answered right in this visit: the card shows exactly as they left it. */
  | { kind: "answered"; answer: unknown }
  /** Finished on an earlier visit (old answers aren't kept): the prompt and the right answer. */
  | { kind: "done-before" }
  /** A bonus card they skipped: the prompt only, so it can still be tried another time. */
  | { kind: "skipped" }
  /** Explainers, photos and explore cards. */
  | { kind: "read"; answer?: unknown };

/**
 * An earlier card, read-only. Going back never re-grades, never changes XP and never offers
 * another try: the card is shown with status "correct" (read-only) or as text.
 */
export function CardReview({ card, state }: { card: Card; state: ReviewState }) {
  const definition = getCardDefinition(card);

  if (state.kind === "answered" && definition.interactive) {
    return <definition.Component card={card} answer={state.answer} onAnswerChange={() => {}} status="correct" />;
  }
  if (state.kind === "read") {
    if (isGuidedDefinition(definition)) {
      return (
        <definition.Component card={card} answer={state.answer ?? definition.initialState(card)} onAnswerChange={() => {}} status="correct" />
      );
    }
    if (!definition.interactive) return <definition.Component card={card} />;
  }
  if (!isInteractiveCard(card) || !definition.interactive) return null;

  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <Markdown className="text-lead font-semibold text-balance">{card.prompt}</Markdown>
      {state.kind === "done-before" ? (
        <p className="mt-4 flex items-start gap-2 text-ink">
          <CheckIcon className="mt-1 size-4 shrink-0 text-success" strokeWidth={2.5} />
          <span>
            <span className="font-semibold">You got this one.</span> The answer: {definition.describeCorrectAnswer(card)}
          </span>
        </p>
      ) : (
        <p className="mt-4 text-ink-muted">You skipped this bonus card. You can try it next time you play this lesson.</p>
      )}
    </div>
  );
}
