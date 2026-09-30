"use client";

import { NetworkMark } from "@/components/network/NetworkMark";
import { CheckIcon, LockIcon } from "@/components/ui/icons";
import type { CourseOutline } from "@/lib/content/schema";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { computeCourseState, type ModuleState } from "@/lib/progress/state";
import { emptySnapshot } from "@/lib/progress/types";
import { ModuleMap } from "./CourseMap";

/**
 * Courses → modules, each module drawn as a network path of lessons ending in its quiz hub.
 * Progress lives in the browser, so until it loads we render the structure with neutral nodes.
 */
export function CourseList({ courses }: { courses: CourseOutline[] }) {
  const { snapshot } = useProgress();
  const loaded = snapshot !== null;

  if (courses.length === 0) {
    return (
      <div className="mt-16 flex flex-col items-center text-center">
        <NetworkMark mode="dim" className="size-24" />
        <p className="mt-6 text-lead font-semibold">No courses yet</p>
        <p className="mt-1 text-ink-muted">New courses will appear here as they&apos;re published.</p>
      </div>
    );
  }

  return (
    <div className="mt-12 space-y-section">
      {courses.map((course) => {
        const state = computeCourseState(snapshot ?? emptySnapshot(), course);
        return (
          <section key={course.id} aria-labelledby={`course-${course.id}`}>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 id={`course-${course.id}`} className="text-headline font-semibold">
                {course.title}
              </h2>
              {loaded && (
                <span className="font-mono text-small text-ink-muted">
                  {state.completedModules}/{course.modules.length} modules
                </span>
              )}
            </div>
            <p className="mt-1 max-w-2xl text-ink-muted">{course.description}</p>

            <div className="mt-6">
              {state.modules.map((moduleState, i) => (
                <div key={moduleState.module.id}>
                  {i > 0 && (
                    <ModuleLink lit={loaded && state.modules[i - 1]?.status === "completed"} />
                  )}
                  <ModuleCard state={moduleState} number={i + 1} loaded={loaded} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** The trace joining one module to the next, lit once the previous module is complete. */
function ModuleLink({ lit }: { lit: boolean }) {
  return (
    <div aria-hidden="true" className="relative h-10">
      <span
        className={`absolute top-0 bottom-0 left-[2.75rem] w-0.5 -translate-x-1/2 ${lit ? "bg-accent-ink" : "bg-line-strong"}`}
      />
    </div>
  );
}

function ModuleCard({ state, number, loaded }: { state: ModuleState; number: number; loaded: boolean }) {
  const { module: mod, status } = state;
  const locked = loaded && status === "locked";

  return (
    <article className="rounded-card border border-line bg-surface shadow-card">
      <header className="flex items-start justify-between gap-4 border-b border-line p-5">
        <div className="min-w-0">
          <p className="font-mono text-caption tracking-wider text-ink-faint uppercase">
            Module {String(number).padStart(2, "0")}
            {loaded && (
              <span className="ml-2 normal-case tracking-normal">
                · {state.completedItems}/{state.totalItems} connected
              </span>
            )}
          </p>
          <h3 className={`mt-1 text-title font-semibold ${locked ? "text-ink-muted" : ""}`}>{mod.title}</h3>
          <p className="mt-1 text-ink-muted">{mod.description}</p>
        </div>
        {loaded && status === "completed" && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-success-soft px-2 py-1 text-small font-semibold text-success">
            <CheckIcon className="size-4" /> Complete
          </span>
        )}
        {locked && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-surface-raised px-2 py-1 text-small font-semibold text-ink-muted">
            <LockIcon className="size-4" /> Locked
          </span>
        )}
      </header>
      <div className="px-5 py-4">
        <ModuleMap state={state} loaded={loaded} />
      </div>
    </article>
  );
}
