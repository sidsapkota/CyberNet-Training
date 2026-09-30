"use client";

import { ButtonLink } from "@/components/ui/Button";
import { LockIcon } from "@/components/ui/icons";
import type { CourseOutline, Lesson } from "@/lib/content/schema";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { getBlockingLesson, resumeIndex } from "@/lib/progress/state";
import { LessonRun } from "./LessonRun";
import { PlayerShell, PlayerSkeleton } from "./PlayerShell";
import { QuizRun } from "./QuizRun";

/**
 * Entry point for /lesson/[id]. Waits for progress to load (client-only), shows a
 * friendly gate for locked items, then runs the lesson or quiz.
 */
export function LessonPlayer({ lesson, course }: { lesson: Lesson; course: CourseOutline }) {
  const { snapshot } = useProgress();
  if (!snapshot) return <PlayerSkeleton />;

  const blocking = getBlockingLesson(snapshot, course, lesson.id);
  if (blocking) {
    return (
      <PlayerShell progress={0} progressLabel="Locked">
        <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
          <div className="grid size-20 place-items-center rounded-pill bg-surface-muted text-ink-muted">
            <LockIcon className="size-9" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-balance">
            {lesson.title} is locked
          </h1>
          <p className="mt-3 max-w-sm text-ink-muted">
            Lessons unlock in order. Finish <strong className="text-ink">{blocking.title}</strong>{" "}
            first and this one will open up.
          </p>
          <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
            <ButtonLink href={`/lesson/${blocking.id}`}>Go to {blocking.title}</ButtonLink>
            <ButtonLink href="/" variant="ghost">
              Back to courses
            </ButtonLink>
          </div>
        </div>
      </PlayerShell>
    );
  }

  if (lesson.kind === "quiz") return <QuizRun key={lesson.id} quiz={lesson} course={course} />;

  return (
    <LessonRun
      key={lesson.id}
      lesson={lesson}
      course={course}
      initialIndex={resumeIndex(snapshot, lesson.id, lesson.cards)}
    />
  );
}
