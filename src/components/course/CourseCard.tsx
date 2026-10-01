"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { CourseCover } from "@/components/illustrations/CourseCover";
import type { CourseOutline } from "@/lib/content/schema";
import { EASE_OUT_QUICK, PRESS_SPRING } from "@/lib/motion";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { computeCourseState, courseProgress, hasAnyProgress } from "@/lib/progress/state";
import { CourseLevel } from "./CourseLevel";

/**
 * Cover, title, level, a one-line description and a progress bar. The whole card opens the course
 * path. `startHere` (the first, easiest course) shows "Start here" to visitors with no progress yet.
 */
export function CourseCard({ course, startHere = false }: { course: CourseOutline; startHere?: boolean }) {
  const { snapshot } = useProgress();
  const reduceMotion = useReducedMotion();
  const progress = snapshot ? courseProgress(computeCourseState(snapshot, course)) : null;
  const percent = progress ? Math.round(progress.fraction * 100) : 0;
  const newcomer = startHere && snapshot !== null && !hasAnyProgress(snapshot);

  return (
    // Gestures stay the same on server and client (the card is server-rendered on the landing
    // page); MotionConfig's reducedMotion="user" turns these transforms off under reduced motion.
    <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }} transition={PRESS_SPRING} className="h-full">
      <Link
        href={`/course/${course.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-colors hover:border-accent-ink"
      >
        <CourseCover courseId={course.id} title={course.title} className="aspect-[16/9]" />
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <CourseLevel level={course.level} />
              {newcomer && (
                <span className="rounded-sm border border-accent-ink px-2 py-0.5 font-mono text-caption font-semibold tracking-widest text-accent-ink uppercase">
                  Start here
                </span>
              )}
            </div>
            <h3 className="mt-1 text-lead font-semibold">{course.title}</h3>
            <p className="mt-0.5 truncate text-small text-ink-muted">{course.description}</p>
          </div>
          <div className="mt-auto flex items-center gap-3" aria-label={`${percent}% complete`}>
            <div className="h-2 flex-1 overflow-hidden rounded-sm bg-line">
              <motion.div
                className="h-full rounded-sm bg-accent"
                initial={{ width: "0%" }}
                animate={{ width: `${percent}%` }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.8, delay: 0.2, ease: EASE_OUT_QUICK }}
              />
            </div>
            <span className="w-10 text-right font-mono text-caption font-semibold text-ink-muted tabular-nums">
              {progress ? `${percent}%` : "–"}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
