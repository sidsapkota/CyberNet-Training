"use client";

import { motion } from "motion/react";

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-3 flex-1 overflow-hidden rounded-pill bg-surface-muted"
    >
      <motion.div
        className="relative h-full rounded-pill bg-primary"
        initial={false}
        animate={{ width: `${Math.max(percent, 2)}%` }}
        transition={{ type: "spring", stiffness: 140, damping: 22 }}
      >
        {/* Soft highlight for a bit of depth */}
        <span className="absolute inset-x-2 top-0.5 h-1 rounded-pill bg-white/25" />
      </motion.div>
    </div>
  );
}
