"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { celebrate } from "@/lib/celebrate";
import { useProWelcomeDue } from "@/components/pro/ProCelebration";
import { leaguesOpenSeenKey, shouldShowOpening } from "@/lib/leagues/opening";
import { useLeaguesStatus } from "@/lib/leagues/useLeaguesOpen";
import { EASE_OUT_QUICK } from "@/lib/motion";
import { TierBadge } from "./TierBadge";

/** The stored "seen" value for this device, or null (storage blocked counts as seen-nothing). */
function readSeen(userId: string | null): string | null {
  if (!userId) return null;
  try {
    return localStorage.getItem(leaguesOpenSeenKey(userId));
  } catch {
    return null;
  }
}

/**
 * The first time a signed-in learner opens the app after leagues have opened: a one-time welcome
 * (the mascot celebrating, one confetti burst, their Packet badge and the way in). Remembered per
 * device, like the Pro welcome, so there's no database column. Everyone starts in Packet the week
 * leagues open (no week has settled yet), so the badge is always Packet here.
 */
export function LeaguesOpening() {
  const { auth } = useAuth();
  const status = useLeaguesStatus();
  const reduceMotion = useReducedMotion();
  const [closed, setClosed] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const userId = auth.status === "signed-in" ? auth.userId : null;
  // Only on the dashboard: never over a lesson, sign-in or onboarding. Greet them once they're back.
  const onDashboard = usePathname() === "/";
  // The open flag only resolves in the browser ("loading" in the server HTML), so reading storage
  // here can't cause a hydration mismatch: both server and first client render show nothing.
  // One welcome at a time: while the Pro welcome is due (or Pro status is loading), this one waits
  // for a later visit, so the two never stack.
  const proWelcome = useProWelcomeDue();
  const show = !closed && proWelcome === null && shouldShowOpening({ status, userId, seen: readSeen(userId), onDashboard });

  useEffect(() => {
    const dialog = ref.current;
    if (!show || !dialog || dialog.open) return;
    dialog.showModal();
    if (!reduceMotion) void celebrate();
  }, [show, reduceMotion]);

  if (!show || !userId) return null;
  const close = () => {
    try {
      localStorage.setItem(leaguesOpenSeenKey(userId), new Date().toISOString());
    } catch {
      // storage blocked: it may show again, which is harmless
    }
    setClosed(true);
    ref.current?.close();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="leagues-opening-title"
      onClose={close}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-card border-2 border-accent-ink bg-surface p-0 text-ink shadow-glow backdrop:bg-canvas/80"
    >
      <motion.div
        initial={reduceMotion ? false : { scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: EASE_OUT_QUICK }}
        className="flex flex-col items-center p-6 text-center"
      >
        <Mascot expression="celebrating" size={96} idle reaction="scan" />
        <p className="mt-3 font-mono text-caption tracking-widest text-ink-faint uppercase">Weekly leagues</p>
        <h2 id="leagues-opening-title" className="mt-1 text-title font-semibold text-balance">
          Leagues are open!
        </h2>
        <motion.div
          className="mt-5"
          initial={reduceMotion ? false : { scale: 0.4, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT_QUICK, delay: 0.25 }}
        >
          <TierBadge tier="packet" className="size-24" />
        </motion.div>
        <p className="mt-4 text-ink-muted">
          You&apos;re in the <span className="font-semibold text-ink">Packet League</span>. Earn XP this week to climb
          the tiers and meet other learners.
        </p>
        <ButtonLink href="/leagues" className="mt-6 w-full" onClick={close} autoFocus>
          See the leaderboard
        </ButtonLink>
        <Button variant="ghost" className="mt-2 w-full" onClick={close}>
          Not now
        </Button>
      </motion.div>
    </dialog>
  );
}
