"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { NetworkMark } from "@/components/network/NetworkMark";
import { ArrowRightIcon, CheckIcon, LockIcon } from "@/components/ui/icons";
import { findCurrentId, mapLane } from "@/lib/network/layout";
import type { LessonState, ModuleState } from "@/lib/progress/state";

/*
 * Geometry (px). Nodes sit on two lanes; a connector between two rows is a vertical stub,
 * a 45° diagonal (dy = dx) and another stub, like a circuit trace.
 */
const TRACK_W = 84;
const LANE_X = [24, 56] as const;
const STUB = 8;
const CONNECTOR_H = STUB * 2 + (LANE_X[1] - LANE_X[0]);

function Connector({ from, to, lit, index }: { from: 0 | 1; to: 0 | 1; lit: boolean; index: number }) {
  const reduceMotion = useReducedMotion();
  const x0 = LANE_X[from];
  const x1 = LANE_X[to];
  const d = `M${x0} 0V${STUB}L${x1} ${CONNECTOR_H - STUB}V${CONNECTOR_H}`;
  return (
    <svg width={TRACK_W} height={CONNECTOR_H} className="block overflow-visible" aria-hidden="true">
      <path d={d} fill="none" stroke="var(--color-line-strong)" strokeWidth={2} strokeLinejoin="round" />
      {lit && (
        <motion.path
          d={d}
          fill="none"
          stroke="var(--color-accent-ink)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          {...(reduceMotion
            ? {}
            : {
                initial: { pathLength: 0 },
                animate: { pathLength: 1 },
                transition: { delay: 0.15 + index * 0.12, duration: 0.35, ease: "easeOut" },
              })}
        />
      )}
    </svg>
  );
}

function PulseRing() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -inset-1 animate-node-pulse rounded-node border-2 border-accent"
    />
  );
}

function LessonNode({ state, number, current, loaded }: { state: LessonState; number: number; current: boolean; loaded: boolean }) {
  const { status } = state;
  const base = "relative grid size-11 place-items-center rounded-node border-2 font-mono text-small font-semibold transition-colors";
  if (!loaded) return <span className={`${base} border-line bg-surface text-ink-faint`}>{number}</span>;
  if (status === "completed")
    return (
      <span className={`${base} border-accent-ink bg-accent text-on-accent shadow-glow`}>
        <CheckIcon className="size-5" strokeWidth={2.5} />
      </span>
    );
  if (status === "locked")
    return (
      <span className={`${base} border-line-strong bg-surface text-ink-faint`}>
        <LockIcon className="size-4" />
      </span>
    );
  return (
    <span className={`${base} border-accent-ink bg-surface text-accent-ink`}>
      {current && <PulseRing />}
      {number}
    </span>
  );
}

function QuizHubNode({ state, current, loaded }: { state: LessonState; current: boolean; loaded: boolean }) {
  const { status } = state;
  const completed = loaded && status === "completed";
  const locked = !loaded || status === "locked";
  return (
    <span
      className={`relative grid size-16 place-items-center rounded-node border-2 ${
        completed
          ? "border-accent-ink bg-accent-soft shadow-glow"
          : locked
            ? "border-line-strong bg-surface"
            : "border-accent-ink bg-surface"
      }`}
    >
      {current && <PulseRing />}
      <NetworkMark mode={completed || !locked ? "lit" : "dim"} shield={false} className="size-11" />
      {loaded && status === "locked" && (
        <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-node border-2 border-line-strong bg-surface text-ink-faint">
          <LockIcon className="size-3" />
        </span>
      )}
      {completed && (
        <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-node border-2 border-accent-ink bg-accent text-on-accent">
          <CheckIcon className="size-3.5" strokeWidth={2.5} />
        </span>
      )}
    </span>
  );
}

function StatusLabel({ state, loaded }: { state: LessonState; loaded: boolean }) {
  if (!loaded) return null;
  const common = "inline-flex shrink-0 items-center gap-1 text-small font-semibold";
  switch (state.status) {
    case "completed":
      return (
        <span className={`${common} text-success`}>
          <CheckIcon className="size-4" /> Done
        </span>
      );
    case "locked":
      return (
        <span className={`${common} text-ink-faint`}>
          <LockIcon className="size-4" /> Locked
        </span>
      );
    case "in_progress":
      return (
        <span className={`${common} text-accent-ink`}>
          {state.lesson.kind === "quiz" ? "Retake" : "Continue"} <ArrowRightIcon className="size-4" />
        </span>
      );
    default:
      return (
        <span className={`${common} text-accent-ink`}>
          Start <ArrowRightIcon className="size-4" />
        </span>
      );
  }
}

function detailFor(state: LessonState, loaded: boolean): string {
  const { lesson } = state;
  if (lesson.kind === "quiz") {
    let detail = `${lesson.cardCount} questions · pass ${Math.round((lesson.passThreshold ?? 0) * 100)}%`;
    if (loaded && state.bestScore !== null) detail += ` · best ${Math.round(state.bestScore * 100)}%`;
    return detail;
  }
  let detail = `${lesson.cardCount} cards`;
  if (loaded && state.status === "in_progress") {
    detail += ` · ${state.completedCoreCards}/${lesson.coreCardIds.length} done`;
  }
  return detail;
}

/**
 * A module's lessons as a vertical network path. Completed nodes glow, the current node
 * pulses, locked nodes are dim outlines, and connections light up as the learner progresses.
 */
export function ModuleMap({ state, loaded }: { state: ModuleState; loaded: boolean }) {
  const items = state.lessons;
  const currentId = loaded ? findCurrentId(items.map((l) => ({ id: l.lesson.id, status: l.status }))) : null;

  return (
    <ol aria-label={`${state.module.title} lessons`}>
      {items.map((item, i) => {
        const isQuiz = item.lesson.kind === "quiz";
        const lane = mapLane(i);
        const nodeSize = isQuiz ? 64 : 44;
        const locked = loaded && item.status === "locked";
        const previous = items[i - 1];
        const current = item.lesson.id === currentId;

        const row = (
          <>
            <span className="relative shrink-0" style={{ width: TRACK_W, height: nodeSize }}>
              <span className="absolute top-0" style={{ left: LANE_X[lane] - nodeSize / 2 }}>
                {isQuiz ? (
                  <QuizHubNode state={item} current={current} loaded={loaded} />
                ) : (
                  <LessonNode state={item} number={i + 1} current={current} loaded={loaded} />
                )}
              </span>
            </span>
            <span className="min-w-0 flex-1 py-1">
              <span className="block font-mono text-caption tracking-wider text-ink-faint uppercase">
                {isQuiz ? "Module quiz" : `Lesson ${String(i + 1).padStart(2, "0")}`}
              </span>
              <span className={`block font-semibold ${locked ? "text-ink-muted" : "text-ink"}`}>
                {item.lesson.title}
              </span>
              <span className="block font-mono text-caption text-ink-faint">{detailFor(item, loaded)}</span>
            </span>
            <span className="pr-1">
              <StatusLabel state={item} loaded={loaded} />
            </span>
          </>
        );

        return (
          <li key={item.lesson.id}>
            {previous && (
              <Connector
                from={mapLane(i - 1)}
                to={lane}
                lit={loaded && previous.status === "completed"}
                index={i}
              />
            )}
            {locked ? (
              <div className="flex items-center gap-2 rounded-control" aria-disabled="true">
                {row}
                <span className="sr-only">
                  {isQuiz ? "Finish every lesson in this module to unlock the quiz." : "Finish the previous lesson to unlock."}
                </span>
              </div>
            ) : (
              <Link
                href={`/lesson/${item.lesson.id}`}
                aria-current={current ? "step" : undefined}
                className="group flex items-center gap-2 rounded-control transition-colors hover:bg-surface-raised"
              >
                {row}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}
