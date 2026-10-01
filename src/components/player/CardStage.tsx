"use client";

import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import { type ReactNode, type RefObject, useCallback } from "react";
import type { Card } from "@/cards/schema";
import { ChallengeIcon } from "@/components/ui/icons";

/**
 * A short, soft shake for a wrong answer (~250ms). Correct answers don't move the card; their
 * feedback is the pulse along the progress trace. No-op under reduced motion.
 */
export function useFeedbackAnimation() {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reduceMotion = useReducedMotion();

  const playIncorrect = useCallback(() => {
    if (reduceMotion || !scope.current) return;
    void animate(scope.current, { x: [0, -6, 6, -4, 3, 0] }, { duration: 0.25, ease: "easeInOut" });
  }, [animate, reduceMotion, scope]);

  return { scope, playIncorrect };
}

/** Animated container for the current card. Changing `cardKey` slides the next card in. */
export function CardStage({
  cardKey,
  card,
  scope,
  challengeXp,
  onSkip,
  children,
}: {
  cardKey: string;
  card: Card;
  scope: RefObject<HTMLDivElement | null>;
  challengeXp?: number;
  /** "Skip" on a bonus card, at the end of its Bonus row (instead of a second footer row). */
  onSkip?: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.section
        key={cardKey}
        data-card-stage
        tabIndex={-1}
        className="outline-none"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        {card.difficulty === "challenge" && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-warning/40 bg-warning-soft px-2 py-1 font-mono text-caption font-semibold tracking-wider text-warning uppercase">
              <ChallengeIcon className="size-3.5" />
              Bonus
            </span>
            <span className="text-small text-ink-muted">Optional{challengeXp ? ` · +${challengeXp} XP` : ""}</span>
            {onSkip && (
              <button
                type="button"
                data-keyboard-passthrough
                onClick={onSkip}
                aria-label="Skip bonus"
                className="ml-auto inline-flex min-h-11 items-center rounded-control px-3 text-small font-semibold text-accent-ink hover:bg-surface-raised"
              >
                Skip
              </button>
            )}
          </div>
        )}
        <div ref={scope}>{children}</div>
      </motion.section>
    </AnimatePresence>
  );
}
