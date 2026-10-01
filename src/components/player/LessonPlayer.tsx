"use client";

import { useEffect, useState } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { ProLockedMessage } from "@/components/pro/ProLocked";
import { WhatsNext } from "@/components/pro/WhatsNext";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ExploreModeIcon } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { CourseOutline, Lesson, LessonOutline } from "@/lib/content/schema";
import type { LockedReason } from "@/lib/pro/access";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { deepLinkGate, resumeIndex } from "@/lib/progress/state";
import { LessonRun } from "./LessonRun";
import { PlayerShell, PlayerSkeleton, uniformNodes } from "./PlayerShell";
import { QuizRun } from "./QuizRun";

type Paid =
  | { state: "none" }
  | { state: "loading" }
  | { state: "ready"; lesson: Lesson }
  | { state: "locked"; reason: LockedReason }
  | { state: "error" };

/**
 * A Pro lesson's content, from /api/lessons/[id], which checks entitlement on the server. Fetched
 * again if the learner signs in or out. `id` null: the page already had the (free) lesson.
 */
function usePaidLesson(id: string | null): Paid {
  const { auth } = useAuth();
  const who = auth.status === "signed-in" ? auth.userId : auth.status;
  const key = id && auth.status !== "loading" ? `${id}:${who}` : null;
  const [result, setResult] = useState<{ key: string; value: Paid } | null>(null);

  useEffect(() => {
    if (!key || !id) return;
    let live = true;
    fetch(`/api/lessons/${encodeURIComponent(id)}`, { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const body = (await response.json()) as { lesson?: Lesson; reason?: string };
        const value: Paid =
          response.ok && body.lesson
            ? { state: "ready", lesson: body.lesson }
            : response.status === 401
              ? { state: "locked", reason: "sign-in" }
              : response.status === 403
                ? { state: "locked", reason: "pro" }
                : { state: "error" };
        if (live) setResult({ key, value });
      })
      .catch(() => {
        if (live) setResult({ key, value: { state: "error" } });
      });
    return () => {
      live = false;
    };
  }, [key, id]);

  if (!id) return { state: "none" };
  return result && result.key === key ? result.value : { state: "loading" };
}

/**
 * Entry point for /lesson/[id]. Free lessons come with the page; Pro lessons are fetched after the
 * server checks entitlement (without it, a gentle "part of Pro" screen). Then it waits for progress
 * (client-only), shows a friendly gate for locked items, and runs the lesson or quiz.
 */
export function LessonPlayer({
  lesson: pageLesson,
  outline,
  course,
}: {
  /** The full lesson for free lessons; null for Pro ones (never in the page). */
  lesson: Lesson | null;
  outline: LessonOutline;
  course: CourseOutline;
}) {
  const { snapshot, store } = useProgress();
  const [playAnyway, setPlayAnyway] = useState(false);
  const paid = usePaidLesson(pageLesson ? null : outline.id);
  const lesson = pageLesson ?? (paid.state === "ready" ? paid.lesson : null);

  if (!lesson && (paid.state === "locked" || paid.state === "error")) {
    return (
      <PlayerShell nodes={uniformNodes(outline.cardCount, "upcoming")} progressLabel="Part of Pro" exitHref={`/course/${course.id}`}>
        <div className="flex min-h-[60dvh] flex-col items-center justify-center">
          {paid.state === "locked" ? (
            <LockedLesson outline={outline} course={course} reason={paid.reason} />
          ) : (
            <div className="text-center">
              <Mascot expression="thinking" size={150} idle />
              <h1 className="mt-6 text-title font-semibold">Couldn&apos;t load this lesson</h1>
              <p className="mt-2 text-ink-muted">Check your connection, then try again.</p>
              <Button className="mt-6" onClick={() => window.location.reload()}>
                Try again
              </Button>
            </div>
          )}
        </div>
      </PlayerShell>
    );
  }
  if (!snapshot || !lesson) return <PlayerSkeleton />;

  // Newcomers play any linked lesson. Otherwise, in Path mode, offer choices rather than refusing.
  const blocking = deepLinkGate(snapshot, course, lesson.id, playAnyway);
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
            On the path, <strong className="font-semibold text-ink">{blocking.title}</strong> comes first. You
            can still play this one, or switch to Explore and take lessons in any order.
          </p>
          <div className="mt-8 flex w-full max-w-sm flex-col gap-2">
            {/* Switching mode updates the snapshot, which unblocks and renders this lesson. */}
            <Button onClick={() => setPlayAnyway(true)}>Play it anyway</Button>
            <Button variant="secondary" onClick={() => void store.setPreferences({ mode: "explore" })}>
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

/** A Pro lesson without Pro: "What's next" for its module (or the plain message if there's none). */
function LockedLesson({ outline, course, reason }: { outline: LessonOutline; course: CourseOutline; reason: LockedReason }) {
  const mod = course.modules.find((m) => m.id === outline.moduleId);
  if (!mod) return <ProLockedMessage title={outline.title} reason={reason} />;
  return (
    <div className="mx-auto w-full max-w-lesson py-6">
      <WhatsNext course={course} module={mod} headingLevel={1} />
    </div>
  );
}
