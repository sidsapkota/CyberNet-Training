"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { getMyRankAction } from "@/app/actions/leagues";
import { PromotionIcon } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth/AuthProvider";
import { rankImprovement, readStoredRank, storeRank } from "@/lib/leagues/rankMoment";
import { type Tier, TIER_NAMES } from "@/lib/leagues/tiers";
import { useLeaguesStatus } from "@/lib/leagues/useLeaguesOpen";
import { EASE_OUT_QUICK } from "@/lib/motion";

/**
 * A small moment on the lesson-complete screen: if the learner's league rank has gone up since they
 * last finished a lesson, "You moved up to #N". Only when leagues are open and they're signed in;
 * silent otherwise (including the very first finished lesson, which has nothing to compare). The
 * rank is remembered per device, so earning XP elsewhere that moves them up shows here next time.
 */
export function LeagueRankMoment() {
  const { auth } = useAuth();
  const status = useLeaguesStatus();
  const reduceMotion = useReducedMotion();
  const userId = auth.status === "signed-in" ? auth.userId : null;
  const [moment, setMoment] = useState<{ rank: number; tier: Tier } | null>(null);

  useEffect(() => {
    if (status !== "open" || !userId) return;
    let live = true;
    getMyRankAction().then(
      (r) => {
        if (!live || !r.open || r.rank === null) return;
        const improved = rankImprovement(readStoredRank(userId), r.rank);
        storeRank(userId, r.rank);
        if (improved !== null && r.tier) setMoment({ rank: improved, tier: r.tier });
      },
      () => {}, // the moment is a bonus; a failed read just shows nothing
    );
    return () => {
      live = false;
    };
  }, [status, userId]);

  if (!moment) return null;
  return (
    <motion.p
      role="status"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT_QUICK }}
      className="mx-auto mt-6 max-w-sm rounded-control border border-accent-ink bg-accent-soft px-4 py-2.5 text-center text-small font-semibold text-balance text-accent-ink"
    >
      <PromotionIcon className="mr-1.5 inline-block size-4 align-[-0.15em]" />
      You moved up to <span className="font-mono tabular-nums">#{moment.rank}</span> in the {TIER_NAMES[moment.tier]} League
    </motion.p>
  );
}
