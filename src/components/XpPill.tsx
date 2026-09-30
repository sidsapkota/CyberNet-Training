"use client";

import { AnimatePresence, motion } from "motion/react";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { BoltIcon } from "./ui/icons";

export function XpPill() {
  const { snapshot } = useProgress();
  const xp = snapshot?.totalXp;
  return (
    <div
      className="inline-flex h-9 min-w-16 items-center justify-center gap-1 rounded-pill bg-xp-soft px-3 text-sm font-bold text-xp tabular-nums"
      aria-label={xp === undefined ? "Loading XP" : `${xp} XP total`}
    >
      <BoltIcon className="size-4" />
      <span className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={xp ?? "loading"}
            className="block"
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
          >
            {xp ?? "–"}
          </motion.span>
        </AnimatePresence>
      </span>
    </div>
  );
}
