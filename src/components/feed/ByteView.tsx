"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { PlayModeContext } from "@/cards/playMode";
import { getCardDefinition } from "@/cards/registry";
import type { InteractiveCard } from "@/cards/schema";
import type { CardStatus } from "@/cards/types";
import { CardStage, useFeedbackAnimation } from "@/components/player/CardStage";
import { Button } from "@/components/ui/Button";
import { Markdown } from "@/components/ui/Markdown";
import { ArrowRightIcon, CheckIcon, RareIcon, XIcon, XpIcon } from "@/components/ui/icons";
import { trackWith } from "@/lib/analytics";
import { useFeedback } from "@/lib/feedback";
import { byteXp, feedXpOn, FEED_LESSON_ID } from "@/lib/feed/rules";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { useDaily } from "@/lib/progress/useDaily";
import { PRESS_SPRING } from "@/lib/motion";

export interface ByteForView {
  id: string;
  hook: string;
  rare: boolean;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  card: InteractiveCard;
}

const ONE_TAP = new Set(["multiple_choice", "true_false", "fill_gap"]);

/**
 * One byte: a course tag, the hook (12 words or fewer), the card, then the instant reveal (right or
 * wrong, the card's one-line explanation, XP) and "Go deeper" into the lesson. One-tap cards check
 * themselves on the tap; the rest have a Check button. No second try: the Feed moves on.
 */
export function ByteView({ byte, onAnswered, onDeeper, compact = false }: { byte: ByteForView; onAnswered?: (correct: boolean) => void; onDeeper?: () => void; compact?: boolean }) {
  const definition = getCardDefinition(byte.card);
  const { store, snapshot } = useProgress();
  const daily = useDaily();
  const feedback = useFeedback();
  const reduce = useReducedMotion();
  const { scope, playIncorrect } = useFeedbackAnimation();
  const [answer, setAnswer] = useState<unknown>(() => (definition.interactive ? definition.initialAnswer(byte.card) : null));
  const [status, setStatus] = useState<CardStatus>("answering");
  const [earned, setEarned] = useState<number | null>(null);
  const done = Boolean(snapshot?.cards[`${FEED_LESSON_ID}/${byte.id}`]);
  const ready = definition.interactive && definition.isAnswerReady(answer, byte.card);

  function check(value: unknown) {
    if (!definition.interactive || status !== "answering" || !definition.isAnswerReady(value, byte.card)) return;
    const { correct } = definition.grade(byte.card, value);
    setStatus(correct ? "correct" : "incorrect");
    feedback.play(correct ? "correct" : "wrong");
    feedback.haptic(correct ? "success" : "error");
    trackWith("byte_answered", { lesson: byte.lessonId, source: correct ? "right" : "wrong" });
    if (correct) {
      const xp = done || !snapshot || !daily ? 0 : byteXp(byte.rare, feedXpOn(snapshot.xpEvents, daily.today.day));
      setEarned(done ? null : xp);
      if (!done) void store.completeByte(byte.id, value, xp);
    } else {
      playIncorrect();
    }
    onAnswered?.(correct);
  }

  function change(value: unknown) {
    setAnswer(value);
    if (ONE_TAP.has(byte.card.type)) check(value);
  }

  return (
    <div className={`mx-auto flex w-full max-w-lesson flex-col ${compact ? "" : "min-h-full"}`}>
      <div className="flex flex-wrap items-center gap-2 text-caption">
        <span className="rounded-sm border border-line px-2 py-0.5 font-semibold text-ink-muted">{byte.courseTitle}</span>
        {byte.rare && (
          <span className="inline-flex items-center gap-1 rounded-sm border border-warning px-2 py-0.5 font-semibold text-warning">
            <RareIcon className="size-3.5" /> Rare byte · +15 XP
          </span>
        )}
      </div>
      <h2 className="mt-3 text-title leading-tight font-semibold text-balance max-[620px]:text-lead">{byte.hook}</h2>
      <div className="mt-3">
        <PlayModeContext.Provider value="quiz">
          <CardStage cardKey={`byte-${byte.id}`} card={byte.card} scope={scope}>
            {definition.interactive && <definition.Component card={byte.card} answer={answer} onAnswerChange={change} status={status} />}
          </CardStage>
        </PlayModeContext.Provider>
      </div>

      {status === "answering" ? (
        !ONE_TAP.has(byte.card.type) && (
          // Pinned to the bottom of the screen, like the lesson footer, so it's always in view.
          <div className="sticky bottom-0 mt-auto bg-canvas pt-3 pb-3">
            <Button className="w-full" disabled={!ready} onClick={() => check(answer)}>
              Check
            </Button>
          </div>
        )
      ) : (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          role="status"
          aria-live="polite"
          className={`mt-4 mb-3 rounded-card border-2 p-4 ${status === "correct" ? "border-success bg-success-soft" : "border-danger bg-danger-soft"}`}
        >
          <div className="flex items-center gap-2">
            {status === "correct" ? <CheckIcon className="size-5 text-success" /> : <XIcon className="size-5 text-danger" />}
            <p className="flex-1 font-semibold">{status === "correct" ? "Right!" : "Not quite"}</p>
            {status === "correct" && earned !== null && earned > 0 && (
              <motion.span
                initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={PRESS_SPRING}
                className="inline-flex items-center gap-1 rounded-control border border-line bg-surface px-2 py-0.5 font-mono text-small font-semibold text-accent-ink"
              >
                <XpIcon className="size-4" />+{earned} XP
              </motion.span>
            )}
          </div>
          {status === "correct" && earned === 0 && <p className="mt-1 text-caption text-ink-muted">Today&apos;s Feed XP is maxed. Lessons still earn XP.</p>}
          <Markdown className="mt-2 text-small text-ink">{byte.card.explanation}</Markdown>
          <Link
            href={`/lesson/${byte.lessonId}`}
            onClick={onDeeper}
            className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-small font-semibold text-accent-ink underline-offset-2 hover:underline"
          >
            Go deeper: {byte.lessonTitle} <ArrowRightIcon className="size-4" />
          </Link>
        </motion.div>
      )}
    </div>
  );
}
