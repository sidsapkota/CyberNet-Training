"use client";

import * as Popover from "@radix-ui/react-popover";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useState } from "react";
import { POPOVER_SPRING } from "@/lib/motion";

export type ProgressNodeState = "done" | "skipped" | "current" | "upcoming";

export interface ProgressNode {
  state: ProgressNodeState;
  /** Challenge cards are drawn as diamonds, so optional cards read differently at a glance. */
  challenge?: boolean;
}

/**
 * Lesson progress as a network trace: one node per card on a line. The lit segment runs
 * up to the furthest completed node. When `pulse` changes, a cyan pulse travels from
 * `pulse.from` to `pulse.to` and the destination node ripples (~370ms total). The current card's
 * node is larger, filled and ringed, so where you are is obvious.
 *
 * With `onJump`, tapping the trace opens the lesson's cards as 44px numbered nodes: answered cards
 * open (read-only, in the player), the current one says so, upcoming ones can't be opened yet.
 */
export function NodeProgress({
  nodes,
  label,
  pulse,
  onJump,
  viewing,
}: {
  nodes: ProgressNode[];
  label: string;
  pulse?: { key: number; from: number; to: number } | null;
  /** Go to card `index` (offered for answered cards and the current one). */
  onJump?: (index: number) => void;
  /** The card being looked back at, if any (marked in the card list). */
  viewing?: number | null;
}) {
  const trace = <Trace nodes={nodes} label={label} pulse={pulse} />;
  if (!onJump) return trace;
  return <JumpMenu nodes={nodes} label={label} onJump={onJump} viewing={viewing ?? null} trace={trace} />;
}

/** The trace as a button that opens the lesson's cards (44px each). */
function JumpMenu({
  nodes,
  label,
  onJump,
  viewing,
  trace,
}: {
  nodes: ProgressNode[];
  label: string;
  onJump: (index: number) => void;
  viewing: number | null;
  trace: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const current = nodes.findIndex((n) => n.state === "current");
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`${label}. Show the cards`}
          className="flex min-h-11 min-w-0 flex-1 items-center rounded-control px-1 transition-colors hover:bg-surface-raised active:bg-surface-raised"
        >
          {trace}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="bottom" sideOffset={8} collisionPadding={16} className="z-40 w-[min(20rem,calc(100vw-2rem))] outline-none">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={POPOVER_SPRING}
            style={{ transformOrigin: "var(--radix-popover-content-transform-origin)" }}
            className="rounded-card border border-line-strong bg-surface p-4 shadow-lift"
          >
            <p className="font-mono text-caption tracking-widest text-ink-faint uppercase">Cards in this lesson</p>
            <ol className="mt-3 flex flex-wrap gap-2">
              {nodes.map((node, i) => {
                const here = i === current;
                const reachable = here || node.state === "done" || node.state === "skipped";
                const word = here ? "you're here" : node.state === "done" ? "done" : node.state === "skipped" ? "skipped" : "not yet";
                return (
                  <li key={i}>
                    <button
                      type="button"
                      disabled={!reachable}
                      aria-current={here ? "step" : undefined}
                      aria-label={`Card ${i + 1}, ${word}${viewing === i ? ", showing now" : ""}`}
                      onClick={() => {
                        onJump(i);
                        setOpen(false);
                      }}
                      className={`grid size-11 place-items-center rounded-node border-2 font-mono text-small font-semibold transition-colors disabled:cursor-not-allowed ${
                        here
                          ? "border-accent-ink bg-accent text-on-accent"
                          : node.state === "done"
                            ? "border-accent-ink bg-accent-soft text-ink hover:bg-accent hover:text-on-accent"
                            : node.state === "skipped"
                              ? "border-warning bg-surface text-ink hover:bg-warning-soft"
                              : "border-line bg-surface text-ink-faint"
                      } ${viewing === i ? "ring-2 ring-accent-ink ring-offset-2 ring-offset-surface" : ""}`}
                    >
                      {i + 1}
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 text-caption text-ink-muted">Answered cards open to look back at. Nothing is marked again.</p>
            <Popover.Arrow className="fill-surface" />
          </motion.div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Trace({
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
                ? "bg-accent-soft border-accent-ink ring-4 ring-accent/30"
                : node.state === "skipped"
                  ? "bg-canvas border-warning"
                  : "bg-surface border-line-strong";
          // Where you are: a larger, filled node with a soft ring (no loop).
          const isCurrent = node.state === "current";
          return (
            <span
              key={i}
              className={`absolute top-1/2 ${isCurrent ? "size-3.5" : size} -translate-x-1/2 -translate-y-1/2 border-2 transition-colors duration-200 ${shape} ${tone}`}
              style={{ left: `${pos(i)}%` }}
            >
            </span>
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
