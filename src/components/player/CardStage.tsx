"use client";

import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import { type ReactNode, type RefObject, useCallback } from "react";
import type { Card } from "@/cards/schema";
import { SparkIcon } from "@/components/ui/icons";

/** Shake on a wrong answer, a small bounce on a right one. No-ops under reduced motion. */
export function useFeedbackAnimation() {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reduceMotion = useReducedMotion();

  const playCorrect = useCallback(() => {
    if (reduceMotion || !scope.current) return;
    void animate(scope.current, { scale: [1, 1.025, 0.995, 1] }, { duration: 0.45, ease: "easeOut" });
  }, [animate, reduceMotion, scope]);

  const playIncorrect = useCallback(() => {
    if (reduceMotion || !scope.current) return;
    void animate(scope.current, { x: [0, -10, 9, -6, 4, -2, 0] }, { duration: 0.45, ease: "easeInOut" });
  }, [animate, reduceMotion, scope]);

  return { scope, playCorrect, playIncorrect };
}

/** Animated container for the current card. Changing `cardKey` slides the next card in. */
export function CardStage({
  cardKey,
  card,
  scope,
  challengeXp,
  children,
}: {
  cardKey: string;
  card: Card;
  scope: RefObject<HTMLDivElement | null>;
  challengeXp?: number;
  children: ReactNode;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.section
        key={cardKey}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {card.difficulty === "challenge" && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-challenge-soft px-3 py-1 text-sm font-bold text-challenge">
              <SparkIcon className="size-4" />
              Challenge
            </span>
            <span className="text-sm text-ink-muted">
              Optional{challengeXp ? ` · +${challengeXp} bonus XP` : ""}
            </span>
          </div>
        )}
        <div ref={scope}>{children}</div>
      </motion.section>
    </AnimatePresence>
  );
}
