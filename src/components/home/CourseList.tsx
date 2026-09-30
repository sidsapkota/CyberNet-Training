"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { CheckIcon, LockIcon, PlayIcon, QuizIcon } from "@/components/ui/icons";
import type { CourseOutline } from "@/lib/content/schema";
import { useProgress } from "@/lib/progress/ProgressProvider";
import {
  computeCourseState,
  type ItemStatus,
  type LessonState,
  type ModuleState,
} from "@/lib/progress/state";
import { emptySnapshot } from "@/lib/progress/types";

/**
 * Courses → modules → lessons with progress and lock state. Progress lives in
 * the browser, so until it loads we render the structure with neutral statuses.
 */
export function CourseList({ courses }: { courses: CourseOutline[] }) {
  const { snapshot } = useProgress();
  const loaded = snapshot !== null;

  return (
    <div className="mt-12 space-y-16">
      {courses.map((course) => {
        const state = computeCourseState(snapshot ?? emptySnapshot(), course);
        return (
          <section key={course.id} aria-labelledby={`course-${course.id}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`course-${course.id}`} className="text-2xl font-bold tracking-tight">
                {course.title}
              </h2>
              {loaded && (
                <span className="text-sm text-ink-muted">
                  {state.completedModules} of {course.modules.length} module
                  {course.modules.length === 1 ? "" : "s"} complete
                </span>
              )}
            </div>
            <p className="mt-1 max-w-2xl text-ink-muted">{course.description}</p>

            <div className="mt-6 space-y-6">
              {state.modules.map((moduleState, i) => (
                <ModuleCard
                  key={moduleState.module.id}
                  state={moduleState}
                  number={i + 1}
                  loaded={loaded}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ModuleCard({ state, number, loaded }: { state: ModuleState; number: number; loaded: boolean }) {
  const { module: mod, status } = state;
  const locked = loaded && status === "locked";
  const percent = Math.round(state.progress * 100);

  return (
    <article
      className={`overflow-hidden rounded-card border border-line bg-surface shadow-card ${locked ? "opacity-70" : ""}`}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Module {number}
            </p>
            <h3 className="mt-1 text-xl font-bold tracking-tight">{mod.title}</h3>
            <p className="mt-1 text-ink-muted">{mod.description}</p>
          </div>
          {loaded && status === "completed" && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-success-soft px-3 py-1 text-sm font-semibold text-success">
              <CheckIcon className="size-4" strokeWidth={3} /> Complete
            </span>
          )}
          {locked && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-surface-muted px-3 py-1 text-sm font-semibold text-ink-muted">
              <LockIcon className="size-4" /> Locked
            </span>
          )}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div
            role="progressbar"
            aria-label={`${mod.title} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={loaded ? percent : 0}
            className="h-2 flex-1 overflow-hidden rounded-pill bg-surface-muted"
          >
            <motion.div
              className={`h-full rounded-pill ${status === "completed" ? "bg-success" : "bg-primary"}`}
              initial={{ width: 0 }}
              animate={{ width: `${loaded ? percent : 0}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 20 }}
            />
          </div>
          <span className="w-20 text-right text-sm text-ink-muted tabular-nums">
            {loaded ? `${state.completedItems}/${state.totalItems} done` : " "}
          </span>
        </div>
      </div>

      <ul className="border-t border-line">
        {state.lessons.map((lessonState) => (
          <li key={lessonState.lesson.id} className="border-b border-line last:border-b-0">
            <LessonRow state={lessonState} loaded={loaded} />
          </li>
        ))}
      </ul>
    </article>
  );
}

const statusText: Record<ItemStatus, string> = {
  locked: "Locked",
  available: "Start",
  in_progress: "Continue",
  completed: "Done",
};

function LessonRow({ state, loaded }: { state: LessonState; loaded: boolean }) {
  const { lesson, status } = state;
  const isQuiz = lesson.kind === "quiz";
  const locked = loaded && status === "locked";

  let detail: string;
  if (isQuiz) {
    const pass = Math.round((lesson.passThreshold ?? 0) * 100);
    detail = `${lesson.cardCount} questions · pass ${pass}%`;
    if (loaded && state.bestScore !== null) detail += ` · best ${Math.round(state.bestScore * 100)}%`;
  } else {
    detail = `${lesson.cardCount} cards`;
    if (loaded && status === "in_progress") {
      detail += ` · ${state.completedCoreCards}/${lesson.coreCardIds.length} core done`;
    }
  }

  const icon = !loaded ? (
    <span className="size-5" />
  ) : status === "completed" ? (
    <CheckIcon className="size-5" strokeWidth={3} />
  ) : locked ? (
    <LockIcon className="size-5" />
  ) : isQuiz ? (
    <QuizIcon className="size-5" />
  ) : (
    <PlayIcon className="size-4" />
  );

  const iconTone = !loaded
    ? "bg-surface-muted"
    : status === "completed"
      ? "bg-success text-on-primary"
      : locked
        ? "bg-surface-muted text-ink-faint"
        : "bg-primary-soft text-primary";

  const content = (
    <>
      <span className={`grid size-10 shrink-0 place-items-center rounded-pill ${iconTone}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className={`block font-semibold ${locked ? "text-ink-muted" : ""}`}>
          {lesson.title}
        </span>
        <span className="block text-sm text-ink-muted">{detail}</span>
      </span>
      {loaded && (
        <span
          className={`shrink-0 text-sm font-semibold ${
            status === "completed" ? "text-success" : locked ? "text-ink-faint" : "text-primary"
          }`}
        >
          {statusText[status]}
        </span>
      )}
    </>
  );

  const rowClasses = "flex items-center gap-4 px-5 py-4 sm:px-6";

  if (locked) {
    return (
      <div className={`${rowClasses} cursor-not-allowed`} aria-disabled="true">
        {content}
        <span className="sr-only">
          {isQuiz ? "Finish every lesson in this module to unlock the quiz." : "Finish the previous lesson to unlock."}
        </span>
      </div>
    );
  }

  return (
    <Link
      href={`/lesson/${lesson.id}`}
      className={`${rowClasses} transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted`}
    >
      {content}
    </Link>
  );
}
