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
  idle: "border-line bg-surface hover:border-line-strong hover:bg-surface-raised",
  selected: "border-accent-ink bg-accent-soft",
  correct: "border-success bg-success-soft",
  incorrect: "border-danger bg-danger-soft",
};

const badgeClasses: Record<Tone, string> = {
  idle: "border-line-strong text-ink-muted",
  selected: "border-accent bg-accent text-on-accent",
  correct: "border-success bg-success text-on-success",
  incorrect: "border-danger bg-danger text-on-danger",
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
      <div role="radiogroup" aria-labelledby={promptId} className="mt-8 grid gap-2.5">
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
              whileTap={locked ? undefined : { scale: 0.985 }}
              className={`flex min-h-14 w-full items-center gap-3.5 rounded-control border-2 px-3.5 py-3 text-left text-lead font-medium transition-colors duration-150 disabled:cursor-default ${toneClasses[tone]} ${locked && !selected ? "opacity-55" : ""}`}
            >
              <span
                aria-hidden="true"
                className={`grid size-8 shrink-0 place-items-center rounded-sm border-2 font-mono text-small font-semibold transition-colors ${badgeClasses[tone]}`}
              >
                {tone === "correct" ? (
                  <CheckIcon className="size-4" strokeWidth={2.5} />
                ) : tone === "incorrect" ? (
                  <XIcon className="size-4" strokeWidth={2.5} />
                ) : (
                  i + 1
                )}
              </span>
              <span className="flex-1">{option.text}</span>
              {tone === "correct" && <span className="sr-only">(correct)</span>}
              {tone === "incorrect" && <span className="sr-only">(incorrect)</span>}
            </motion.button>
          );
        })}
      </div>
      <p className="mt-4 hidden text-caption text-ink-faint sm:block">
        Press <kbd className="rounded-sm border border-line px-1 font-mono">1</kbd>–
        <kbd className="rounded-sm border border-line px-1 font-mono">{card.options.length}</kbd> to pick,{" "}
        <kbd className="rounded-sm border border-line px-1 font-mono">Enter</kbd> to check.
      </p>
    </div>
  );
}
