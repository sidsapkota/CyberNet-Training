"use client";

import { useId, useState } from "react";
import { ChevronDownIcon, HintIcon, WarningIcon } from "@/components/ui/icons";
import { Markdown } from "@/components/ui/Markdown";
import { CardPrompt } from "../CardPrompt";
import { CardStatusNote } from "../CardStatusNote";
import type { CardComponentProps } from "../types";
import { parseNumericInput } from "./grade";
import type { NumericInputAnswer, NumericInputCard } from "./schema";

const BADGE = { decimal: "DEC", binary: "BIN", hex: "HEX" } as const;
const INPUT_MODE = { decimal: "decimal", binary: "numeric", hex: "text" } as const;

export function NumericInputCardView({
  card,
  answer,
  onAnswerChange,
  status,
}: CardComponentProps<NumericInputCard, NumericInputAnswer>) {
  const promptId = useId();
  const messageId = useId();
  const hintId = useId();
  const [showHint, setShowHint] = useState(false);
  const locked = status !== "answering";
  const parsed = parseNumericInput(answer, card.base);
  const invalid = parsed.status === "invalid";

  const border =
    status === "correct"
      ? "border-success bg-success-soft"
      : status === "incorrect"
        ? "border-danger bg-danger-soft"
        : invalid
          ? "border-warning bg-surface"
          : "border-line-strong bg-surface focus-within:border-accent-ink";

  return (
    <div>
      <CardPrompt id={promptId}>{card.prompt}</CardPrompt>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div
          className={`flex min-h-14 w-full max-w-sm items-center gap-3 rounded-control border-2 px-3 transition-colors ${border}`}
        >
          <span
            className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 font-mono text-caption font-semibold text-ink-muted"
            title={`${card.base} number`}
          >
            {BADGE[card.base]}
          </span>
          <input
            type="text"
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            readOnly={locked}
            data-enter-submits
            inputMode={INPUT_MODE[card.base]}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="done"
            aria-labelledby={promptId}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? messageId : undefined}
            placeholder={card.base === "binary" ? "0101" : card.base === "hex" ? "FF" : "0"}
            className="min-w-0 flex-1 bg-transparent py-3 font-mono text-lead font-semibold text-ink tracking-wide outline-none placeholder:text-ink-faint/60 read-only:cursor-default"
          />
          {card.unit && <span className="shrink-0 text-body text-ink-muted">{card.unit}</span>}
        </div>
      </div>

      <p id={messageId} aria-live="polite" className="mt-3 min-h-6 text-small">
        {invalid && status === "answering" && (
          <span className="inline-flex items-start gap-1.5 font-medium text-warning">
            <WarningIcon className="mt-0.5 size-4 shrink-0" />
            {parsed.message}
          </span>
        )}
      </p>

      <CardStatusNote status={status} correctText="That's the right number" incorrectText="Not the right number" />

      {card.hint && (
        <div className="mt-4">
          <button
            type="button"
            data-keyboard-passthrough
            aria-expanded={showHint}
            aria-controls={hintId}
            onClick={() => setShowHint((v) => !v)}
            className="inline-flex items-center gap-1.5 text-small font-semibold text-ink-muted hover:text-ink"
          >
            <HintIcon className="size-4" />
            {showHint ? "Hide hint" : "Show hint"}
            <ChevronDownIcon className={`size-4 transition-transform ${showHint ? "rotate-180" : ""}`} />
          </button>
          {showHint && (
            <div id={hintId} className="mt-2 rounded-control border border-line bg-surface-raised px-3 py-2">
              <Markdown className="text-small text-ink-muted">{card.hint}</Markdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
