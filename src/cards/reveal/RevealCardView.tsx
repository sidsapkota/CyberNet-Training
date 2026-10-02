"use client";

import { motion, useReducedMotion } from "motion/react";
import { LessonIcon } from "@/components/ui/icons";
import { Markdown } from "@/components/ui/Markdown";
import { useFeedback } from "@/lib/feedback";
import { glossaryEntry } from "@/lib/glossary";
import { hiddenInView, getScene } from "../shared/scenes/manifests";
import { partTargetStyle, SceneStage } from "../shared/scenes/SceneStage";
import type { CardComponentProps } from "../types";
import type { RevealCard, RevealState } from "./schema";

/**
 * The learning card: one thing to tap, one sentence. Before the tap, the thing has a ring that
 * pulses twice (no loop) and the card says what to tap; after it, the thing glows once and the
 * sentence appears beside it. One idea, one action (CLAUDE.md → Minimalism guardrail).
 */
export function RevealCardView({ card, answer, onAnswerChange }: CardComponentProps<RevealCard, RevealState>) {
  const reduceMotion = useReducedMotion();
  const feedback = useFeedback();
  const revealed = answer?.revealed === true;
  const { show } = card;

  function tap() {
    if (revealed) return;
    feedback.play("snap");
    feedback.haptic("tap");
    onAnswerChange({ revealed: true });
  }

  const sentence = (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      aria-live="polite"
    >
      <Markdown className="text-body text-ink">{card.sentence}</Markdown>
    </motion.div>
  );
  const instruction = card.prompt ?? "Tap to see.";

  if (show.kind === "part") {
    const scene = getScene(show.scene)!;
    const part = scene.parts.find((p) => p.id === show.part)!;
    const hidden = new Set(hiddenInView(show.scene, show.view));
    return (
      <div>
        <p className="text-lead font-semibold">{instruction}</p>
        <div className="mt-4">
          <SceneStage sceneId={show.scene} hidden={hidden} callout={revealed ? sentence : null} calloutAt={part.box.y + part.box.h / 2 < scene.height / 2 ? "bottom" : "top"}>
            <button
              type="button"
              data-keyboard-passthrough
              aria-label={revealed ? part.name : `Tap: ${part.name}`}
              aria-pressed={revealed}
              onClick={tap}
              style={partTargetStyle(show.scene, part.box)}
              className={`rounded-control border-2 transition-[border-color,box-shadow] duration-300 ${revealed ? "border-screen-accent shadow-glow" : "border-screen-accent/60"}`}
            >
              {!revealed && (
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 animate-node-pulse rounded-control border-2 border-screen-accent [animation-iteration-count:2]" />
              )}
            </button>
          </SceneStage>
        </div>
      </div>
    );
  }

  // An icon or a word: one big tappable thing, the sentence under it once tapped.
  const entry = show.kind === "term" ? glossaryEntry(show.term) : undefined;
  return (
    <div className="flex flex-col items-center text-center">
      <p className="self-start text-left text-lead font-semibold">{instruction}</p>
      <button
        type="button"
        data-keyboard-passthrough
        onClick={tap}
        aria-pressed={revealed}
        aria-label={revealed ? (entry?.term ?? "Shown") : "Tap to see"}
        className={`relative mt-8 grid place-items-center border-2 transition-[box-shadow,background-color] duration-300 ${
          show.kind === "icon" ? "size-28 rounded-node" : "min-h-16 rounded-card px-6"
        } ${revealed ? "border-accent-ink bg-accent-soft shadow-glow" : "border-accent-ink bg-surface"}`}
      >
        {show.kind === "icon" ? <LessonIcon name={show.icon} className="size-12 text-accent-ink" /> : <span className="text-title font-semibold">{entry?.term}</span>}
        {!revealed && <span aria-hidden="true" className={`pointer-events-none absolute -inset-1 animate-node-pulse border-2 border-accent ${show.kind === "icon" ? "rounded-node" : "rounded-card"} [animation-iteration-count:2]`} />}
      </button>
      <div className="mt-6 min-h-20 w-full max-w-sm">
        {revealed && (
          <>
            {entry?.full && <p className="mb-1 text-small text-ink-muted">{entry.term.includes(" ") ? `Stands for: ${entry.full}` : `${entry.term} = ${entry.full}`}</p>}
            {sentence}
          </>
        )}
      </div>
    </div>
  );
}
