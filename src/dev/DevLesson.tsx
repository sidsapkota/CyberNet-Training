"use client";

import { useState, useSyncExternalStore } from "react";
import { LessonRun } from "@/components/player/LessonRun";
import { QuizRun } from "@/components/player/QuizRun";
import type { CourseOutline, Lesson } from "@/lib/content/schema";
import { LocalStorageProgressStore } from "@/lib/progress/localStorageProgressStore";
import { MemoryStorage } from "@/lib/progress/memoryStorage";
import { ProgressProvider } from "@/lib/progress/ProgressProvider";

/** Dev only: a whole real lesson or quiz from card 1, with throwaway progress (nothing is saved). */
export function DevLesson({ lesson, course }: { lesson: Lesson; course: CourseOutline }) {
  const [store] = useState(() => {
    const memory = new MemoryStorage();
    return new LocalStorageProgressStore(() => memory);
  });
  // Lessons draw their cards in the browser only (after progress loads), so this does too.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!mounted) return null;
  return (
    <ProgressProvider store={store}>
      <div className="flex items-center gap-3 border-b border-warning/40 bg-warning-soft px-gutter py-1.5 font-mono text-caption text-warning">
        <span className="font-semibold tracking-wider uppercase">Dev preview · nothing is saved</span>
        <a href={`/dev/lessons?course=${course.id}`} className="ml-auto inline-flex min-h-11 items-center font-semibold underline">
          All lessons
        </a>
      </div>
      {lesson.kind === "quiz" ? <QuizRun quiz={lesson} course={course} /> : <LessonRun lesson={lesson} course={course} initialIndex={0} />}
    </ProgressProvider>
  );
}
