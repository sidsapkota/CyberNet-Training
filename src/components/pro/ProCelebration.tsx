"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth/AuthProvider";
import { celebrate } from "@/lib/celebrate";
import { EASE_OUT_QUICK } from "@/lib/motion";
import { celebratedKey, currentProStart, PRO_BENEFITS, shouldCelebrate } from "@/lib/pro/plans";
import type { ProInterval } from "@/lib/pro/entitlement";
import { usePro } from "@/lib/pro/ProProvider";

/** Records that this device has celebrated this Pro start (also used by /pro/welcome). */
export function markProCelebrated(userId: string, start: string | null): void {
  if (!start) return;
  try {
    localStorage.setItem(celebratedKey(userId), start);
  } catch {
    // storage blocked: it may show again, which is harmless
  }
}

/** The Pro start to celebrate on this device now, or null. */
function dueStart(userId: string, subscribed: boolean, intervals: readonly ProInterval[]): string | null {
  const now = Date.now();
  const current = currentProStart(intervals, now);
  try {
    return shouldCelebrate(subscribed, current, localStorage.getItem(celebratedKey(userId)), now) ? current : null;
  } catch {
    return null; // storage blocked: never nag blind
  }
}

/**
 * The first time a new subscriber opens the app on this device: a short welcome (the mascot
 * celebrating, one confetti burst, what's now theirs). Remembered per device. Not for the early-user
 * grant (it has its own thank-you), and not after /pro/welcome, which already celebrated.
 */
/**
 * Whether the Pro welcome is due on this device: the Pro start it would celebrate, null when it
 * isn't due, or "loading" while Pro status loads. Other one-time welcomes (the leagues one) wait
 * while it's due, so a learner never sees two pop-ups stacked.
 */
export function useProWelcomeDue(): string | null | "loading" {
  const { auth } = useAuth();
  const { pro, hasPro } = usePro();
  const userId = auth.status === "signed-in" ? auth.userId : null;
  // /pro/welcome is its own celebration (and marks this device).
  const onWelcome = usePathname().startsWith("/pro/welcome");
  if (auth.status === "loading" || (userId && pro.loading)) return "loading";
  // Pro status only loads in the browser (it's "loading" in the server HTML), so reading the clock
  // and storage here can't cause a hydration mismatch.
  return !userId || pro.loading || !hasPro || onWelcome ? null : dueStart(userId, pro.status.kind === "subscription", pro.intervals);
}

export function ProCelebration() {
  const { auth } = useAuth();
  const reduceMotion = useReducedMotion();
  const [closed, setClosed] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const userId = auth.status === "signed-in" ? auth.userId : null;
  const due = useProWelcomeDue();
  const start = closed || due === "loading" ? null : due;

  useEffect(() => {
    const dialog = ref.current;
    if (!start || !dialog || dialog.open) return;
    dialog.showModal();
    if (!reduceMotion) void celebrate();
  }, [start, reduceMotion]);

  if (!start || !userId) return null;
  const close = () => {
    markProCelebrated(userId, start);
    setClosed(true);
    ref.current?.close();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="pro-celebration-title"
      onClose={close}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-card border-2 border-accent-ink bg-surface p-0 text-ink shadow-pro-card backdrop:bg-canvas/80"
    >
      <motion.div
        initial={reduceMotion ? false : { scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: EASE_OUT_QUICK }}
        className="flex flex-col items-center p-6 text-center"
      >
        <Mascot expression="celebrating" size={96} idle reaction="scan" />
        <h2 id="pro-celebration-title" className="mt-3 text-title font-semibold">
          You&apos;re Pro now
        </h2>
        <ul className="mt-4 grid w-full gap-2 text-left">
          {PRO_BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-2.5">
              <CheckIcon className="size-4 shrink-0 text-ink-muted" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <Button className="mt-6 w-full" onClick={close} autoFocus>
          Let&apos;s go
        </Button>
      </motion.div>
    </dialog>
  );
}
