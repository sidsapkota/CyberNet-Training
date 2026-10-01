"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import {
  BackIcon,
  CheckIcon,
  ChevronDownIcon,
  GoalIcon,
  HintIcon,
  XIcon,
  XpIcon,
} from "@/components/ui/icons";
import { Markdown } from "@/components/ui/Markdown";
import { Mascot } from "@/components/mascot/Mascot";
import { type WrongTheme, WrongBurst } from "./WrongBurst";
import { StreakIcon } from "@/components/streak/StreakIcon";
import type { MascotExpression } from "@/components/mascot/poses";

export type FeedbackTone = "neutral" | "correct" | "incorrect";

/** The card's hint (lessons and Mistake review): a footer button, its text above the buttons. */
export interface FooterHint {
  text: string;
  /** Opened before on this card: it starts open, and opening it costs nothing more. */
  used: boolean;
  onUse: () => void;
  /** e.g. "costs 5 XP", shown on the button so the cost is known before tapping. */
  cost?: string;
}

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
  /** Back to the previous card (read-only), beside the main button. */
  back?: FooterAction;
  /** The course's wrong-answer animation, played over the cross on a wrong answer. */
  wrongTheme?: WrongTheme;
  /** A small mascot beside the feedback (lessons, every answer), with a one-shot reaction. */
  mascot?: MascotExpression;
  hint?: FooterHint;
}

const toneStyles: Record<
  FeedbackTone,
  { panel: string; text: string; button: ButtonVariant }
> = {
  neutral: {
    panel: "border-line bg-canvas",
    text: "text-ink",
    button: "primary",
  },
  correct: {
    panel: "border-success bg-success-soft",
    text: "text-success",
    button: "success",
  },
  incorrect: {
    panel: "border-danger bg-danger-soft",
    text: "text-danger",
    button: "danger",
  },
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
          correct
            ? "border-success bg-success text-on-success"
            : "border-danger bg-surface text-danger"
        }`}
      >
        {correct ? (
          <CheckIcon className="size-5" strokeWidth={2.5} />
        ) : (
          <XIcon className="size-5" strokeWidth={2.5} />
        )}
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
  back,
  mascot,
  wrongTheme,
  hint,
}: FeedbackFooterProps) {
  const [showExplanation, setShowExplanation] = useState(!collapseExplanation);
  const [hintOpen, setHintOpen] = useState(hint?.used ?? false);
  const explanationId = useId();
  const hintId = useId();
  const style = toneStyles[tone];
  const hasFeedback = tone !== "neutral";

  return (
    <motion.footer
      layout
      data-player-footer
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
                <span className="relative grid shrink-0 place-items-center">
                  <StatusNode correct={tone === "correct"} />
                  {/* The course's little wrong-answer moment, over the cross (never in the way). */}
                  {tone === "incorrect" && wrongTheme && (
                    <span className="pointer-events-none absolute -inset-2 grid place-items-center">
                      <WrongBurst theme={wrongTheme} />
                    </span>
                  )}
                </span>
                <div className="flex-1">
                  <p className={`text-lead font-semibold ${style.text}`}>
                    {heading}
                  </p>
                  {subheading && (
                    <Markdown className="text-small text-ink">
                      {subheading}
                    </Markdown>
                  )}
                </div>
                {mascot && (
                  // Blinks while shown; hops on a right answer, tilts its head (with a gentle bob) on a wrong one.
                  <Mascot
                    expression={mascot}
                    size={60}
                    className="-my-3"
                    idle
                    reaction={
                      tone === "correct"
                        ? "hop"
                        : tone === "incorrect"
                          ? "tilt"
                          : "bob"
                    }
                  />
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
                    <span className="sr-only">
                      {" "}
                      XP toward today&apos;s goal
                    </span>
                    <span
                      aria-hidden="true"
                      className="font-sans text-caption font-medium text-ink-faint"
                    >
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

        <AnimatePresence initial={false}>
          {hint && hintOpen && (
            <motion.div
              id={hintId}
              key="hint"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="mb-3 flex max-h-[30dvh] gap-2 overflow-y-auto rounded-control border border-line bg-surface-raised px-3 py-2">
                <HintIcon className="mt-0.5 size-4 shrink-0 text-ink-muted" />
                <Markdown className="text-small text-ink">{hint.text}</Markdown>
              </div>
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
          {/* Back sits right beside the main button, so going back is always one tap away. */}
          <div className="flex gap-2">
            {back && (
              <Button
                variant="secondary"
                data-keyboard-passthrough
                onClick={back.onClick}
                disabled={back.disabled}
                aria-label={back.label}
                title="Back (Alt + Left arrow)"
                className="shrink-0 px-4"
              >
                <BackIcon className="size-5" />
                <span className="hidden min-[400px]:inline">Back</span>
              </Button>
            )}
            {hint && (
              <button
                type="button"
                data-keyboard-passthrough
                aria-expanded={hintOpen}
                aria-controls={hintId}
                aria-label={
                  hintOpen
                    ? "Hide hint"
                    : `Hint${!hint.used && hint.cost ? `, ${hint.cost}` : ""}`
                }
                onClick={() => {
                  if (!hint.used) hint.onUse();
                  setHintOpen((v) => !v);
                }}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-left hover:border-line-strong"
              >
                <HintIcon className="size-4 shrink-0" />
                <span className="flex flex-col leading-tight">
                  <span className="text-small font-semibold text-ink">
                    {hintOpen ? "Hide hint" : "Hint"}
                  </span>
                  {!hint.used && hint.cost && (
                    <span className="text-caption text-ink-faint">
                      {hint.cost}
                    </span>
                  )}
                </span>
              </button>
            )}
            <Button
              variant={style.button}
              onClick={primary.onClick}
              disabled={primary.disabled}
              className="min-w-0 flex-1 sm:w-auto sm:min-w-40 sm:flex-none"
            >
              {primary.label}
            </Button>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
