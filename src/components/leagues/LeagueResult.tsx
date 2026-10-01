"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import type { WeekResult } from "@/app/actions/leagues";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { celebrate } from "@/lib/celebrate";
import { useFeedback } from "@/lib/feedback";
import { outcomeOf } from "@/lib/leagues/rules";
import { leagueName, TIER_NAMES } from "@/lib/leagues/tiers";
import { PRESS_SPRING } from "@/lib/motion";
import { TierBadge } from "./TierBadge";

const ordinal = (n: number) => {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${suffix}`;
};

/**
 * Last week's result, shown once after the weekly reset. A promotion gets the celebration: the
 * mascot, one confetti burst and the new badge springing in (final state under reduced motion).
 * Staying or moving down is told gently: a new week is a fresh start.
 */
export function LeagueResult({ result, onDone }: { result: WeekResult; onDone: () => void }) {
  const outcome = outcomeOf(result.fromTier, result.toTier);
  const reduceMotion = useReducedMotion();
  const { play } = useFeedback();

  useEffect(() => {
    if (outcome !== "promoted") return;
    play("lessonComplete");
    void celebrate();
  }, [outcome, play]);

  const heading = {
    promoted: `Promoted to ${TIER_NAMES[result.toTier]}!`,
    stayed: `You stayed in ${TIER_NAMES[result.toTier]}`,
    demoted: `On to ${TIER_NAMES[result.toTier]}`,
  }[outcome];
  const line = {
    promoted: "You finished in the promotion zone. Welcome to a new league!",
    stayed: "Finish in the top 20% this week to move up.",
    demoted: "A new week is a fresh start. Finish in the top 20% to move back up.",
  }[outcome];

  return (
    <section aria-labelledby="league-result-title" className="mx-auto flex min-h-[60dvh] max-w-lesson flex-col items-center justify-center text-center">
      <Mascot expression={outcome === "promoted" ? "celebrating" : outcome === "stayed" ? "happy" : "thinking"} size={150} idle />
      <p className="mt-6 font-mono text-caption tracking-widest text-ink-faint uppercase">Last week · {leagueName(result.fromTier)}</p>
      <h1 id="league-result-title" className="mt-2 text-headline font-semibold text-balance">
        {heading}
      </h1>
      <motion.div
        className="mt-6"
        initial={reduceMotion || outcome !== "promoted" ? false : { scale: 0.4, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ ...PRESS_SPRING, delay: 0.35 }}
      >
        <TierBadge tier={result.toTier} className="size-28" />
      </motion.div>
      <p className="mt-2 font-semibold">{TIER_NAMES[result.toTier]}</p>
      <p className="mt-4 text-ink-muted">
        You finished <span className="font-mono font-semibold text-ink">{ordinal(result.rank)}</span> with{" "}
        <span className="font-mono font-semibold text-ink">{result.weeklyXp.toLocaleString("en-AU")} XP</span>. {line}
      </p>
      <Button className="mt-8 w-full sm:w-auto" onClick={onDone} autoFocus>
        See this week&apos;s league
      </Button>
    </section>
  );
}
