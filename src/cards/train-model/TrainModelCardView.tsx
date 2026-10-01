"use client";

import { useId, useState } from "react";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { useFeedback } from "@/lib/feedback";
import { CardPrompt } from "../CardPrompt";
import { CardStatusNote } from "../CardStatusNote";
import { InlineText } from "../shared/InlineText";
import type { CardComponentProps } from "../types";
import { setLabel, toggleIncluded, trainingSet, trainModelGuesses } from "./grade";
import type { TrainModelAnswer, TrainModelCard } from "./schema";

/**
 * Each label has its own shape (circle, square, triangle), so labels never rely on colour. The
 * chart only shows the data: learners act on the rows below it (44px targets at any width).
 */
function LabelShape({ index, className = "size-4", dashed = false }: { index: number; className?: string; dashed?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={`shrink-0 ${className}`}>
      <LabelShapeInner index={index} dashed={dashed} />
    </svg>
  );
}

type NearestCard = TrainModelCard & { model: Extract<TrainModelCard["model"], { kind: "nearest" }> };

/** Chart space: 0–10 on each axis, drawn in a 240 × 200 box with room for the axis words. */
const X = (v: number) => 36 + v * 19.4;
const Y = (v: number) => 172 - v * 15.6;

function Chart({
  card,
  answer,
  showGuesses,
  active,
}: {
  card: NearestCard;
  answer: TrainModelAnswer;
  showGuesses: boolean;
  active: string | null;
}) {
  const training = new Map(trainingSet(card, answer).map((e) => [e.id, e.label]));
  const guesses = trainModelGuesses(card, answer);
  const labelIndex = (id: string | null | undefined) => card.labels.findIndex((l) => l.id === id);
  const { x, y } = card.model;
  return (
    <svg
      viewBox="0 0 240 200"
      role="img"
      aria-label={`Chart of the examples: ${x.label} across, from ${x.low} to ${x.high}; ${y.label} up, from ${y.low} to ${y.high}. The same examples are listed below.`}
      className="mt-5 w-full max-w-md rounded-card border border-line bg-surface-raised text-ink"
    >
      <path d={`M${X(0)} ${Y(0)}H${X(10)}M${X(0)} ${Y(0)}V${Y(10)}`} stroke="var(--color-line-strong)" strokeWidth={1.5} fill="none" />
      <g className="fill-ink-muted text-[9px]" fontFamily="var(--font-sans)">
        <text x={X(0)} y={188}>{x.low}</text>
        <text x={X(5)} y={188} textAnchor="middle" fontWeight={600}>
          {x.label} →
        </text>
        <text x={X(10)} y={188} textAnchor="end">{x.high}</text>
        <text x={6} y={Y(0)}>{y.low}</text>
        <text x={6} y={Y(10) + 3}>{y.high}</text>
        <text transform={`translate(12 ${Y(5)}) rotate(-90)`} textAnchor="middle" fontWeight={600}>
          {y.label} →
        </text>
      </g>
      {card.examples.map((e) => {
        const label = training.get(e.id);
        const index = labelIndex(label ?? null);
        const left = card.task.goal === "include" && label === undefined;
        return (
          <g key={e.id} transform={`translate(${X(e.x ?? 0) - 7} ${Y(e.y ?? 0) - 7})`} opacity={left ? 0.3 : 1}>
            {active === e.id && <circle cx={7} cy={7} r={11} fill="none" stroke="var(--color-accent-ink)" strokeWidth={2} />}
            <svg width={14} height={14} viewBox="0 0 16 16" overflow="visible">
              <LabelShapeInner index={index < 0 ? 0 : index} dashed={index < 0 || left} />
            </svg>
          </g>
        );
      })}
      {card.tests.map((t, i) => {
        const guess = labelIndex(guesses[t.id]);
        return (
          <g key={t.id} transform={`translate(${X(t.x ?? 0)} ${Y(t.y ?? 0)})`}>
            {active === t.id && <circle r={13} fill="none" stroke="var(--color-accent-ink)" strokeWidth={2} />}
            <path d="M0 -9 9 0 0 9 -9 0Z" fill="var(--color-surface)" stroke="currentColor" strokeWidth={1.5} strokeDasharray="3 2" />
            {showGuesses && guess >= 0 ? (
              <svg x={-5} y={-5} width={10} height={10} viewBox="0 0 16 16">
                <LabelShapeInner index={guess} />
              </svg>
            ) : (
              <text y={3.5} textAnchor="middle" className="fill-ink text-[10px] font-semibold">
                ?
              </text>
            )}
            <text x={11} y={-7} className="fill-ink-muted text-[9px]" fontFamily="var(--font-mono)">
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** The shape alone, for use inside the chart's own SVG. */
function LabelShapeInner({ index, dashed = false }: { index: number; dashed?: boolean }) {
  const common = { fill: dashed ? "none" : "currentColor", stroke: "currentColor", strokeWidth: 2, strokeDasharray: dashed ? "3 2" : undefined };
  if (index === 1) return <rect x={2.5} y={2.5} width={11} height={11} rx={1.5} {...common} />;
  if (index === 2) return <path d="M8 2 14 13.5H2Z" strokeLinejoin="round" {...common} />;
  return <circle cx={8} cy={8} r={5.75} {...common} />;
}

export function TrainModelCardView({ card, answer, onAnswerChange, status }: CardComponentProps<TrainModelCard, TrainModelAnswer>) {
  const locked = status !== "answering";
  const feedback = useFeedback();
  const groupId = useId();
  const [active, setActive] = useState<string | null>(null);
  const labelGoal = card.task.goal === "label";
  const labelIndex = (id: string | undefined) => card.labels.findIndex((l) => l.id === id);

  // Label goal: the model trains once you Check. Include goal: it retrains as you choose, but
  // whether each guess is right only shows after Check. (Try again's clearing of wrong labels is
  // the card's `retryAnswer`.)
  const showGuesses = labelGoal ? locked : true;
  const judged = locked;
  const guesses = trainModelGuesses(card, answer);
  const rowHover = (id: string) => ({ onMouseEnter: () => setActive(id), onMouseLeave: () => setActive(null), onFocus: () => setActive(id), onBlur: () => setActive(null) });

  return (
    <div>
      <CardPrompt>{card.prompt}</CardPrompt>
      {card.model.kind === "nearest" && (
        <Chart card={card as NearestCard} answer={answer} showGuesses={showGuesses} active={active} />
      )}

      <section aria-labelledby={`${groupId}-examples`} className="mt-5">
        <h3 id={`${groupId}-examples`} className="font-mono text-caption font-semibold tracking-widest text-ink-faint uppercase">
          {labelGoal ? "Training examples" : "Train on"}
        </h3>
        <ul className="mt-2 space-y-2">
          {card.examples.map((e) => {
            if (!labelGoal) {
              const on = answer.included.includes(e.id);
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    disabled={locked}
                    onClick={() => {
                      onAnswerChange(toggleIncluded(card, answer, e.id));
                      feedback.haptic("tap");
                    }}
                    {...rowHover(e.id)}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-control border-2 px-3 py-2 text-left transition-colors disabled:cursor-default ${
                      on ? "border-accent-ink bg-accent-soft" : "border-line bg-surface text-ink-muted"
                    } ${locked ? "" : "hover:border-accent-ink"}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`grid size-6 shrink-0 place-items-center rounded-sm border-2 ${on ? "border-accent-ink bg-accent text-on-accent" : "border-line-strong"}`}
                    >
                      {on && <CheckIcon className="size-4" strokeWidth={2.5} />}
                    </span>
                    <span className="flex-1 text-body text-ink">
                      <InlineText>{e.text}</InlineText>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-small text-ink-muted">
                      <LabelShape index={labelIndex(e.label)} />
                      {card.labels[labelIndex(e.label)]?.text}
                    </span>
                    <span className="sr-only">{on ? ", in training" : ", left out"}</span>
                  </button>
                </li>
              );
            }
            const chosen = e.given ? e.label : answer.labels[e.id];
            const wrong = status === "incorrect" && !e.given && chosen !== e.label;
            return (
              <li key={e.id} {...rowHover(e.id)} className="rounded-control border border-line bg-surface p-2.5">
                <p id={`${groupId}-${e.id}`} className="flex items-center gap-2 text-body">
                  {wrong && <XIcon className="size-4 shrink-0 text-danger" strokeWidth={2.5} />}
                  <InlineText>{e.text}</InlineText>
                  {wrong && <span className="sr-only">, wrong label</span>}
                </p>
                {e.given ? (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-small text-ink-muted">
                    <LabelShape index={labelIndex(e.label)} /> Already labelled: {card.labels[labelIndex(e.label)]?.text}
                  </p>
                ) : (
                  <div role="radiogroup" aria-labelledby={`${groupId}-${e.id}`} className="mt-2 flex flex-wrap gap-2">
                    {card.labels.map((label, i) => {
                      const selected = chosen === label.id;
                      return (
                        <button
                          key={label.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={locked}
                          onClick={() => {
                            onAnswerChange(setLabel(answer, e.id, label.id));
                            feedback.play("snap");
                            feedback.haptic("tap");
                          }}
                          className={`inline-flex min-h-11 items-center gap-2 rounded-control border-2 px-3 text-small font-semibold transition-colors disabled:cursor-default ${
                            selected ? "border-accent-ink bg-accent-soft text-ink" : "border-line-strong bg-surface text-ink-muted"
                          } ${locked ? "" : "hover:border-accent-ink hover:text-ink"}`}
                        >
                          <LabelShape index={i} dashed={!selected} />
                          {label.text}
                        </button>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby={`${groupId}-guesses`} aria-live="polite" className="mt-5">
        <h3 id={`${groupId}-guesses`} className="font-mono text-caption font-semibold tracking-widest text-ink-faint uppercase">
          The model&apos;s guesses
        </h3>
        {showGuesses ? (
          <ul className="mt-2 space-y-2">
            {card.tests.map((t, i) => {
              const guess = guesses[t.id];
              const right = guess === t.truth;
              const truth = card.labels[labelIndex(t.truth)]?.text;
              return (
                <li
                  key={t.id}
                  {...rowHover(t.id)}
                  className={`flex items-start gap-3 rounded-control border px-3 py-2.5 ${
                    !judged ? "border-line bg-surface" : right ? "border-success bg-success-soft" : "border-danger bg-danger-soft"
                  }`}
                >
                  <span className="mt-0.5 font-mono text-caption text-ink-muted">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-body text-ink">
                      <InlineText>{t.text}</InlineText>
                    </p>
                    <p className="mt-0.5 inline-flex flex-wrap items-center gap-x-1.5 text-small text-ink-muted">
                      Guess:
                      {guess ? (
                        <>
                          <LabelShape index={labelIndex(guess)} className="size-3.5" />
                          <strong className="text-ink">{card.labels[labelIndex(guess)]?.text}</strong>
                        </>
                      ) : (
                        <strong className="text-ink">Not sure</strong>
                      )}
                      {judged && !right && <span>· really: {truth}</span>}
                    </p>
                  </div>
                  {!judged ? null : right ? (
                    <span className="inline-flex items-center gap-1 text-small font-semibold text-success">
                      <CheckIcon className="size-4" strokeWidth={2.5} /> Right
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-small font-semibold text-danger">
                      <XIcon className="size-4" strokeWidth={2.5} /> Wrong
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-small text-ink-muted">Label every example, then press Check to train the model and see its guesses.</p>
        )}
      </section>

      <CardStatusNote
        status={status}
        correctText={labelGoal ? "Every example is labelled right" : "The model gets every test right"}
        incorrectText={labelGoal ? "Some labels are wrong" : "The model still gets a test wrong"}
      />
    </div>
  );
}
