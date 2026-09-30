"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { ChevronDownIcon, HintIcon } from "@/components/ui/icons";
import { Markdown } from "@/components/ui/Markdown";

/**
 * The "Hint" button under a lesson card. Opening it once counts as using the hint (the card then
 * pays retry XP, which `xpNote` says up front); after that it can be hidden and shown freely.
 * Lessons only: quizzes never render it.
 */
export function HintReveal({
  hint,
  used,
  onUse,
  xpNote,
}: {
  hint: string;
  used: boolean;
  onUse: () => void;
  /** e.g. "+5 XP instead of +10". Omit when the card pays no XP anyway. */
  xpNote?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(used);
  const panelId = useId();

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          data-keyboard-passthrough
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            if (!used) onUse();
            setOpen((v) => !v);
          }}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-small font-semibold text-ink hover:border-line-strong"
        >
          <HintIcon className="size-4" />
          {open ? "Hide hint" : "Hint"}
          <ChevronDownIcon className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {!used && xpNote && <span className="text-caption text-ink-faint">Using it: {xpNote}</span>}
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="hint"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-control border border-line bg-surface-raised px-3 py-2">
              <Markdown className="text-small text-ink">{hint}</Markdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
