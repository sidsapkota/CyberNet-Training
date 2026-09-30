"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { CourseCover } from "@/components/illustrations/CourseCover";
import { NetworkMark } from "@/components/network/NetworkMark";
import { ButtonLink } from "@/components/ui/Button";
import { CheckIcon, PlayIcon } from "@/components/ui/icons";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { estimateMinutes } from "@/lib/content/estimate";
import type { CourseOutline } from "@/lib/content/schema";
import { EASE_OUT_QUICK, staggerDelay } from "@/lib/motion";
import { modulePathLayout } from "@/lib/network/path";
import { useProgress } from "@/lib/progress/ProgressProvider";
import {
  computeCourseState,
  type CourseState,
  courseProgress,
  getBlockingLesson,
  getCurrentLesson,
  type ModuleState,
  snapshotBefore,
} from "@/lib/progress/state";
import type { ProgressSnapshot } from "@/lib/progress/types";
import { ModeToggle } from "./ModeToggle";
import { nodeLook, PathNode } from "./PathNode";

/** How long the path shows the "before" state when returning from a completed lesson. */
const REVEAL_DELAY_MS = 650;

/** Reads `?completed=<lessonId>` once (set by the lesson and quiz end screens). */
function readCompletedParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("completed");
}

/**
 * The course page: a Duolingo-style path of lesson nodes, module by module, with a sticky side
 * panel on desktop. Progress is client-only, so the network loading mark shows until it's read.
 */
export function CoursePath({ course }: { course: CourseOutline }) {
  const { snapshot } = useProgress();
  const reduceMotion = useReducedMotion();
  const [justCompleted] = useState(readCompletedParam);
  const [revealed, setRevealed] = useState(false);

  // Drop the query so a refresh doesn't replay the animation, then reveal the new state.
  useEffect(() => {
    if (!justCompleted) return;
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, [justCompleted]);

  useEffect(() => {
    if (!snapshot || revealed) return;
    const timer = window.setTimeout(() => setRevealed(true), justCompleted && !reduceMotion ? REVEAL_DELAY_MS : 0);
    return () => window.clearTimeout(timer);
  }, [snapshot, revealed, justCompleted, reduceMotion]);

  // Bring the current (or just-completed) node into view once the path is drawn.
  useEffect(() => {
    if (!snapshot) return;
    const target =
      (justCompleted && document.querySelector<HTMLElement>(`[data-lesson="${justCompleted}"]`)) ||
      document.querySelector<HTMLElement>("[data-current]");
    if (!target) return;
    const rect = target.getBoundingClientRect();
    if (rect.top < 80 || rect.bottom > window.innerHeight - 96) {
      target.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
    }
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot === null]);

  if (!snapshot) {
    return (
      <div className="grid min-h-[60dvh] place-items-center">
        <NetworkMark mode="loading" className="size-20" label="Loading the course path" />
      </div>
    );
  }

  const showBefore = justCompleted !== null && !revealed;
  const shown: ProgressSnapshot = showBefore ? snapshotBefore(snapshot, justCompleted) : snapshot;
  const state = computeCourseState(shown, course);
  const current = getCurrentLesson(state);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
      <div>
        <MobileHeader state={state} />
        <h1 className="sr-only lg:not-sr-only lg:text-headline lg:font-semibold">{course.title}</h1>
        <div className="mt-4 space-y-10 lg:mt-8">
          {state.modules.map((mod, m) => (
            <ModulePath
              key={mod.module.id}
              state={mod}
              number={m + 1}
              snapshot={shown}
              course={course}
              currentId={current?.lesson.id ?? null}
              justFilledId={revealed ? justCompleted : null}
              staggerOffset={state.modules.slice(0, m).reduce((n, s) => n + s.lessons.length, 0)}
            />
          ))}
        </div>
        <CourseEnd done={current === null} />
      </div>
      <aside className="hidden lg:block">
        <SidePanel state={state} />
      </aside>
    </div>
  );
}

function MobileHeader({ state }: { state: CourseState }) {
  const { fraction } = courseProgress(state);
  return (
    <div className="lg:hidden">
      <div className="flex items-center gap-3">
        <ProgressRing value={fraction} size={48} stroke={5} label={`${Math.round(fraction * 100)}% complete`}>
          <span className="font-mono text-[0.7rem] font-semibold tabular-nums">{Math.round(fraction * 100)}%</span>
        </ProgressRing>
        <p className="min-w-0 truncate text-title font-semibold" aria-hidden="true">
          {state.course.title}
        </p>
      </div>
      <ModeToggle className="mt-4" />
    </div>
  );
}

function SidePanel({ state }: { state: CourseState }) {
  const { completed, total, fraction } = courseProgress(state);
  const current = getCurrentLesson(state);
  const percent = Math.round(fraction * 100);
  return (
    <div className="sticky top-24 space-y-4">
      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <CourseCover courseId={state.course.id} title={state.course.title} className="aspect-[16/9]" />
        <div className="flex items-center gap-4 p-4">
          <ProgressRing value={fraction} size={64} label={`${percent}% complete`}>
            <span className="font-mono text-small font-semibold tabular-nums">{percent}%</span>
          </ProgressRing>
          <div>
            <p className="font-semibold">{percent === 100 ? "Complete" : "Your progress"}</p>
            <p className="font-mono text-caption text-ink-faint">
              {completed}/{total} · {state.completedModules}/{state.modules.length} modules
            </p>
          </div>
        </div>
      </div>
      <ModeToggle />
      {current && (
        <div className="rounded-card border border-line bg-surface p-4 shadow-card">
          <p className="font-mono text-caption tracking-widest text-ink-faint uppercase">Up next</p>
          <p className="mt-1 leading-snug font-semibold">{current.lesson.title}</p>
          <p className="text-small text-ink-muted">About {estimateMinutes(current.lesson)} min</p>
          <ButtonLink href={`/lesson/${current.lesson.id}`} className="mt-4 w-full">
            <PlayIcon className="size-5" /> {current.status === "in_progress" ? "Continue" : "Start"}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

function ModuleBanner({ state, number }: { state: ModuleState; number: number }) {
  const done = state.status === "completed";
  const locked = state.status === "locked";
  return (
    <div
      className={`flex items-center gap-3 rounded-card border px-4 py-3 ${
        done ? "border-accent-ink bg-accent-soft" : "border-line bg-surface"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-mono text-caption font-semibold tracking-widest text-ink-faint uppercase">
          Module {number}
        </p>
        <h2 className={`truncate text-lead font-semibold ${locked ? "text-ink-muted" : "text-ink"}`}>
          {state.module.title}
        </h2>
      </div>
      {done && (
        <span className="grid size-8 shrink-0 place-items-center rounded-node bg-accent text-on-accent" aria-label="Module complete">
          <CheckIcon className="size-4" strokeWidth={2.5} />
        </span>
      )}
    </div>
  );
}

function ModulePath({
  state,
  number,
  snapshot,
  course,
  currentId,
  justFilledId,
  staggerOffset,
}: {
  state: ModuleState;
  number: number;
  snapshot: ProgressSnapshot;
  course: CourseOutline;
  currentId: string | null;
  justFilledId: string | null;
  staggerOffset: number;
}) {
  const reduceMotion = useReducedMotion();
  const layout = modulePathLayout(
    state.lessons.map((l) => l.lesson.kind),
    staggerOffset,
  );
  const width = layout.halfWidth * 2 + 32;

  return (
    <section aria-label={`Module ${number}: ${state.module.title}`}>
      <ModuleBanner state={state} number={number} />
      <div className="relative mx-auto mt-14" style={{ height: layout.height, maxWidth: width }}>
        <svg
          aria-hidden="true"
          className="absolute top-0 left-1/2 overflow-visible"
          width={1}
          height={layout.height}
          style={{ transform: "translateX(-0.5px)" }}
        >
          {layout.traces.map((trace) => {
            const lit = state.lessons[trace.from]?.status === "completed";
            return (
              <g key={trace.from}>
                <path d={trace.d} fill="none" stroke="var(--color-line-strong)" strokeWidth={4} strokeLinejoin="round" />
                {lit && (
                  <motion.path
                    d={trace.d}
                    fill="none"
                    stroke="var(--color-accent-ink)"
                    strokeWidth={4}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    initial={reduceMotion ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, delay: staggerDelay(staggerOffset + trace.from, 0.03, 0.6) + 0.15, ease: EASE_OUT_QUICK }}
                  />
                )}
              </g>
            );
          })}
        </svg>
        <ol>
          {state.lessons.map((item, i) => {
            const node = layout.nodes[i]!;
            const blocking = item.status === "locked" ? getBlockingLesson(snapshot, course, item.lesson.id) : null;
            return (
              <li
                key={item.lesson.id}
                data-lesson={item.lesson.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `calc(50% + ${node.x}px)`, top: node.y }}
              >
                <PathNode
                  state={item}
                  number={i + 1}
                  look={nodeLook(item, item.lesson.id === currentId)}
                  blocking={blocking}
                  entranceDelay={staggerDelay(staggerOffset + i, 0.03, 0.6)}
                  justFilled={item.lesson.id === justFilledId}
                />
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function CourseEnd({ done }: { done: boolean }) {
  return (
    <div className="mt-14 flex flex-col items-center gap-3 pb-6 text-center">
      <NetworkMark mode={done ? "lit" : "dim"} className="size-16" label={done ? "Course complete" : "Course finish line"} />
      {done && <p className="font-semibold">Course complete</p>}
    </div>
  );
}
