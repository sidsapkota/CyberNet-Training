"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export type ProgressNodeState = "done" | "skipped" | "current" | "upcoming";

export interface ProgressNode {
  state: ProgressNodeState;
  /** Challenge cards are drawn as diamonds, so optional cards read differently at a glance. */
  challenge?: boolean;
}

/**
 * Lesson progress as a network trace: one node per card on a line. The lit segment runs
 * up to the furthest completed node. When `pulse` changes, a cyan pulse travels from
 * `pulse.from` to `pulse.to` and the destination node ripples (~370ms total).
 */
export function NodeProgress({
  nodes,
  label,
  pulse,
}: {
  nodes: ProgressNode[];
  label: string;
  pulse?: { key: number; from: number; to: number } | null;
}) {
  const reduceMotion = useReducedMotion();
  const count = nodes.length;
  const pos = (i: number) => (count <= 1 ? 50 : (i / (count - 1)) * 100);
  const litUntil = nodes.reduce((last, n, i) => (n.state === "done" || n.state === "skipped" ? i : last), -1);
  const doneCount = nodes.filter((n) => n.state === "done" || n.state === "skipped").length;
  const small = count > 20;
  const size = small ? "size-2" : "size-2.5";

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={count}
      aria-valuenow={doneCount}
      className="relative h-6 flex-1"
    >
      <div className="absolute inset-x-1.5 top-1/2 -translate-y-1/2">
        {/* Unlit trace */}
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-line-strong" />
        {/* Lit trace */}
        <motion.div
          className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-accent-ink"
          initial={false}
          animate={{ width: `${litUntil < 0 ? 0 : pos(litUntil)}%` }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />

        {nodes.map((node, i) => {
          const shape = node.challenge ? "rotate-45 rounded-[2px]" : "rounded-node";
          const tone =
            node.state === "done"
              ? "bg-accent border-accent-ink shadow-glow"
              : node.state === "current"
                ? "bg-canvas border-accent-ink ring-2 ring-accent-ink/25"
                : node.state === "skipped"
                  ? "bg-canvas border-warning"
                  : "bg-surface border-line-strong";
          return (
            <span
              key={i}
              className={`absolute top-1/2 ${size} -translate-x-1/2 -translate-y-1/2 border-2 transition-colors duration-200 ${shape} ${tone}`}
              style={{ left: `${pos(i)}%` }}
            />
          );
        })}

        <AnimatePresence>
          {pulse && !reduceMotion && (
            <motion.span key={`pulse-${pulse.key}`} className="pointer-events-none absolute inset-0">
              {/* Travelling packet */}
              <motion.span
                className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-node bg-accent shadow-glow"
                initial={{ left: `${pos(Math.max(0, pulse.from))}%`, opacity: 1 }}
                animate={{ left: `${pos(pulse.to)}%`, opacity: [1, 1, 0] }}
                transition={{ duration: 0.22, ease: "easeIn" }}
              />
              {/* Ripple at the destination */}
              <motion.span
                className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-node border-2 border-accent-ink"
                style={{ left: `${pos(pulse.to)}%` }}
                initial={{ scale: 1, opacity: 0 }}
                animate={{ scale: [1, 2.8], opacity: [0.9, 0] }}
                transition={{ delay: 0.15, duration: 0.22, ease: "easeOut" }}
              />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
