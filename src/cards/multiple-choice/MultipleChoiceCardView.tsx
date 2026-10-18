"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useId } from "react";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { digitKeyIndex, useGlobalKeyDown } from "@/lib/keyboard";
import { CardPrompt } from "../CardPrompt";
import type { CardComponentProps } from "../types";
import { displayOptions } from "./grade";
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

/** Answers drawn on the picture: a ring on the navy panel (every one has a faint ring, so none stands out). */
const areaClasses: Record<Tone, string> = {
  idle: "border-on-screen-muted/50 hover:border-on-screen-muted",
  selected: "border-screen-accent shadow-glow",
  correct: "border-screen-success",
  incorrect: "border-screen-danger",
};

export function MultipleChoiceCardView({
  card,
  answer,
  onAnswerChange,
  status,
  revealAnswer = false,
}: CardComponentProps<MultipleChoiceCard, MultipleChoiceAnswer>) {
  const promptId = useId();
  const locked = status !== "answering";
  // A Predict card (Lesson Blueprint v1.1) isn't scored: once answered it shows what happens.
  const outcome = Boolean(card.predict) && locked;
  // The reveal picture shows the outcome, so it's earned: after a right answer, after any answer on a
  // Predict card, or with the answer after a second wrong try. Never after a first wrong one.
  const reveal = (status === "correct" || revealAnswer) && Boolean(card.image?.revealSrc);
  // Shown shuffled (stable per card), "Not sure" last on Predict cards; digit keys follow the order on screen.
  const options = displayOptions(card);
  const onPicture = card.options.some((o) => o.area);
  const listed = onPicture ? options.filter((o) => !card.options.find((c) => c.id === o.id)?.area) : options;
  // With a picture, answers of up to a few words sit two to a row (wrapping inside their button), so
  // the full-width picture and every option fit a 360×560 screen. An odd last answer takes a full row.
  const pairs = Boolean(card.image) && listed.length >= 3 && listed.every((o) => o.text.length <= 34);

  useGlobalKeyDown((event) => {
    const index = digitKeyIndex(event.key, options.length);
    const option = index === null ? undefined : options[index];
    if (option) {
      event.preventDefault();
      onAnswerChange(option.id);
    }
  }, !locked);

  /** How an option looks: picked, right or wrong (after Check), or what happens (Predict). */
  function toneOf(id: string): Tone {
    const selected = answer === id;
    if (outcome) return id === card.correctOptionId ? "correct" : selected ? "selected" : "idle";
    if (revealAnswer && id === card.correctOptionId) return "correct";
    if (!selected) return "idle";
    return status === "correct" ? "correct" : status === "incorrect" ? "incorrect" : "selected";
  }
  const srNote = (tone: Tone) =>
    tone === "correct" ? (outcome ? " (what happens)" : " (correct)") : tone === "incorrect" ? " (incorrect)" : "";

  return (
    <div>
      <CardPrompt id={promptId}>{card.prompt}</CardPrompt>
      <div role="radiogroup" aria-labelledby={promptId}>
        {card.image && (
          <figure className="mt-3 overflow-hidden rounded-card border border-line bg-screen p-2 sm:p-3">
            {/* The picture fills the card's width, so any text in it reads at 14px or more on a phone. */}
            <div className="relative mx-auto w-full sm:max-w-[28rem]">
              <Image
                key={reveal ? "reveal" : "idle"}
                src={reveal && card.image.revealSrc ? card.image.revealSrc : card.image.src}
                alt={reveal ? (card.image.revealAlt ?? card.image.alt) : card.image.alt}
                width={card.image.width}
                height={card.image.height}
                className="h-auto w-full object-contain"
                priority
                unoptimized={card.image.src.endsWith(".svg")}
              />
              {onPicture &&
                options.map((option) => {
                  const area = card.options.find((o) => o.id === option.id)?.area;
                  if (!area) return null;
                  const tone = toneOf(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={answer === option.id}
                      aria-label={`${option.text}${srNote(tone)}`}
                      disabled={locked}
                      onClick={() => onAnswerChange(option.id)}
                      style={{ left: `${area.x}%`, top: `${area.y}%`, width: `${area.w}%`, height: `${area.h}%` }}
                      className={`absolute min-h-11 min-w-11 rounded-control border-2 transition-colors disabled:cursor-default ${areaClasses[tone]} ${locked && tone === "idle" ? "opacity-60" : ""}`}
                    >
                      {(tone === "correct" || tone === "incorrect") && (
                        <span
                          aria-hidden="true"
                          className={`absolute -top-2.5 -right-2.5 grid size-6 place-items-center rounded-node border-2 ${badgeClasses[tone]}`}
                        >
                          {tone === "correct" ? <CheckIcon className="size-3.5" strokeWidth={2.5} /> : <XIcon className="size-3.5" strokeWidth={2.5} />}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </figure>
        )}
        {listed.length > 0 && (
          <div className={`mt-3 grid gap-1.5 sm:mt-6 sm:gap-2.5 ${pairs ? "grid-cols-2" : ""}`}>
            {listed.map((option) => {
              const i = options.indexOf(option);
              const tone = toneOf(option.id);
              const marked = tone === "correct" || tone === "incorrect";
              return (
                <motion.button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={answer === option.id}
                  disabled={locked}
                  onClick={() => onAnswerChange(option.id)}
                  whileTap={locked ? undefined : { scale: 0.985 }}
                  className={`flex min-h-11 w-full items-center gap-2.5 rounded-control border-2 px-3 py-1.5 text-left text-small leading-snug font-medium sm:min-h-14 sm:leading-normal sm:gap-3.5 sm:px-3.5 sm:py-3 sm:text-lead transition-colors duration-150 disabled:cursor-default ${toneClasses[tone]} ${locked && tone === "idle" ? "opacity-55" : ""} ${pairs && listed.length % 2 === 1 && i === options.indexOf(listed[listed.length - 1]!) ? "col-span-2" : ""}`}
                >
                  <span
                    aria-hidden="true"
                    className={`grid size-6 shrink-0 place-items-center rounded-sm border-2 font-mono text-caption sm:size-8 sm:text-small font-semibold transition-colors ${badgeClasses[tone]}`}
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
                  {marked && <span className="sr-only">{srNote(tone)}</span>}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
      <p className="mt-4 hidden text-caption text-ink-faint sm:block">
        {onPicture ? "Tap an answer on the picture, or press " : "Press "}
        <kbd className="rounded-sm border border-line px-1 font-mono">1</kbd>–
        <kbd className="rounded-sm border border-line px-1 font-mono">{options.length}</kbd> to pick,{" "}
        <kbd className="rounded-sm border border-line px-1 font-mono">Enter</kbd> to check.
      </p>
    </div>
  );
}
