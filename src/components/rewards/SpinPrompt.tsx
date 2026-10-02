"use client";

import { useEffect, useState } from "react";
import { claimSpinsAction, getRewardsAction } from "@/app/actions/rewards";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { effectiveOutfit, ownedItems, spinCounts } from "@/lib/rewards/rules";
import { Avatar } from "./Avatar";
import { RewardSpin } from "./RewardSpin";

/**
 * On end screens (lesson complete, quiz results): records any spins just earned (a finished module
 * or course, a 7, 30 or 100-day streak) and, if one can win something, offers it (spins with nothing
 * left to win stay saved for new items, shown on the avatar page). Signed-in learners only;
 * nothing shows otherwise. Never inside a lesson (minimalism guardrail).
 */
export function SpinPrompt() {
  const { auth } = useAuth();
  const signedIn = auth.status === "signed-in";
  const [waiting, setWaiting] = useState(0);
  const [owned, setOwned] = useState<Set<string> | null>(null);
  const [outfit, setOutfit] = useState<string[]>([]);
  const [pro, setPro] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    void claimSpinsAction()
      .then(async (n) => {
        if (cancelled || n === 0) return;
        const state = await getRewardsAction();
        if (cancelled) return;
        const has = ownedItems(state.won, state.hasPro, state.milestones);
        setOwned(has);
        setOutfit(effectiveOutfit(state.outfit, state.hasPro));
        setPro(state.hasPro);
        setWaiting(spinCounts(n, has).ready);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  if (!signedIn || waiting === 0 || !owned) return null;
  if (open) {
    return (
      <div className="mt-6 rounded-card border border-line bg-surface p-5">
        <RewardSpin
          owned={owned}
          outfit={outfit}
          onDone={(left) => {
            setOpen(false);
            setWaiting(Math.min(left, waiting - 1));
          }}
        />
      </div>
    );
  }
  return (
    <div className="mt-6 flex items-center gap-3 rounded-card border border-accent-ink bg-accent-soft p-4 text-left">
      <Avatar outfit={outfit} pro={pro} frame={false} size={44} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">You earned a spin</p>
        <p className="text-small text-ink-muted">Every spin wins something for your avatar.</p>
      </div>
      <Button onClick={() => setOpen(true)}>Spin</Button>
    </div>
  );
}
