"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { CheckIcon, ChevronDownIcon, GoalIcon, XIcon, XpIcon } from "@/components/ui/icons";
import { Markdown } from "@/components/ui/Markdown";
import { Mascot } from "@/components/mascot/Mascot";
import { StreakIcon } from "@/components/streak/StreakIcon";
import type { MascotExpression } from "@/components/mascot/poses";

export type FeedbackTone = "neutral" | "correct" | "incorrect";

export interface FooterAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface FeedbackFooterProps {
  tone: FeedbackTone;
  heading?: string;
  subheading?: string;
  xpAwarded?: number;
  /** Practice XP a replayed card added toward today's goal (never total XP). */
  practiceXp?: number;
  /** Shown under the heading when this answer met the daily goal. */
  goalNote?: string;
  explanation?: string;
  /** If true, the explanation starts hidden behind a "Show explanation" toggle. */
  collapseExplanation?: boolean;
  primary: FooterAction;
  secondary?: FooterAction;
  /** A small mascot beside the feedback (lessons, every answer), with a one-shot reaction. */
  mascot?: MascotExpression;
}

const toneStyles: Record<FeedbackTone, { panel: string; text: string; button: ButtonVariant }> = {
  neutral: { panel: "border-line bg-canvas", text: "text-ink", button: "primary" },
  correct: { panel: "border-success bg-success-soft", text: "text-success", button: "success" },
  incorrect: { panel: "border-danger bg-danger-soft", text: "text-danger", button: "danger" },
};

/**
 * Status node: fills in with a check (correct) or shows a cross (wrong). Icon + heading text
 * mean right/wrong never depends on colour alone.
 */
function StatusNode({ correct }: { correct: boolean }) {
  return (
    <span className="relative grid size-9 shrink-0 place-items-center">
      {correct && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-node border-2 border-success"
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: 1.7, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      )}
      <motion.span
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 600, damping: 24 }}
        className={`grid size-9 place-items-center rounded-node border-2 ${
          correct ? "border-success bg-success text-on-success" : "border-danger bg-surface text-danger"
        }`}
      >
        {correct ? <CheckIcon className="size-5" strokeWidth={2.5} /> : <XIcon className="size-5" strokeWidth={2.5} />}
      </motion.span>
    </span>
  );
}

/**
 * Sticky bottom bar: feedback after checking plus the primary action.
 * The parent changes its `key` per card and status so local state resets.
 */
export function FeedbackFooter({
  tone,
  heading,
  subheading,
  xpAwarded = 0,
  practiceXp = 0,
  goalNote,
  explanation,
  collapseExplanation = false,
  primary,
  secondary,
  mascot,
}: FeedbackFooterProps) {
  const [showExplanation, setShowExplanation] = useState(!collapseExplanation);
  const explanationId = useId();
  const style = toneStyles[tone];
  const hasFeedback = tone !== "neutral";

  return (
    <motion.footer
      layout
      className={`sticky bottom-0 z-20 border-t-2 ${style.panel}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto max-w-lesson px-gutter py-4">
        <AnimatePresence initial={false}>
          {hasFeedback && heading && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="mb-4"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-3">
                <StatusNode correct={tone === "correct"} />
                <div className="flex-1">
                  <p className={`text-lead font-semibold ${style.text}`}>{heading}</p>
                  {subheading && <Markdown className="text-small text-ink">{subheading}</Markdown>}
                </div>
                {mascot && (
                  // Blinks while shown; hops on a right answer, tilts its head (with a gentle bob) on a wrong one.
                  <Mascot expression={mascot} size={60} className="-my-3" idle reaction={tone === "correct" ? "hop" : tone === "incorrect" ? "tilt" : "bob"} />
                )}
                {xpAwarded > 0 && (
                  <motion.span
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12, duration: 0.2 }}
                    className="inline-flex items-center gap-1 rounded-control border border-line bg-surface px-2.5 py-1 font-mono text-small font-semibold text-accent-ink"
                  >
                    <XpIcon className="size-4" />+{xpAwarded} XP
                  </motion.span>
                )}
                {xpAwarded === 0 && practiceXp > 0 && (
                  <motion.span
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12, duration: 0.2 }}
                    className="inline-flex items-center gap-1 rounded-control border border-line bg-surface px-2.5 py-1 font-mono text-small font-semibold text-accent-ink"
                  >
                    <GoalIcon className="size-4" />+{practiceXp}
                    <span className="sr-only"> XP toward today&apos;s goal</span>
                    <span aria-hidden="true" className="font-sans text-caption font-medium text-ink-faint">
                      today
                    </span>
                  </motion.span>
                )}
              </div>
              {goalNote && (
                <p className="mt-2 flex items-center gap-2 text-small font-semibold text-accent-ink">
                  <StreakIcon lit className="size-4" />
                  {goalNote}
                </p>
              )}

              {explanation && collapseExplanation && (
                <button
                  type="button"
                  data-keyboard-passthrough
                  aria-expanded={showExplanation}
                  aria-controls={explanationId}
                  onClick={() => setShowExplanation((v) => !v)}
                  className="mt-1 inline-flex min-h-11 items-center gap-1 text-small font-semibold text-ink underline-offset-2 hover:underline"
                >
                  {showExplanation ? "Hide explanation" : "Show explanation"}
                  <ChevronDownIcon
                    className={`size-4 transition-transform ${showExplanation ? "rotate-180" : ""}`}
                  />
                </button>
              )}

              <AnimatePresence initial={false}>
                {explanation && showExplanation && (
                  <motion.div
                    id={explanationId}
                    key="explanation"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <Markdown className="mt-3 max-h-[38dvh] overflow-y-auto text-body text-ink">
                      {explanation}
                    </Markdown>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          {secondary && (
            <Button
              variant="ghost"
              data-keyboard-passthrough
              onClick={secondary.onClick}
              disabled={secondary.disabled}
              className="sm:mr-auto"
            >
              {secondary.label}
            </Button>
          )}
          <Button
            variant={style.button}
            onClick={primary.onClick}
            disabled={primary.disabled}
            className="w-full sm:w-auto sm:min-w-40"
          >
            {primary.label}
          </Button>
        </div>
      </div>
    </motion.footer>
  );
}
