"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect } from "react";

/** Big animated check mark in a ring. */
export function CelebrationBadge({ tone = "success" }: { tone?: "success" | "neutral" }) {
  const color = tone === "success" ? "text-success" : "text-ink-muted";
  const soft = tone === "success" ? "bg-success-soft" : "bg-surface-muted";
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 16 }}
      className={`mx-auto grid size-28 place-items-center rounded-pill ${soft} ${color}`}
    >
      <svg viewBox="0 0 52 52" className="size-16" aria-hidden="true">
        <motion.circle
          cx="26"
          cy="26"
          r="23"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        <motion.path
          d="M15 27l7 7 15-16"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.4, duration: 0.35, ease: "easeOut" }}
        />
      </svg>
    </motion.div>
  );
}

/** Counts up from 0 to `value`. Under reduced motion, MotionConfig makes this instant. */
export function CountUp({ value, className = "" }: { value: number; className?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(count, value, { duration: 0.9, delay: 0.3, ease: "easeOut" });
    return () => controls.stop();
  }, [count, value]);

  return <motion.span className={className}>{rounded}</motion.span>;
}
