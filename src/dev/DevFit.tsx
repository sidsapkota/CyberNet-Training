"use client";

import { useState, useSyncExternalStore } from "react";
import { LessonRun } from "@/components/player/LessonRun";
import { COACH_KEYS } from "@/lib/coach";
import type { CourseOutline, Lesson, RegularLesson } from "@/lib/content/schema";
import { LocalStorageProgressStore } from "@/lib/progress/localStorageProgressStore";
import { MemoryStorage } from "@/lib/progress/memoryStorage";
import { ProgressProvider } from "@/lib/progress/ProgressProvider";

/**
 * Dev only: one card of a real lesson in the lesson player, with throwaway progress and every
 * how-to-play panel already dismissed (so the card is measured as a returning learner sees it).
 * Quiz cards are shown through the lesson player too (the same card components).
 */
export function DevFit({ lesson, course, index }: { lesson: Lesson; course: CourseOutline; index: number }) {
  const [store] = useState(() => {
    const memory = new MemoryStorage();
    const s = new LocalStorageProgressStore(() => memory);
    void s.setPreferences({ coachSeen: [...COACH_KEYS] });
    return s;
  });
  // Real lessons draw their cards only in the browser (after progress loads), so this does too: a
  // server render here would only add hydration noise that learners never meet.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const regular: RegularLesson =
    lesson.kind === "lesson" ? lesson : ({ ...lesson, kind: "lesson", icon: "layers", about: "A quiz, shown as a lesson for the fit check." } as RegularLesson);
  if (!mounted) return null;
  return (
    <ProgressProvider store={store}>
      <LessonRun lesson={regular} course={course} initialIndex={index} />
    </ProgressProvider>
  );
}
