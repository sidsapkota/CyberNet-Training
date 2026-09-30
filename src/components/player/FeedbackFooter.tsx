"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { CheckIcon, ChevronDownIcon, XIcon } from "@/components/ui/icons";
import { Markdown } from "@/components/ui/Markdown";

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
  explanation?: string;
  /** If true, the explanation starts hidden behind a "Show explanation" toggle. */
  collapseExplanation?: boolean;
  primary: FooterAction;
  secondary?: FooterAction;
}

const toneStyles: Record<FeedbackTone, { panel: string; text: string; button: ButtonVariant }> = {
  neutral: { panel: "border-line bg-canvas", text: "text-ink", button: "primary" },
  correct: { panel: "border-success/30 bg-success-soft", text: "text-success", button: "success" },
  incorrect: { panel: "border-danger/30 bg-danger-soft", text: "text-danger", button: "danger" },
};

/**
 * Sticky bottom bar: shows feedback after checking and holds the primary action.
 * The parent should change its `key` per card and status so local state resets.
 */
export function FeedbackFooter({
  tone,
  heading,
  subheading,
  xpAwarded = 0,
  explanation,
  collapseExplanation = false,
  primary,
  secondary,
}: FeedbackFooterProps) {
  const [showExplanation, setShowExplanation] = useState(!collapseExplanation);
  const explanationId = useId();
  const style = toneStyles[tone];
  const hasFeedback = tone !== "neutral";

  return (
    <motion.footer
      layout
      className={`sticky bottom-0 z-20 border-t-2 transition-colors duration-200 ${style.panel}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto max-w-lesson px-gutter py-4 sm:py-5">
        <AnimatePresence initial={false}>
          {hasFeedback && heading && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className="mb-4"
              role="status"
              aria-live="polite"
            >
              <div className={`flex items-center gap-3 ${style.text}`}>
                <motion.span
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                  className={`grid size-9 place-items-center rounded-pill text-on-primary ${
                    tone === "correct" ? "bg-success" : "bg-danger"
                  }`}
                >
                  {tone === "correct" ? (
                    <CheckIcon className="size-5" strokeWidth={3} />
                  ) : (
                    <XIcon className="size-5" strokeWidth={3} />
                  )}
                </motion.span>
                <div className="flex-1">
                  <p className="text-xl font-bold">{heading}</p>
                  {subheading && <p className="text-sm font-medium opacity-90">{subheading}</p>}
                </div>
                {xpAwarded > 0 && (
                  <motion.span
                    initial={{ opacity: 0, y: 8, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 16 }}
                    className="rounded-pill bg-xp-soft px-3 py-1 text-sm font-bold text-xp"
                  >
                    +{xpAwarded} XP
                  </motion.span>
                )}
              </div>

              {explanation && collapseExplanation && (
                <button
                  type="button"
                  data-keyboard-passthrough
                  aria-expanded={showExplanation}
                  aria-controls={explanationId}
                  onClick={() => setShowExplanation((v) => !v)}
                  className={`mt-3 inline-flex items-center gap-1 text-sm font-semibold underline-offset-2 hover:underline ${style.text}`}
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
                    <Markdown className="mt-3 max-h-[38dvh] overflow-y-auto text-base leading-relaxed text-ink">
                      {explanation}
                    </Markdown>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
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
