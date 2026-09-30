"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { CheckIcon } from "@/components/ui/icons";
import { Markdown } from "@/components/ui/Markdown";
import { useFeedback } from "@/lib/feedback";
import { CardPrompt } from "../CardPrompt";
import { hiddenInView, type ScenePart } from "../shared/scenes/manifests";
import { overlayOrder, partTargetStyle, SceneStage } from "../shared/scenes/SceneStage";
import type { CardComponentProps } from "../types";
import { isExploreComplete, markSeen, tappableParts } from "./grade";
import type { HotspotCard, HotspotExploreState } from "./schema";

/**
 * Explore mode: tap each part to see its name and job. Nothing is graded; the player unlocks
 * Continue once every part has been tapped. Unexplored parts carry a hollow node, explored ones a
 * filled node with a check, so progress never relies on colour alone.
 */
export function HotspotExploreView({ card, answer, onAnswerChange }: CardComponentProps<HotspotCard, HotspotExploreState>) {
  const reduceMotion = useReducedMotion();
  const feedback = useFeedback();
  const [active, setActive] = useState<string | null>(null);
  const hidden = new Set(hiddenInView(card.scene, card.view));
  const parts = overlayOrder(tappableParts(card));
  const jobs = new Map((card.parts ?? []).map((p) => [p.part, p.job]));
  const seen = new Set(answer.seen);
  const total = jobs.size;
  const done = isExploreComplete(answer, card);
  const activePart = parts.find((p) => p.id === active);
  // A board that other parts sit on gets its node at the bottom-left, clear of theirs.
  const inside = (a: ScenePart["box"], b: ScenePart["box"]) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
  const isContainer = (part: ScenePart) => parts.some((o) => o.id !== part.id && inside(o.box, part.box));

  function tap(id: string) {
    setActive(id);
    feedback.haptic("tap");
    if (!seen.has(id)) {
      feedback.play("snap");
      onAnswerChange(markSeen(answer, id));
    }
  }

  return (
    <div>
      <CardPrompt>{card.prompt}</CardPrompt>
      <p className="mt-2 text-small text-ink-muted">
        Tap each part to find out what it does.{" "}
        <span className="font-mono text-ink">
          {seen.size}/{total}
        </span>{" "}
        explored
      </p>

      <div className="mt-4">
        <SceneStage sceneId={card.scene} hidden={hidden}>
          {parts.map((part) => {
            const isActive = part.id === active;
            const isSeen = seen.has(part.id);
            return (
              <button
                key={part.id}
                type="button"
                data-keyboard-passthrough
                aria-pressed={isActive}
                aria-label={`${part.name}${isSeen ? ", explored" : ""}`}
                onClick={() => tap(part.id)}
                style={partTargetStyle(card.scene, part.box)}
                className={`rounded-control border-2 transition-colors focus-visible:outline-offset-2 ${
                  isActive ? "border-screen-accent shadow-glow" : "border-transparent hover:border-on-screen-muted"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute ${isContainer(part) ? "-bottom-2 -left-2" : "-top-2 -right-2"} grid size-5 place-items-center rounded-node border-2 border-screen-accent ${
                    isSeen ? "bg-screen-accent text-screen" : "bg-screen"
                  }`}
                >
                  {isSeen && <CheckIcon className="size-3" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </SceneStage>
      </div>

      {/* What the tapped part is and does. Announced politely on each tap. */}
      <div aria-live="polite" className="mt-4 min-h-24 rounded-card border border-line bg-surface p-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activePart?.id ?? "none"}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {activePart ? (
              <>
                <p className="text-body font-semibold text-ink">{activePart.name}</p>
                <p className="mt-1 text-body text-ink-muted">{jobs.get(activePart.id)}</p>
                <p className="sr-only">
                  {seen.size} of {total} explored.
                </p>
              </>
            ) : (
              <p className="text-body text-ink-muted">Tap a part on the {card.scene === "phone" ? "phone" : card.scene === "laptop" ? "laptop" : "screen"}.</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {done && (
        <div className="mt-4">
          <p className="inline-flex items-center gap-2 rounded-control bg-accent-soft px-3 py-1.5 text-small font-semibold text-accent-ink">
            <CheckIcon className="size-4" />
            All {total} parts explored
          </p>
          <Markdown className="mt-3 text-body text-ink">{card.explanation}</Markdown>
        </div>
      )}
    </div>
  );
}
