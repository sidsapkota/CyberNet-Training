"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckIcon } from "@/components/ui/icons";
import { digitKeyIndex, useGlobalKeyDown } from "@/lib/keyboard";
import { CardPrompt } from "../CardPrompt";
import { CardStatusNote } from "../CardStatusNote";
import type { CardComponentProps, CardStatus } from "../types";
import { BIT_COUNT, bitsToDecimal, PLACE_VALUES } from "./binary";
import type { BinaryToggleAnswer, BinaryToggleCard } from "./schema";

function onTileClasses(status: CardStatus) {
  if (status === "correct") return "border-success bg-success text-on-success";
  if (status === "incorrect") return "border-danger bg-danger text-on-danger";
  return "border-accent-ink bg-accent text-on-accent shadow-glow";
}

export function BinaryToggleCardView({
  card,
  answer,
  onAnswerChange,
  status,
}: CardComponentProps<BinaryToggleCard, BinaryToggleAnswer>) {
  const locked = status !== "answering";
  const total = bitsToDecimal(answer);
  const onValues = PLACE_VALUES.filter((_, i) => answer[i]);
  const matches = total === card.target;

  function toggle(index: number) {
    if (locked) return;
    onAnswerChange(answer.map((on, i) => (i === index ? !on : on)));
  }

  useGlobalKeyDown((event) => {
    const index = digitKeyIndex(event.key, BIT_COUNT);
    if (index !== null) {
      event.preventDefault();
      toggle(index);
    }
  }, !locked);

  return (
    <div>
      <CardPrompt>{card.prompt}</CardPrompt>

      <div className="mt-8 grid grid-cols-2 gap-2.5">
        <div className="rounded-card border border-line bg-surface px-4 py-3">
          <div className="text-caption font-semibold uppercase tracking-wider text-ink-faint">Target</div>
          <div className="mt-1 font-mono text-display font-semibold tabular-nums">{card.target}</div>
        </div>
        <div
          className={`rounded-card border px-4 py-3 transition-colors ${
            // Right or wrong only after Check.
            matches && status === "correct" ? "border-success bg-success-soft" : "border-line bg-surface"
          }`}
        >
          <div className="text-caption font-semibold uppercase tracking-wider text-ink-faint">Your number</div>
          <div className="relative mt-1 flex h-11 items-center gap-2 overflow-hidden font-mono text-display font-semibold tabular-nums">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={total}
                className="block"
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -16, opacity: 0 }}
                transition={{ duration: 0.16 }}
              >
                {total}
              </motion.span>
            </AnimatePresence>
            {matches && status === "correct" && (
              <span className="inline-flex items-center gap-0.5 font-sans text-small font-semibold text-success">
                <CheckIcon className="size-4" />
                match
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        role="group"
        aria-label="Bits, from the 128s place down to the 1s place"
        className="mt-6 grid grid-cols-4 gap-2 min-[430px]:grid-cols-8 min-[430px]:gap-1.5 sm:gap-2"
      >
        {answer.map((on, i) => {
          const place = PLACE_VALUES[i] ?? 0;
          return (
            <div key={place} className="flex flex-col items-center gap-1.5">
              <span className="font-mono text-[0.7rem] font-medium text-ink-muted tabular-nums sm:text-caption">
                {place}
              </span>
              <motion.button
                type="button"
                aria-pressed={on}
                aria-label={`${place}s bit, ${on ? "on" : "off"}`}
                disabled={locked}
                onClick={() => toggle(i)}
                whileTap={locked ? undefined : { scale: 0.92 }}
                className={`grid h-14 w-full place-items-center rounded-control border-2 font-mono text-title font-semibold transition-[background-color,border-color,box-shadow] duration-150 disabled:cursor-default sm:h-16 sm:text-headline ${
                  on
                    ? onTileClasses(status)
                    : "border-line-strong bg-surface text-ink-faint hover:border-accent-ink hover:text-accent-ink"
                }`}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={on ? "1" : "0"}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 10, opacity: 0 }}
                    transition={{ duration: 0.12 }}
                  >
                    {on ? "1" : "0"}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
              <span className="hidden font-mono text-[0.65rem] text-ink-faint sm:block">{i + 1}</span>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-center font-mono text-body text-ink-muted tabular-nums" aria-live="polite">
        {onValues.length === 0 ? (
          <>all off = 0</>
        ) : (
          <>
            {onValues.join(" + ")} = <strong className="font-semibold text-ink">{total}</strong>
          </>
        )}
      </p>

      <div className="text-center">
        <CardStatusNote
          status={status}
          correctText={`That's ${card.target}`}
          incorrectText={`That's ${total}, not ${card.target}`}
        />
      </div>
    </div>
  );
}
