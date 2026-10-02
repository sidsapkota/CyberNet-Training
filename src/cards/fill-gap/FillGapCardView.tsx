"use client";

import { useId } from "react";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { Markdown } from "@/components/ui/Markdown";
import { digitKeyIndex, useGlobalKeyDown } from "@/lib/keyboard";
import type { CardComponentProps } from "../types";
import { gapOptions } from "./grade";
import { type FillGapAnswer, type FillGapCard, GAP } from "./schema";

/**
 * A sentence with one gap; tap a word to drop it in (tap another to change it), then Check. The gap
 * shows the chosen word; right or wrong only after Check.
 */
export function FillGapCardView({ card, answer, onAnswerChange, status }: CardComponentProps<FillGapCard, FillGapAnswer>) {
  const promptId = useId();
  const locked = status !== "answering";
  const options = gapOptions(card);
  const chosen = card.options.find((o) => o.id === answer);
  const [before, after] = card.prompt.split(GAP);

  useGlobalKeyDown((event) => {
    const index = digitKeyIndex(event.key, options.length);
    const option = index === null ? undefined : options[index];
    if (option) {
      event.preventDefault();
      onAnswerChange(option.id);
    }
  }, !locked);

  const gapTone =
    status === "correct" ? "border-success bg-success-soft text-ink" : status === "incorrect" ? "border-danger bg-danger-soft text-ink" : chosen ? "border-accent-ink bg-accent-soft text-ink" : "border-dashed border-line-strong text-ink-faint";

  return (
    <div>
      <div id={promptId} className="text-lead font-semibold">
        <Markdown className="inline [&>p]:inline">{before ?? ""}</Markdown>{" "}
        <span className={`mx-0.5 inline-flex min-w-20 items-center justify-center gap-1 rounded-control border-2 px-2 py-0.5 align-baseline ${gapTone}`}>
          {status === "correct" && <CheckIcon className="size-4 text-success" />}
          {status === "incorrect" && <XIcon className="size-4 text-danger" />}
          {chosen ? chosen.text : <span aria-label="blank">____</span>}
        </span>{" "}
        <Markdown className="inline [&>p]:inline">{after ?? ""}</Markdown>
      </div>
      <div role="radiogroup" aria-labelledby={promptId} className="mt-8 flex flex-wrap gap-2.5">
        {options.map((option) => {
          const selected = option.id === answer;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={locked}
              onClick={() => onAnswerChange(option.id)}
              className={`min-h-12 rounded-control border-2 px-4 text-body font-semibold transition-colors disabled:cursor-default ${
                selected ? "border-accent-ink bg-accent-soft" : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              {option.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
