"use client";

import { AnimatePresence, motion, type PanInfo, useReducedMotion } from "motion/react";
import { type ReactNode, useState } from "react";
import { HintIcon, WarningIcon } from "@/components/ui/icons";
import { useFeedback } from "@/lib/feedback";
import { CardPrompt } from "../CardPrompt";
import { CardStatusNote } from "../CardStatusNote";
import { getScene, hiddenInView, type ScenePart } from "../shared/scenes/manifests";
import { overlayOrder, partTargetStyle, SceneStage } from "../shared/scenes/SceneStage";
import type { CardComponentProps } from "../types";
import { describeAction, nextActionFor, partStates, type PartState, tryPart } from "./grade";
import { REMOVE_VERBS, type TeardownAction, type TeardownAnswer, type TeardownCard } from "./schema";

/** The drag distance (px) that counts as pulling a part off. */
const DRAG_THRESHOLD = 28;

function partMotion(state: PartState | undefined, verb: TeardownAction["verb"] | undefined, part: ScenePart, instant: boolean) {
  const exit = part.exit ?? { x: 0, y: -30 };
  const quick = { duration: 0 };
  if (state === "out") {
    if (verb === "unscrew") {
      return {
        animate: { rotate: 720, scale: 0.3, opacity: 0, x: exit.x, y: exit.y },
        transition: instant ? quick : { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
      };
    }
    if (verb === "slide-out") {
      // A little weight: slow to start, then gone.
      return {
        animate: { x: exit.x, y: exit.y, opacity: 0 },
        transition: instant ? quick : { duration: 0.55, ease: [0.55, 0, 0.8, 0.4] as const, opacity: { delay: 0.3, duration: 0.25 } },
      };
    }
    return {
      animate: { x: exit.x, y: exit.y, opacity: 0, scale: 1.04 },
      transition: instant ? quick : { type: "spring" as const, stiffness: 260, damping: 18, opacity: { delay: 0.25, duration: 0.2 } },
    };
  }
  if (state === "unplugged") {
    return { animate: { x: exit.x, y: exit.y, opacity: 0.55 }, transition: instant ? quick : { type: "spring" as const, stiffness: 400, damping: 22 } };
  }
  return {
    animate: { x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 },
    transition: instant ? quick : { type: "spring" as const, stiffness: 320, damping: 22 },
  };
}

export function TeardownCardView({ card, answer, onAnswerChange, status }: CardComponentProps<TeardownCard, TeardownAnswer>) {
  const reduceMotion = useReducedMotion();
  const feedback = useFeedback();
  const locked = status !== "answering";
  const scene = getScene(card.scene)!;
  const [nudge, setNudge] = useState<{ text: string; key: number; part: string } | null>(null);

  const states = partStates(card, answer);
  const hiddenAtStart = new Set(hiddenInView(card.scene, card.view));
  const byId = new Map(card.actions.map((a) => [a.id, a]));
  const lastVerb = new Map<string, TeardownAction["verb"]>();
  for (const id of answer.done) {
    const a = byId.get(id);
    if (a) lastVerb.set(a.part, a.verb);
  }
  const isOff = (partId: string) => hiddenAtStart.has(partId) || states.get(partId) === "out";

  function attempt(partId: string) {
    if (locked) return;
    const result = tryPart(card, answer, partId);
    if (result.kind === "nothing") return;
    onAnswerChange(result.answer);
    if (result.kind === "done") {
      setNudge(null);
      const removing = (REMOVE_VERBS as readonly string[]).includes(result.action.verb);
      feedback.play(removing ? "remove" : "snap");
      feedback.haptic("tap");
    } else {
      setNudge((previous) => ({ text: result.action.nudge, key: (previous?.key ?? 0) + 1, part: partId }));
      feedback.haptic("error");
    }
  }

  // Parts with something left to do, that can be seen (not under a cover that's still on).
  const actionable = overlayOrder(
    scene.parts.filter((p) => {
      if (!nextActionFor(card, answer, p.id)) return false;
      if (isOff(p.id)) return false; // off parts come back via the tray
      return !p.coveredBy || isOff(p.coveredBy);
    }),
  );
  const tray = scene.parts.filter((p) => states.get(p.id) === "out");
  // Screws with nothing left to do are grouped into one "4 screws" chip.
  const isLooseScrew = (p: ScenePart) => p.id.startsWith("screw-") && (locked || !nextActionFor(card, answer, p.id));
  const looseScrews = tray.filter(isLooseScrew).length;
  const trayParts = tray.filter((p) => !isLooseScrew(p));

  const wrap = (partId: string, node: ReactNode) => {
    const part = scene.parts.find((p) => p.id === partId)!;
    const m = partMotion(states.get(partId), lastVerb.get(partId), part, Boolean(reduceMotion));
    return (
      <motion.g style={{ transformBox: "fill-box", transformOrigin: "center" }} initial={false} animate={m.animate} transition={m.transition}>
        {node}
      </motion.g>
    );
  };

  const doneCount = answer.done.length;
  return (
    <div>
      <CardPrompt>{card.prompt}</CardPrompt>
      <p className="mt-3 flex items-start gap-2 rounded-control border border-line bg-surface-raised px-3 py-2 text-small text-ink-muted">
        <WarningIcon className="mt-0.5 size-4 shrink-0 text-warning" />
        <span>
          <strong className="font-semibold text-ink">This is a simulation.</strong> Real phones and laptops should only be
          opened by an adult or a repair shop.
        </span>
      </p>

      <div className="mt-4 flex items-center gap-3" aria-live="polite">
        <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-line">
          <div className="h-full rounded-sm bg-accent transition-[width] duration-300" style={{ width: `${(doneCount / card.actions.length) * 100}%` }} />
        </div>
        <span className="font-mono text-caption text-ink-muted tabular-nums">
          {doneCount}/{card.actions.length} steps
        </span>
      </div>

      <div className="mt-3">
        <SceneStage sceneId={card.scene} hidden={hiddenAtStart} wrap={wrap}>
          {!locked &&
            actionable.map((part) => {
              const action = nextActionFor(card, answer, part.id)!;
              const draggable = !reduceMotion && (action.verb === "lift" || action.verb === "slide-out");
              const shaking = nudge?.part === part.id;
              return (
                <motion.button
                  key={`${part.id}-${nudge?.key ?? 0}`}
                  type="button"
                  data-keyboard-passthrough
                  aria-label={describeAction(action, part.name)}
                  onClick={() => attempt(part.id)}
                  drag={draggable}
                  dragSnapToOrigin
                  dragElastic={0.4}
                  onDragEnd={(_e: PointerEvent, info: PanInfo) => {
                    if (Math.hypot(info.offset.x, info.offset.y) > DRAG_THRESHOLD) attempt(part.id);
                  }}
                  animate={shaking && !reduceMotion ? { x: [0, -5, 5, -3, 0] } : undefined}
                  transition={{ duration: 0.25 }}
                  style={{ ...partTargetStyle(card.scene, part.box), touchAction: draggable ? "none" : "manipulation" }}
                  className="rounded-control border-2 border-transparent transition-colors hover:border-screen-accent focus-visible:border-screen-accent"
                />
              );
            })}
        </SceneStage>
      </div>

      <AnimatePresence initial={false}>
        {nudge && !locked && (
          <motion.p
            key={nudge.key}
            role="status"
            initial={reduceMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-start gap-2 rounded-control bg-warning-soft px-3 py-2 text-small text-ink"
          >
            <HintIcon className="mt-0.5 size-4 shrink-0 text-warning" />
            {nudge.text}
          </motion.p>
        )}
      </AnimatePresence>

      {tray.length > 0 && (
        <div className="mt-3">
          <p className="font-mono text-caption tracking-wider text-ink-faint uppercase">Parts out</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {looseScrews > 0 && (
              <span className="inline-flex min-h-9 items-center rounded-control bg-surface-raised px-3 font-mono text-small text-ink-muted">
                {looseScrews} {looseScrews === 1 ? "screw" : "screws"}
              </span>
            )}
            {trayParts.map((part) => {
              const action = nextActionFor(card, answer, part.id);
              return action && !locked ? (
                <button
                  key={part.id}
                  type="button"
                  data-keyboard-passthrough
                  onClick={() => attempt(part.id)}
                  aria-label={describeAction(action, part.name)}
                  className="min-h-11 rounded-control border-2 border-line-strong bg-surface px-3 text-small font-semibold text-ink hover:border-accent-ink"
                >
                  {part.name}
                </button>
              ) : (
                <span key={part.id} className="inline-flex min-h-9 items-center rounded-control bg-surface-raised px-3 text-small text-ink-muted">
                  {part.name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {!locked && doneCount === card.actions.length && <p className="mt-3 text-small text-ink-muted">All done. Press Check.</p>}
      <CardStatusNote status={status} correctText="Done in a safe order" incorrectText="Too many tries in the wrong order" />
    </div>
  );
}
