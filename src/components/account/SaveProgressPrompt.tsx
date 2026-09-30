"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { XIcon } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth/AuthProvider";
import { EASE_OUT_QUICK } from "@/lib/motion";

export const SAVE_PROMPT_DISMISSED_KEY = "cybernet.savePrompt.dismissed";

function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(SAVE_PROMPT_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Shown to guests on the lesson-complete screen (so from their first finished lesson on):
 * a friendly nudge to save progress to an account. Dismissing it hides it for good in this
 * browser. Never shown when signed in, or when accounts aren't set up.
 */
export function SaveProgressPrompt() {
  const { auth, available } = useAuth();
  const reduceMotion = useReducedMotion();
  const [dismissed, setDismissed] = useState(wasDismissed);

  if (!available || auth.status !== "guest" || dismissed) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(SAVE_PROMPT_DISMISSED_KEY, "1");
    } catch {
      // Storage blocked: it just hides for this visit.
    }
    setDismissed(true);
  }

  return (
    <motion.aside
      aria-label="Save your progress"
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1, duration: 0.35, ease: EASE_OUT_QUICK }}
      className="relative mx-auto mt-8 max-w-sm rounded-card border border-accent-ink bg-accent-soft p-4 pr-12 text-left"
    >
      <p className="font-semibold">Save your progress?</p>
      <p className="mt-1 text-small text-ink-muted">A free account keeps your XP and lessons safe on any device.</p>
      <ButtonLink href="/login" variant="secondary" className="mt-3 min-h-10 px-4 text-small">
        Save my progress
      </ButtonLink>
      <button
        type="button"
        onClick={dismiss}
        aria-label="No thanks, don't ask again"
        title="No thanks"
        className="absolute top-2 right-2 grid size-10 place-items-center rounded-control text-ink-muted hover:bg-surface-raised hover:text-ink"
      >
        <XIcon className="size-5" />
      </button>
    </motion.aside>
  );
}
