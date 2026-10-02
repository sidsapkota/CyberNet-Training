"use client";

import { useId } from "react";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { digitKeyIndex, useGlobalKeyDown } from "@/lib/keyboard";
import { CardPrompt } from "../CardPrompt";
import type { CardComponentProps } from "../types";
import type { TrueFalseAnswer, TrueFalseCard } from "./schema";

const CHOICES = [
  { value: true, label: "True" },
  { value: false, label: "False" },
] as const;

/** A statement, then True or False (keys 1 and 2). Right or wrong only shows after Check. */
export function TrueFalseCardView({ card, answer, onAnswerChange, status }: CardComponentProps<TrueFalseCard, TrueFalseAnswer>) {
  const promptId = useId();
  const locked = status !== "answering";

  useGlobalKeyDown((event) => {
    const index = digitKeyIndex(event.key, 2);
    if (index !== null) {
      event.preventDefault();
      onAnswerChange(CHOICES[index]!.value);
    }
  }, !locked);

  return (
    <div>
      <CardPrompt id={promptId}>{card.prompt}</CardPrompt>
      <div role="radiogroup" aria-labelledby={promptId} className="mt-4 grid grid-cols-2 gap-3 sm:mt-8">
        {CHOICES.map((choice) => {
          const selected = answer === choice.value;
          const tone = !selected
            ? "border-line bg-surface hover:border-line-strong"
            : status === "correct"
              ? "border-success bg-success-soft"
              : status === "incorrect"
                ? "border-danger bg-danger-soft"
                : "border-accent-ink bg-accent-soft";
          return (
            <button
              key={choice.label}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={locked}
              onClick={() => onAnswerChange(choice.value)}
              className={`flex min-h-16 items-center justify-center gap-2 rounded-control border-2 text-lead font-semibold transition-colors disabled:cursor-default ${tone}`}
            >
              {selected && status === "correct" && <CheckIcon className="size-5 text-success" />}
              {selected && status === "incorrect" && <XIcon className="size-5 text-danger" />}
              {choice.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
