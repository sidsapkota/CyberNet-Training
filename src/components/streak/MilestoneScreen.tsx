"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { celebrate } from "@/lib/celebrate";
import { useFeedback } from "@/lib/feedback";
import { StreakIcon } from "./StreakIcon";

/** Warm, never pushy: what the milestone means, not what could be lost. */
const COPY: Record<number, string> = {
  3: "Three days in a row. That's how a habit starts.",
  7: "A whole week! You've earned a streak freeze, which covers a missed day for you.",
  14: "Two weeks of learning. That's real momentum.",
  30: "A month of learning, one day at a time.",
  50: "Fifty days. That's a serious habit.",
  100: "One hundred days of learning. Amazing.",
};

/** Big milestones (a month and up) also get the confetti burst. */
const CONFETTI_FROM = 30;

/**
 * A streak milestone (3, 7, 14, 30, 50 or 100 days): a full step before the lesson- or quiz-
 * complete screen, with the celebrating mascot. Continue (or Enter, as the button has focus) moves on.
 */
export function MilestoneScreen({ days, onContinue }: { days: number; onContinue: () => void }) {
  const { play } = useFeedback();
  const reduceMotion = useReducedMotion();
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    play("goal");
    button.current?.focus();
    if (days < CONFETTI_FROM) return;
    const timer = window.setTimeout(() => void celebrate(), 400);
    return () => window.clearTimeout(timer);
  }, [days, play]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <Mascot expression="celebrating" size={170} idle label={`The mascot, celebrating your ${days}-day streak`} />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduceMotion ? 0 : 0.4, duration: reduceMotion ? 0 : 0.3 }}
        className="mt-8 w-full"
      >
        <p className="inline-flex items-center gap-1.5 font-mono text-caption font-semibold tracking-widest text-accent-ink uppercase">
          <StreakIcon lit className="size-4" /> Streak milestone
        </p>
        <h1 className="mt-2 text-headline font-semibold text-balance">{days}-day streak!</h1>
        <p className="mx-auto mt-3 max-w-sm text-body text-ink-muted">{COPY[days]}</p>
        <div className="mx-auto mt-10 max-w-sm">
          <Button ref={button} onClick={onContinue} className="w-full">
            Continue
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
