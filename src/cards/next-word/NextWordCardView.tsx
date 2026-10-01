"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import { useFeedback } from "@/lib/feedback";
import { CardPrompt } from "../CardPrompt";
import { CardStatusNote } from "../CardStatusNote";
import type { CardComponentProps } from "../types";
import { percent } from "./grade";
import { atTemperature, samplePicks, temperatureStops } from "./model";
import type { NextWordAnswer, NextWordCard } from "./schema";

/** One bar per word: the chance the model picks it, in words and a bar (never the bar alone). */
function Bars({ card, temperature, highlight }: { card: NextWordCard; temperature: number; highlight: string | null }) {
  const shares = atTemperature(card.candidates, temperature);
  return (
    <ul aria-label="Chance of each next word" className="mt-4 space-y-2">
      {card.candidates.map((c, i) => (
        <li key={c.word} className="grid grid-cols-[minmax(4.5rem,auto)_1fr_3rem] items-center gap-3">
          <span className={`truncate text-body ${c.word === highlight ? "font-semibold text-ink" : "text-ink-muted"}`}>{c.word}</span>
          <span aria-hidden="true" className="h-3 overflow-hidden rounded-sm bg-surface-raised">
            <span
              className={`block h-full rounded-sm transition-[width] duration-200 ease-out-quick ${c.word === highlight ? "bg-ink" : "bg-ink-muted"}`}
              style={{ width: `${(shares[i]! * 100).toFixed(1)}%` }}
            />
          </span>
          <span className="text-right font-mono text-small text-ink tabular-nums">{percent(shares[i]!)}</span>
        </li>
      ))}
    </ul>
  );
}

export function NextWordCardView({ card, answer, onAnswerChange, status }: CardComponentProps<NextWordCard, NextWordAnswer>) {
  const locked = status !== "answering";
  const feedback = useFeedback();
  const id = useId();
  const [samples, setSamples] = useState(false);
  const pickGoal = card.goal.type === "pick";
  const { min, max, step } = card.temperature;
  const stops = temperatureStops(min, max, step);
  const goalWord: string | null = card.goal.type === "probability" ? (card.goal.word ?? null) : card.goal.word;

  return (
    <div>
      <CardPrompt id={`${id}-prompt`}>{card.prompt}</CardPrompt>

      <p className="mt-5 rounded-card border border-line bg-surface-raised px-4 py-3 text-lead text-ink">
        {card.context}{" "}
        <span className="inline-block min-w-16 border-b-2 border-dashed border-line-strong text-center font-semibold">
          {pickGoal && answer.pick ? answer.pick : <span className="sr-only">next word</span>}
          {!(pickGoal && answer.pick) && <span aria-hidden="true">&nbsp;</span>}
        </span>
      </p>

      {pickGoal ? (
        <>
          <div role="radiogroup" aria-labelledby={`${id}-prompt`} className="mt-4 grid grid-cols-2 gap-2">
            {card.candidates.map((c) => {
              const selected = answer.pick === c.word;
              return (
                <button
                  key={c.word}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={locked}
                  onClick={() => {
                    onAnswerChange({ ...answer, pick: c.word });
                    feedback.haptic("tap");
                  }}
                  className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-control border-2 px-3 text-body font-semibold transition-colors disabled:cursor-default ${
                    selected ? "border-accent-ink bg-accent-soft text-ink" : "border-line-strong bg-surface text-ink-muted"
                  } ${locked ? "" : "hover:border-accent-ink hover:text-ink"}`}
                >
                  {selected && <CheckIcon className="size-4" strokeWidth={2.5} />}
                  {c.word}
                </button>
              );
            })}
          </div>
          {/* The chances stay hidden until Check: the question is which one you think wins. */}
          {locked && (
            <div aria-live="polite">
              <p className="mt-5 font-mono text-caption font-semibold tracking-widest text-ink-faint uppercase">The model&apos;s chances</p>
              <Bars card={card} temperature={card.temperature.start} highlight={goalWord} />
            </div>
          )}
        </>
      ) : (
        <>
          <Bars card={card} temperature={answer.temperature} highlight={goalWord ?? null} />
          <div className="mt-5 rounded-control border border-line bg-surface px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={`${id}-temperature`} className="text-small font-semibold text-ink">
                Temperature
              </label>
              <span className="font-mono text-small text-ink tabular-nums">{answer.temperature.toFixed(1)}</span>
            </div>
            <input
              id={`${id}-temperature`}
              type="range"
              min={min}
              max={max}
              step={step}
              value={answer.temperature}
              disabled={locked}
              aria-valuetext={`${answer.temperature.toFixed(1)}`}
              onChange={(e) => {
                // Snap to a real stop, so 0.1 steps never drift (0.30000000000000004).
                const value = Number(e.target.value);
                const snapped = stops.reduce((best, s) => (Math.abs(s - value) < Math.abs(best - value) ? s : best), stops[0]!);
                onAnswerChange({ ...answer, temperature: snapped });
              }}
              className="mt-2 h-8 w-full accent-[var(--color-accent)]"
            />
            <div className="flex justify-between text-caption text-ink-faint" aria-hidden="true">
              <span>Predictable</span>
              <span>Surprising</span>
            </div>
          </div>
          <div className="mt-4">
            <Button variant="secondary" className="min-h-11 px-4 text-small" onClick={() => setSamples(true)}>
              Generate 5
            </Button>
            {samples && (
              <ul aria-label="Five sample picks at this temperature" aria-live="polite" className="mt-3 flex flex-wrap gap-2">
                {samplePicks(card.candidates, answer.temperature, card.id).map((word, i) => (
                  <li key={i} className="rounded-sm border border-line bg-surface-raised px-2.5 py-1 text-small text-ink">
                    {word}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <CardStatusNote
        status={status}
        correctText={pickGoal ? "That's the likeliest next word" : "Goal met"}
        incorrectText={pickGoal ? "That isn't the likeliest word" : "Not there yet"}
      />
    </div>
  );
}
