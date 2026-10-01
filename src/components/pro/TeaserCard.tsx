"use client";

import { useRef, useState } from "react";
import { type AnyInteractiveDefinition, getCardDefinition, isGuidedDefinition } from "@/cards/registry";
import type { Card } from "@/cards/schema";
import type { CardStatus } from "@/cards/types";
import { Button } from "@/components/ui/Button";
import { CheckIcon, HintIcon, XIcon } from "@/components/ui/icons";
import { Markdown } from "@/components/ui/Markdown";
import { trackEvent } from "@/lib/analytics";
import { useFeedback } from "@/lib/feedback";

/**
 * One playable card from a Pro module, on the "What's next" screen. A sandbox: nothing is saved
 * and no XP is earned. Check, Try again, the hint and the explanation work as in a lesson.
 */
export function TeaserCard({ card, courseId }: { card: Card; courseId: string }) {
  const definition = getCardDefinition(card);
  if (isGuidedDefinition(definition) || !("grade" in definition)) return null;
  return <Teaser card={card} definition={definition} courseId={courseId} />;
}

function Teaser({ card, definition, courseId }: { card: Card; definition: AnyInteractiveDefinition; courseId: string }) {
  const [answer, setAnswer] = useState<unknown>(() => definition.initialAnswer(card));
  const [status, setStatus] = useState<CardStatus>("answering");
  const [hintOpen, setHintOpen] = useState(false);
  const tracked = useRef(false);
  const { play } = useFeedback();
  const { Component } = definition;
  const hint = "hint" in card ? card.hint : undefined;
  const explanation = "explanation" in card ? card.explanation : "";

  function check() {
    if (!tracked.current) {
      tracked.current = true;
      trackEvent("teaser_played", { course: courseId });
    }
    const { correct } = definition.grade(card, answer);
    setStatus(correct ? "correct" : "incorrect");
    play(correct ? "correct" : "wrong");
  }

  return (
    <section aria-label="Try a card from this module" className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <p className="font-mono text-caption tracking-widest text-ink-faint uppercase">Try one now · nothing is saved</p>
      <div className="mt-3">
        <Component card={card} answer={answer} onAnswerChange={setAnswer} status={status} />
      </div>

      <div aria-live="polite">
        {status === "correct" && (
          <div className="mt-4 rounded-control border border-success bg-success-soft p-3">
            <p className="flex items-center gap-2 font-semibold text-success">
              <CheckIcon className="size-5" strokeWidth={2.5} /> Nice one!
            </p>
            {explanation && <Markdown className="mt-1 text-small text-ink">{explanation}</Markdown>}
          </div>
        )}
        {status === "incorrect" && (
          <p className="mt-4 flex items-center gap-2 font-semibold text-danger">
            <XIcon className="size-5" strokeWidth={2.5} /> Not quite. Have another go.
          </p>
        )}
      </div>

      {hint && status !== "correct" && (
        <div className="mt-3">
          {hintOpen ? (
            <div className="rounded-control bg-surface-raised p-3 text-small">
              <p className="flex items-center gap-1.5 font-semibold">
                <HintIcon className="size-4" /> Hint
              </p>
              <Markdown className="mt-1 text-ink-muted">{hint}</Markdown>
            </div>
          ) : (
            <Button variant="ghost" className="min-h-11 px-2 text-small" onClick={() => setHintOpen(true)}>
              <HintIcon className="size-4" /> Show a hint
            </Button>
          )}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {status === "answering" && (
          <Button onClick={check} disabled={!definition.isAnswerReady(answer, card)} className="w-full sm:w-auto">
            Check
          </Button>
        )}
        {status === "incorrect" && (
          <Button variant="secondary" onClick={() => setStatus("answering")} className="w-full sm:w-auto">
            Try again
          </Button>
        )}
      </div>
    </section>
  );
}
