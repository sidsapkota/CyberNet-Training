"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { CheckIcon, XIcon } from "@/components/ui/icons";
import { useFeedback } from "@/lib/feedback";
import { PRESS_SPRING } from "@/lib/motion";
import { CardPrompt } from "../CardPrompt";
import { CardStatusNote } from "../CardStatusNote";
import { hiddenInView, type ScenePart } from "../shared/scenes/manifests";
import { overlayOrder, partTargetStyle, SceneStage } from "../shared/scenes/SceneStage";
import type { CardComponentProps } from "../types";
import { labelOrder, placeLabel, removeLabel, tappableParts, toggleTap } from "./grade";
import type { HotspotAnswer, HotspotCard } from "./schema";

export function HotspotCardView({ card, answer, onAnswerChange, status }: CardComponentProps<HotspotCard, HotspotAnswer>) {
  const locked = status !== "answering";
  const feedback = useFeedback();
  const hidden = new Set(hiddenInView(card.scene, card.view));
  const parts = overlayOrder(tappableParts(card));

  return (
    <div>
      <CardPrompt>{card.prompt}</CardPrompt>
      {card.mode === "tap" ? (
        <TapMode card={card} answer={answer} onAnswerChange={onAnswerChange} status={status} parts={parts} hidden={hidden} locked={locked} onTap={() => feedback.haptic("tap")} />
      ) : (
        <LabelMode card={card} answer={answer} onAnswerChange={onAnswerChange} status={status} parts={parts} hidden={hidden} locked={locked} onPlace={() => { feedback.play("snap"); feedback.haptic("tap"); }} />
      )}
      <CardStatusNote
        status={status}
        correctText={card.mode === "tap" ? "You found them all" : "Every label is in the right place"}
        incorrectText={card.mode === "tap" ? "Not quite the right parts" : "Some labels are on the wrong parts"}
      />
    </div>
  );
}

interface ModeProps extends CardComponentProps<HotspotCard, HotspotAnswer> {
  parts: ScenePart[];
  hidden: Set<string>;
  locked: boolean;
}

function TapMode({ card, answer, onAnswerChange, status, parts, hidden, locked, onTap }: ModeProps & { onTap: () => void }) {
  const need = card.targets?.length ?? 0;
  const targets = new Set(card.targets);
  const selected = new Set(answer.selected);
  return (
    <>
      <p className="mt-2 text-small text-ink-muted" aria-live="polite">
        Tap {need === 1 ? "one part" : `${need} parts`}.{" "}
        <span className="font-mono text-ink">
          {selected.size}/{need}
        </span>{" "}
        selected
      </p>
      <div className="mt-4">
        <SceneStage sceneId={card.scene} hidden={hidden}>
          {parts.map((part) => {
            const isSelected = selected.has(part.id);
            const isTarget = targets.has(part.id);
            const result = locked ? (isSelected ? (isTarget ? "correct" : "wrong") : isTarget && status === "incorrect" ? "missed" : null) : null;
            const ring =
              result === "correct"
                ? "border-screen-success"
                : result === "wrong"
                  ? "border-screen-danger"
                  : result === "missed"
                    ? "border-dashed border-screen-success"
                    : isSelected
                      ? "border-screen-accent shadow-glow"
                      : "border-transparent hover:border-on-screen-muted";
            return (
              <button
                key={part.id}
                type="button"
                data-keyboard-passthrough
                disabled={locked}
                aria-pressed={locked ? undefined : isSelected}
                aria-label={`${part.name}${result === "correct" ? ", correct" : result === "wrong" ? ", not this one" : result === "missed" ? ", this one was needed" : ""}`}
                onClick={() => {
                  onAnswerChange(toggleTap(card, answer, part.id));
                  onTap();
                }}
                style={partTargetStyle(card.scene, part.box)}
                className={`rounded-control border-2 transition-colors focus-visible:outline-offset-2 disabled:cursor-default ${ring}`}
              >
                {(isSelected || result) && (
                  <span
                    className={`absolute -top-2 -right-2 grid size-5 place-items-center rounded-node border-2 bg-screen ${
                      result === "wrong" ? "border-screen-danger text-screen-danger" : result ? "border-screen-success text-screen-success" : "border-screen-accent text-screen-accent"
                    }`}
                  >
                    {result === "wrong" ? <XIcon className="size-3" strokeWidth={3} /> : <CheckIcon className="size-3" strokeWidth={3} />}
                  </span>
                )}
              </button>
            );
          })}
        </SceneStage>
      </div>
    </>
  );
}

function LabelMode({ card, answer, onAnswerChange, parts, hidden, locked, onPlace }: ModeProps & { onPlace: () => void }) {
  const reduceMotion = useReducedMotion();
  const labels = card.labels ?? [];
  const [pickedLabel, setPickedLabel] = useState<number | null>(null);
  const [pickedPart, setPickedPart] = useState<string | null>(null);
  const placedLabels = new Set(Object.values(answer.placed));
  const tray = labelOrder(card).filter((i) => !placedLabels.has(i));
  const markers = [...parts].sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);

  function place(part: string, labelIndex: number) {
    onAnswerChange(placeLabel(answer, part, labelIndex));
    setPickedLabel(null);
    setPickedPart(null);
    onPlace();
  }

  return (
    <>
      <p className="mt-2 text-small text-ink-muted">Pick a label, then tap its spot. Tap a placed label to take it off.</p>
      <div className="mt-4">
        <SceneStage sceneId={card.scene} hidden={hidden}>
          {markers.map((part, n) => {
            const labelIndex = answer.placed[part.id];
            const label = labelIndex === undefined ? null : labels[labelIndex];
            const correct = label ? labels[labelIndex!]?.part === part.id : false;
            const result = locked && label ? (correct ? "correct" : "wrong") : null;
            const style = { ...partTargetStyle(card.scene, part.box), width: "auto", height: "auto", minWidth: 44, minHeight: 44 };
            return (
              <button
                key={part.id}
                type="button"
                data-keyboard-passthrough
                disabled={locked}
                onClick={() => {
                  if (pickedLabel !== null) place(part.id, pickedLabel);
                  else if (label) onAnswerChange(removeLabel(answer, part.id));
                  else setPickedPart(pickedPart === part.id ? null : part.id);
                }}
                aria-pressed={pickedPart === part.id}
                aria-label={`Spot ${n + 1}${label ? `, labelled ${label.label}` : ", no label yet"}${result === "correct" ? ", correct" : result === "wrong" ? ", wrong label" : ""}`}
                style={style}
                className="grid place-items-center disabled:cursor-default"
              >
                {label ? (
                  <motion.span
                    layoutId={reduceMotion ? undefined : `${card.id}-label-${labelIndex}`}
                    transition={PRESS_SPRING}
                    className={`inline-flex items-center gap-1 rounded-sm border-2 bg-surface px-1.5 py-0.5 text-caption font-semibold whitespace-nowrap text-ink shadow-card ${
                      result === "correct" ? "border-success" : result === "wrong" ? "border-danger" : "border-accent-ink"
                    }`}
                  >
                    {result === "correct" && <CheckIcon className="size-3 text-success" strokeWidth={3} />}
                    {result === "wrong" && <XIcon className="size-3 text-danger" strokeWidth={3} />}
                    {label.label}
                  </motion.span>
                ) : (
                  <span
                    className={`grid size-7 place-items-center rounded-node border-2 font-mono text-caption font-semibold ${
                      pickedPart === part.id ? "border-screen-accent bg-screen-accent text-screen" : "border-screen-accent bg-screen text-screen-accent"
                    }`}
                  >
                    {n + 1}
                  </span>
                )}
              </button>
            );
          })}
        </SceneStage>
      </div>
      {!locked && (
        <div role="group" aria-label="Labels" className="mt-4 flex min-h-11 flex-wrap gap-2">
          {tray.map((i) => (
            <motion.button
              key={i}
              type="button"
              data-keyboard-passthrough
              layoutId={reduceMotion ? undefined : `${card.id}-label-${i}`}
              transition={PRESS_SPRING}
              aria-pressed={pickedLabel === i}
              onClick={() => {
                if (pickedPart) place(pickedPart, i);
                else setPickedLabel(pickedLabel === i ? null : i);
              }}
              className={`min-h-11 rounded-control border-2 px-3 text-small font-semibold transition-colors ${
                pickedLabel === i ? "border-accent-ink bg-accent-soft text-ink shadow-glow" : "border-line-strong bg-surface text-ink hover:border-accent-ink"
              }`}
            >
              {labels[i]!.label}
            </motion.button>
          ))}
          {tray.length === 0 && <span className="self-center text-small text-ink-faint">All labels placed. Press Check.</span>}
        </div>
      )}
    </>
  );
}
