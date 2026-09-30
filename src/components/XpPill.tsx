"use client";

import { AnimatePresence, motion } from "motion/react";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { XpIcon } from "./ui/icons";

/** Total XP. XP is progress, so it uses the accent (as text: accent-ink). */
export function XpPill() {
  const { snapshot } = useProgress();
  const xp = snapshot?.totalXp;
  return (
    <div
      className="inline-flex h-9 min-w-18 items-center justify-center gap-1.5 rounded-control border border-line bg-surface px-3 font-mono max-[399px]:min-w-11 max-[399px]:px-2.5 text-small font-semibold text-accent-ink tabular-nums"
      aria-label={xp === undefined ? "Loading XP" : `${xp} XP total`}
    >
      <XpIcon className="size-4" />
      <span className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={xp ?? "loading"}
            className="block"
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {xp ?? "–"}
          </motion.span>
        </AnimatePresence>
      </span>
      {/* The label says "XP" too; the narrowest phones drop the visible suffix to fit the streak. */}
      <span className="text-caption font-medium text-ink-faint max-[399px]:hidden">XP</span>
    </div>
  );
}
