"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { usePlayMode } from "../playMode";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { useFeedback } from "@/lib/feedback";
import { CardPrompt } from "../CardPrompt";
import { CardStatusNote } from "../CardStatusNote";
import type { CardComponentProps } from "../types";
import type { Guess } from "./model";
import { choices, given, pickExample, problemTest, setLabel, trainModelGuesses } from "./grade";
import { ItemPicture, MessageBubble } from "./pictures";
import type { TrainModelAnswer, TrainModelCard } from "./schema";

type Item = { id: string; text: string; x?: number | undefined; y?: number | undefined };

/** Each label has its own shape (circle, square, triangle), so labels never rely on colour. */
function LabelShape({ index, className = "size-3.5" }: { index: number; className?: string }) {
  const common = { fill: "currentColor", stroke: "currentColor", strokeWidth: 2 };
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={`shrink-0 ${className}`}>
      {index === 1 ? <rect x={2.5} y={2.5} width={11} height={11} rx={1.5} {...common} /> : index === 2 ? <path d="M8 2 14 13.5H2Z" strokeLinejoin="round" {...common} /> : <circle cx={8} cy={8} r={5.75} {...common} />}
    </svg>
  );
}

/** An item's real-looking picture (nothing for word-vote cards, which show the message itself). */
function Picture({ card, item, className }: { card: TrainModelCard; item: Item; className?: string }) {
  if (card.model.kind !== "nearest") return null;
  return <ItemPicture scene={card.model.scene} text={item.text} x={item.x} y={item.y} {...(className ? { className } : {})} />;
}

const GRID_COLS: Record<number, string> = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-2" };

/** The model's guess as a label chip; it flips when the guess changes (instant, visible feedback). */
function GuessChip({ card, guess, hidden = false }: { card: TrainModelCard; guess: Guess; hidden?: boolean }) {
  const reduce = useReducedMotion();
  const index = hidden ? -1 : card.labels.findIndex((l) => l.id === guess);
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.strong
        key={hidden ? "hidden" : (guess ?? "unsure")}
        initial={reduce ? false : { rotateX: 90, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        exit={reduce ? { opacity: 0 } : { rotateX: -90, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="inline-flex items-center gap-1 font-semibold text-ink"
      >
        {index >= 0 && <LabelShape index={index} />}
        {hidden ? "?" : index >= 0 ? card.labels[index]!.text : "Not sure"}
      </motion.strong>
    </AnimatePresence>
  );
}

/** What the model has already learned from: small pictures (or messages) grouped by label. */
function Learned({ card }: { card: TrainModelCard }) {
  const [open, setOpen] = useState(false);
  const items = given(card);
  if (items.length === 0) return null;
  const heading = card.task.goal === "label" ? "Already labelled:" : card.task.action === "remove" ? "It also learned from:" : "It learned from:";
  if (card.model.kind !== "nearest") {
    // Messages can't be shrunk to pictures: they open on demand, so the card still fits.
    return (
      <div className="mt-2 rounded-control bg-surface px-2.5 py-1">
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="min-h-11 text-caption font-semibold text-accent-ink">
          {open ? "Hide what it learned from" : `See what it learned from (${items.length} messages)`}
        </button>
        {open && (
          <ul className="space-y-1 pb-1.5">
            {items.map((e) => (
              <li key={e.id} className="flex items-center gap-1.5 text-caption">
                <LabelShape index={card.labels.findIndex((l) => l.id === e.label)} className="size-3" />
                <span className="font-semibold">{card.labels.find((l) => l.id === e.label)?.text}:</span>
                <span className="truncate text-ink-muted">“{e.text}”</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control bg-surface px-2.5 py-1.5">
      <p className="text-caption text-ink-muted">{heading}</p>
      <div className="contents">
        {card.labels.map((label, i) => {
          const ofLabel = items.filter((e) => e.label === label.id);
          if (ofLabel.length === 0) return null;
          return (
            <div key={label.id} className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-caption font-semibold text-ink">
                <LabelShape index={i} className="size-3" />
                {label.text}
              </span>
              {ofLabel.map((e) => (
                <Picture key={e.id} card={card} item={e} className="size-5" />
              ))}
              <span className="sr-only">: {ofLabel.map((e) => e.text).join(", ")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FixCard({ card, answer, onAnswerChange, status }: CardComponentProps<TrainModelCard, TrainModelAnswer>) {
  const locked = status !== "answering";
  const feedback = useFeedback();
  const id = useId();
  const problem = problemTest(card);
  const guesses = trainModelGuesses(card, answer);
  const picked = answer.included[0];
  const remove = card.task.goal === "fix" && card.task.action === "remove";
  const others = card.tests.filter((t) => t.id !== problem.id);
  const guess = guesses[problem.id] ?? null;
  // One-try quizzes: after a pick the guess shows "?" until Check (no tapping round to find it).
  const hideLive = usePlayMode() === "quiz" && Boolean(picked) && !locked;
  // The problem is marked wrong to start with; after a pick, right or wrong shows only after Check.
  const mark = !picked ? "wrong" : locked ? (guess === problem.truth ? "right" : "wrong") : null;

  return (
    <div>
      <CardPrompt>{card.prompt}</CardPrompt>

      {/* Problem first: the item the model gets wrong, and its wrong guess. */}
      <div aria-live="polite" className="relative mt-2 flex items-center gap-3 rounded-card border-2 border-line-strong bg-surface p-2.5">
        {card.model.kind === "nearest" ? <Picture card={card} item={problem} className="size-12" /> : null}
        <div className="min-w-0 flex-1">
          {card.model.kind === "nearest" ? <p className="truncate pr-7 font-semibold">{problem.text}</p> : <MessageBubble text={problem.text} className="mr-7" />}
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-small text-ink-muted [perspective:400px]">
            Model&apos;s guess: <GuessChip card={card} guess={guess} hidden={hideLive} />
          </p>
        {others.length > 0 && (
          <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-caption text-ink-muted">
            <span>Other guesses:</span>
            {others.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1">
                {card.model.kind === "nearest" ? <Picture card={card} item={t} className="size-5" /> : <span className="max-w-[9rem] truncate text-ink">“{t.text}”</span>}
                <span className="sr-only">{t.text}, model&apos;s guess</span>
                <GuessChip card={card} guess={guesses[t.id] ?? null} />
              </span>
            ))}
          </p>
        )}

        </div>
        {mark === "wrong" && (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 text-small font-semibold text-danger">
            <XIcon className="size-5" strokeWidth={2.5} />
            <span className="sr-only">wrong</span>
          </span>
        )}
        {mark === "right" && (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 text-small font-semibold text-success">
            <CheckIcon className="size-5" strokeWidth={2.5} />
            <span className="sr-only">right</span>
          </span>
        )}
      </div>
      <Learned card={card} />

      <p id={`${id}-add`} className="mt-3 text-small font-semibold">
        {remove ? "Take one example out to fix it:" : "Add one example to fix it:"}
      </p>
      <div role="radiogroup" aria-labelledby={`${id}-add`} className={`mt-2 grid gap-2 ${GRID_COLS[choices(card).length] ?? "grid-cols-2"}`}>
        {choices(card).map((e) => {
          const on = picked === e.id;
          const labelIndex = card.labels.findIndex((l) => l.id === e.label);
          return (
            <button
              key={e.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={locked}
              onClick={() => {
                onAnswerChange(pickExample(answer, e.id));
                feedback.play("snap");
                feedback.haptic("tap");
              }}
              className={`relative flex min-h-11 flex-col items-center gap-1 rounded-control border-2 p-2 text-center transition-colors disabled:cursor-default ${
                on ? "border-accent-ink bg-accent-soft" : "border-line bg-surface"
              } ${locked ? "" : "hover:border-accent-ink"} ${on && remove ? "opacity-60" : ""}`}
            >
              {on && remove && <span className="text-caption font-semibold text-ink">Taken out</span>}
              <span className="relative">
                {card.model.kind === "nearest" ? <Picture card={card} item={e} className="size-9" /> : null}
                {/* Its label as a shape badge (the key is in "It learned from"); spelled out when taking one out, where a wrong label is the point. */}
                {card.model.kind === "nearest" && (
                  <span className="absolute -bottom-1.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-0.5 rounded-sm bg-surface px-1 text-[0.7rem] leading-4 font-semibold whitespace-nowrap text-ink">
                    <LabelShape index={labelIndex} className="size-2" />
                    {card.labels[labelIndex]?.text}
                  </span>
                )}
              </span>
              <span className={card.model.kind === "nearest" ? "text-caption leading-tight text-ink" : "text-small leading-snug text-ink"}>{e.text}</span>
              {card.model.kind !== "nearest" && (
                <span className="inline-flex items-center gap-1 text-caption text-ink-muted">
                  <LabelShape index={labelIndex} className="size-3" />
                  {card.labels[labelIndex]?.text}
                </span>
              )}
              <span className="sr-only">, labelled {card.labels[labelIndex]?.text}</span>
            </button>
          );
        })}
      </div>
      <CardStatusNote status={status} correctText="The model gets every one right now" incorrectText="That didn't fix it" />
    </div>
  );
}

function LabelCard({ card, answer, onAnswerChange, status }: CardComponentProps<TrainModelCard, TrainModelAnswer>) {
  const locked = status !== "answering";
  const feedback = useFeedback();
  const id = useId();
  const guesses = trainModelGuesses(card, answer);

  return (
    <div>
      <CardPrompt>{card.prompt}</CardPrompt>
      {/* After Check the model trains on your labels; how it does on new items shows first (that's the point of the card). */}
      {locked && (
        <div aria-live="polite" className="mt-2 rounded-control border-2 border-line-strong bg-surface px-3 py-2">
          <p className="text-caption text-ink-muted">Then it guessed new ones:</p>
          <ul className="mt-1 space-y-1">
            {card.tests.map((t) => {
              const guess = guesses[t.id] ?? null;
              const right = guess === t.truth;
              return (
                <li key={t.id} className="flex items-center gap-2 text-small">
                  {card.model.kind === "nearest" ? <Picture card={card} item={t} className="size-8" /> : null}
                  <span className="min-w-0 flex-1 truncate">{t.text}</span>
                  <GuessChip card={card} guess={guess} />
                  {right ? <CheckIcon className="size-4 text-success" strokeWidth={2.5} /> : <XIcon className="size-4 text-danger" strokeWidth={2.5} />}
                  <span className="sr-only">{right ? "right" : "wrong"}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <Learned card={card} />
      <ul className={`mt-2 grid gap-1.5 ${card.labels.length === 3 ? "grid-cols-1" : "grid-cols-2"}`}>
        {choices(card).map((e) => {
          const chosen = answer.labels[e.id];
          const wrong = status === "incorrect" && chosen !== e.label;
          return (
            <li key={e.id} className={`flex items-center gap-1.5 rounded-control border-2 p-1.5 ${card.labels.length === 3 ? "flex-row text-left" : "flex-col text-center"} ${wrong ? "border-danger" : chosen ? "border-accent-ink" : "border-line"} bg-surface`}>
              {card.model.kind === "nearest" ? <Picture card={card} item={e} className="size-8" /> : null}
              <div className={card.labels.length === 3 ? "flex min-w-0 flex-1 flex-col gap-1" : "contents"}>
              <p id={`${id}-${e.id}`} className="flex items-center gap-1 text-caption leading-tight text-ink">
                {wrong && <XIcon className="size-3.5 shrink-0 text-danger" strokeWidth={2.5} />}
                <span>{e.text}</span>
                {wrong && <span className="sr-only">, wrong label</span>}
              </p>
              <div role="radiogroup" aria-labelledby={`${id}-${e.id}`} className={`flex gap-1 ${card.labels.length === 3 ? "" : "w-full justify-center"}`}>
                {card.labels.map((label, i) => {
                  const selected = chosen === label.id;
                  return (
                    <button
                      key={label.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={label.text}
                      disabled={locked}
                      onClick={() => {
                        onAnswerChange(setLabel(answer, e.id, label.id));
                        feedback.play("snap");
                        feedback.haptic("tap");
                      }}
                      className={`inline-flex min-h-11 min-w-11 items-center ${card.labels.length === 3 ? "" : "flex-1"} justify-center gap-1 rounded-control border-2 px-1 text-caption font-semibold transition-colors disabled:cursor-default ${
                        selected ? "border-accent-ink bg-accent-soft text-ink" : "border-line-strong bg-surface text-ink-muted"
                      } ${locked ? "" : "hover:border-accent-ink hover:text-ink"}`}
                    >
                      <LabelShape index={i} className="size-3" />
                      <span aria-hidden="true">{label.text}</span>
                    </button>
                  );
                })}
              </div>
              </div>
            </li>
          );
        })}
      </ul>

      <CardStatusNote status={status} correctText="Every example is labelled right" incorrectText="Some labels are wrong" />
    </div>
  );
}

export function TrainModelCardView(props: CardComponentProps<TrainModelCard, TrainModelAnswer>) {
  return props.card.task.goal === "fix" ? <FixCard {...props} /> : <LabelCard {...props} />;
}
