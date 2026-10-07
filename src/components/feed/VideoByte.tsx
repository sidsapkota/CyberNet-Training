"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { PlayModeContext } from "@/cards/playMode";
import { getCardDefinition } from "@/cards/registry";
import type { InteractiveCard } from "@/cards/schema";
import { LogoLockup } from "@/components/brand/Logo";
import { Markdown } from "@/components/ui/Markdown";
import { CheckIcon, XpIcon } from "@/components/ui/icons";
import { rightAnswer } from "@/lib/feed/solve";

/** Scene times in ms: the hook, the answer going in, the reveal, the end card, then round again. */
const ANSWER_AT = 1800;
const REVEAL_AT = 2600;
const END_AT = 7000;
const LOOP_AT = 9500;

/**
 * "Export as video": one byte in a vertical 9:16 frame with big text, playing itself so it can be
 * screen-recorded for TikTok or Reels: the hook, the right answer going in, the reveal with the XP,
 * then the logo and the site. Loops. Not linked anywhere and not indexed.
 */
export function VideoByte({ hook, courseTitle, rare, card }: { hook: string; courseTitle: string; rare: boolean; card: InteractiveCard }) {
  const definition = getCardDefinition(card);
  const [t, setT] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = () => {
      setT((performance.now() - start) % LOOP_AT);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  const answered = t >= ANSWER_AT;
  const revealed = t >= REVEAL_AT;
  const ended = t >= END_AT;
  const answer = answered ? rightAnswer(card) : definition.interactive ? definition.initialAnswer(card) : null;

  return (
    <main className="grid min-h-dvh place-items-center bg-screen">
      <div className="relative flex aspect-[9/16] h-dvh max-w-full flex-col overflow-hidden bg-canvas px-8 py-12" style={{ fontSize: "min(2.2vh, 4.4vw)" }}>
        <AnimatePresence mode="wait">
          {ended ? (
            <motion.div key="end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
              <LogoLockup className="scale-150" />
              <p className="mt-6 text-[2.2em] font-semibold">Learn it in 3 minutes.</p>
              <p className="font-mono text-[1.6em] text-accent-ink">cybernettraining.com</p>
            </motion.div>
          ) : (
            <motion.div key="byte" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col">
              <p className="font-mono text-[1.1em] font-semibold tracking-widest text-ink-faint uppercase">
                {courseTitle}
                {rare ? " · Rare byte" : ""}
              </p>
              <h1 className="mt-4 text-[2.6em] leading-tight font-semibold text-balance">{hook}</h1>
              <div className="pointer-events-none mt-8 text-[1.15em]">
                <PlayModeContext.Provider value="quiz">
                  {definition.interactive && <definition.Component card={card} answer={answer} onAnswerChange={() => {}} status={revealed ? "correct" : "answering"} />}
                </PlayModeContext.Provider>
              </div>
              {revealed && (
                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mt-auto rounded-card border-2 border-success bg-success-soft p-6">
                  <p className="flex items-center gap-3 text-[1.8em] font-semibold">
                    <CheckIcon className="size-[1.2em] text-success" /> Right!
                    <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }} className="ml-auto inline-flex items-center gap-1 font-mono text-accent-ink">
                      <XpIcon className="size-[0.9em]" />+{rare ? 15 : 5} XP
                    </motion.span>
                  </p>
                  <Markdown className="mt-3 text-[1.25em]">{card.explanation}</Markdown>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
