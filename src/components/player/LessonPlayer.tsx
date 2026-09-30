"use client";

import { Mascot } from "@/components/mascot/Mascot";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ExploreModeIcon } from "@/components/ui/icons";
import type { CourseOutline, Lesson } from "@/lib/content/schema";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { getBlockingLesson, resumeIndex } from "@/lib/progress/state";
import { LessonRun } from "./LessonRun";
import { PlayerShell, PlayerSkeleton, uniformNodes } from "./PlayerShell";
import { QuizRun } from "./QuizRun";

/**
 * Entry point for /lesson/[id]. Waits for progress to load (client-only), shows a
 * friendly gate for locked items, then runs the lesson or quiz.
 */
export function LessonPlayer({ lesson, course }: { lesson: Lesson; course: CourseOutline }) {
  const { snapshot, store } = useProgress();
  if (!snapshot) return <PlayerSkeleton />;

  // In Explore mode nothing is blocked; in Path mode, offer to switch rather than just refusing.
  const blocking = getBlockingLesson(snapshot, course, lesson.id);
  if (blocking) {
    return (
      <PlayerShell
        nodes={uniformNodes(lesson.cards.length, "upcoming")}
        progressLabel="Locked"
        exitHref={`/course/${course.id}`}
      >
        <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
          <Mascot expression="presenting" size={150} idle />
          <h1 className="mt-6 text-title font-semibold text-balance">{lesson.title}</h1>
          <p className="mt-3 max-w-sm text-ink-muted">
            On the path, <strong className="font-semibold text-ink">{blocking.title}</strong> comes first. Or
            switch to Explore and take lessons in any order.
          </p>
          <div className="mt-8 flex w-full max-w-sm flex-col gap-2">
            {/* Switching mode updates the snapshot, which unblocks and renders this lesson. */}
            <Button onClick={() => void store.setPreferences({ mode: "explore" })}>
              <ExploreModeIcon className="size-5" /> Switch to Explore
            </Button>
            <ButtonLink href={`/lesson/${blocking.id}`} variant="ghost">
              Go to {blocking.title}
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
