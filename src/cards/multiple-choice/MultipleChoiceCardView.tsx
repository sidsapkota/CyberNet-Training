"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { digitKeyIndex, useGlobalKeyDown } from "@/lib/keyboard";
import { CardPrompt } from "../CardPrompt";
import type { CardComponentProps } from "../types";
import type { MultipleChoiceAnswer, MultipleChoiceCard } from "./schema";

type Tone = "idle" | "selected" | "correct" | "incorrect";

const toneClasses: Record<Tone, string> = {
  idle: "border-line bg-surface hover:border-line-strong hover:bg-surface-muted",
  selected: "border-primary bg-primary-soft",
  correct: "border-success bg-success-soft",
  incorrect: "border-danger bg-danger-soft",
};

const badgeClasses: Record<Tone, string> = {
  idle: "border-line-strong text-ink-muted",
  selected: "border-primary bg-primary text-on-primary",
  correct: "border-success bg-success text-on-primary",
  incorrect: "border-danger bg-danger text-on-primary",
};

export function MultipleChoiceCardView({
  card,
  answer,
  onAnswerChange,
  status,
}: CardComponentProps<MultipleChoiceCard, MultipleChoiceAnswer>) {
  const promptId = useId();
  const locked = status !== "answering";

  useGlobalKeyDown((event) => {
    const index = digitKeyIndex(event.key, card.options.length);
    const option = index === null ? undefined : card.options[index];
    if (option) {
      event.preventDefault();
      onAnswerChange(option.id);
    }
  }, !locked);

  return (
    <div>
      <CardPrompt id={promptId}>{card.prompt}</CardPrompt>
      <div role="radiogroup" aria-labelledby={promptId} className="mt-8 grid gap-3">
        {card.options.map((option, i) => {
          const selected = answer === option.id;
          const tone: Tone = !selected
            ? "idle"
            : status === "correct"
              ? "correct"
              : status === "incorrect"
                ? "incorrect"
                : "selected";
          return (
            <motion.button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={locked}
              onClick={() => onAnswerChange(option.id)}
              whileTap={locked ? undefined : { scale: 0.98 }}
              className={`flex min-h-14 w-full items-center gap-4 rounded-control border-2 px-4 py-3 text-left text-lg font-medium transition-colors duration-150 disabled:cursor-default ${toneClasses[tone]} ${locked && !selected ? "opacity-55" : ""}`}
            >
              <span
                aria-hidden="true"
                className={`grid size-8 shrink-0 place-items-center rounded-lg border-2 text-sm font-bold transition-colors ${badgeClasses[tone]}`}
              >
                {tone === "correct" ? (
                  <CheckIcon className="size-4" strokeWidth={3} />
                ) : tone === "incorrect" ? (
                  <XIcon className="size-4" strokeWidth={3} />
                ) : (
                  i + 1
                )}
              </span>
              <span className="flex-1">{option.text}</span>
            </motion.button>
          );
        })}
      </div>
      <p className="mt-4 hidden text-sm text-ink-faint sm:block">
        Tip: press 1 to {card.options.length} to pick an answer, then Enter to check.
      </p>
    </div>
  );
}
