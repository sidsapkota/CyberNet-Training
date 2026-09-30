"use client";

import { AnimatePresence, motion } from "motion/react";
import { digitKeyIndex, useGlobalKeyDown } from "@/lib/keyboard";
import { CardPrompt } from "../CardPrompt";
import type { CardComponentProps, CardStatus } from "../types";
import { BIT_COUNT, bitsToDecimal, PLACE_VALUES } from "./binary";
import type { BinaryToggleAnswer, BinaryToggleCard } from "./schema";

function onTileClasses(status: CardStatus) {
  if (status === "correct") return "border-success bg-success text-on-primary";
  if (status === "incorrect") return "border-danger bg-danger text-on-primary";
  return "border-primary bg-primary text-on-primary";
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

      <div className="mt-8 grid grid-cols-2 gap-3">
        <div className="rounded-card border border-line bg-surface px-4 py-3 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Target</div>
          <div className="mt-1 font-mono text-4xl font-bold tabular-nums">{card.target}</div>
        </div>
        <div
          className={`rounded-card border px-4 py-3 text-center transition-colors ${
            total === card.target && status !== "incorrect"
              ? "border-success bg-success-soft"
              : "border-line bg-surface"
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Your number
          </div>
          <div className="relative mt-1 h-10 overflow-hidden font-mono text-4xl font-bold tabular-nums">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={total}
                className="block"
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -16, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {total}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div
        role="group"
        aria-label="Bits, from the 128s place down to the 1s place"
        className="mt-6 grid grid-cols-8 gap-1.5 sm:gap-2.5"
      >
        {answer.map((on, i) => {
          const place = PLACE_VALUES[i] ?? 0;
          return (
            <div key={place} className="flex flex-col items-center gap-2">
              <span className="font-mono text-[0.7rem] font-semibold text-ink-muted tabular-nums sm:text-sm">
                {place}
              </span>
              <motion.button
                type="button"
                aria-pressed={on}
                aria-label={`${place}s bit, ${on ? "on" : "off"}`}
                disabled={locked}
                onClick={() => toggle(i)}
                whileTap={locked ? undefined : { scale: 0.9 }}
                className={`grid h-14 w-full place-items-center rounded-lg border-2 font-mono text-xl font-bold transition-colors duration-150 disabled:cursor-default sm:h-18 sm:rounded-control sm:text-3xl ${
                  on ? onTileClasses(status) : "border-line-strong bg-surface text-ink-faint hover:bg-surface-muted"
                }`}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={on ? "1" : "0"}
                    initial={{ rotateX: 90, opacity: 0 }}
                    animate={{ rotateX: 0, opacity: 1 }}
                    exit={{ rotateX: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {on ? "1" : "0"}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
              <span className="hidden text-[0.65rem] text-ink-faint sm:block">key {i + 1}</span>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center font-mono text-base text-ink-muted tabular-nums" aria-live="polite">
        {onValues.length === 0 ? (
          <>All bits off = 0</>
        ) : (
          <>
            {onValues.join(" + ")} = <strong className="text-ink">{total}</strong>
          </>
        )}
      </p>
    </div>
  );
}
