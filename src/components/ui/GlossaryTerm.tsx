"use client";

import * as Popover from "@radix-ui/react-popover";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { glossaryEntry } from "@/lib/glossary";
import { POPOVER_SPRING } from "@/lib/motion";

/**
 * A tappable glossary term inside card text: a dotted underline (cyan = interactive) that opens a
 * small definition popover. Radix handles focus, Escape, outside clicks and collision-aware
 * placement. `data-keyboard-passthrough` stops Enter from also pressing the lesson's Check button.
 */
export function GlossaryTerm({ id, children }: { id: string; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const entry = glossaryEntry(id);
  if (!entry) return <>{children}</>; // content checks make this unreachable

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          data-keyboard-passthrough
          className="inline cursor-help rounded-sm text-left font-[inherit] text-inherit underline decoration-accent-ink decoration-dotted decoration-2 underline-offset-4 hover:bg-accent-soft"
        >
          {children}
          <span className="sr-only"> (definition)</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={8}
          collisionPadding={16}
          aria-label={`${entry.term}: definition`}
          className="z-50 w-[min(18rem,calc(100vw-2rem))] outline-none"
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={POPOVER_SPRING}
            style={{ transformOrigin: "var(--radix-popover-content-transform-origin)" }}
            className="rounded-card border-2 border-accent-ink bg-surface p-3 shadow-lift"
          >
            <p className="text-small font-semibold text-ink">{entry.term}</p>
            <p className="mt-1 text-small text-ink-muted">{entry.definition}</p>
          </motion.div>
          <Popover.Arrow width={14} height={7} className="fill-accent-ink" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
