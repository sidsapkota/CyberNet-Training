"use client";

import { motion, useReducedMotion } from "motion/react";
import { Mascot } from "@/components/mascot/Mascot";
import { NetworkMark } from "@/components/network/NetworkMark";
import type { CourseOutline } from "@/lib/content/schema";
import { EASE_OUT_QUICK, staggerDelay } from "@/lib/motion";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { CourseCard } from "./CourseCard";

/**
 * Grid of course cards. While there's only one course, a dim "more on the way" tile keeps the grid
 * from looking empty without inventing course names; it disappears once a second course exists.
 */
export function CourseCatalog({ courses }: { courses: CourseOutline[] }) {
  const { snapshot } = useProgress();
  const reduceMotion = useReducedMotion();
  const tiles = courses.length;

  // Like the dashboard and path, draw after progress loads (client-only). The entrance then
  // matches the viewer's reduced-motion setting, which the server can't know.
  if (!snapshot) {
    return (
      <div className="grid min-h-[40dvh] place-items-center">
        <NetworkMark mode="loading" className="size-16" label="Loading courses" />
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center text-center">
        <Mascot expression="presenting" size={140} idle />
        <p className="mt-4 text-lead font-semibold">No courses yet</p>
        <p className="mt-1 text-ink-muted">New courses will appear here.</p>
      </div>
    );
  }

  return (
    <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course, i) => (
        <motion.li
          key={course.id}
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: staggerDelay(i, 0.06), ease: EASE_OUT_QUICK }}
        >
          <CourseCard course={course} startHere={i === 0} />
        </motion.li>
      ))}
      {tiles < 2 && (
        <motion.li
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: staggerDelay(tiles, 0.06) }}
          className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line-strong p-6 text-center"
        >
          <NetworkMark mode="dim" className="size-14" />
          <p className="text-small font-semibold text-ink-muted">More courses on the way</p>
        </motion.li>
      )}
    </ul>
  );
}
