"use client";

import { motion } from "motion/react";
import { ButtonLink } from "@/components/ui/Button";
import { BoltIcon, SparkIcon } from "@/components/ui/icons";
import type { LessonOutline } from "@/lib/content/schema";
import { CelebrationBadge, CountUp } from "./CelebrationBadge";

export function nextLessonLabel(next: LessonOutline) {
  return next.kind === "quiz" ? "Take the module quiz" : "Next lesson";
}

export function LessonComplete({
  title,
  xpEarned,
  alreadyCompleted,
  challengesCompleted,
  challengesTotal,
  next,
}: {
  title: string;
  xpEarned: number;
  alreadyCompleted: boolean;
  challengesCompleted: number;
  challengesTotal: number;
  next: LessonOutline | null;
}) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <CelebrationBadge />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.35 }}
        className="mt-8 w-full"
      >
        <p className="text-sm font-semibold uppercase tracking-wider text-success">Lesson complete</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-balance">{title}</h1>

        <div className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-3">
          <div className="rounded-card border border-line bg-surface p-4">
            <div className="flex items-center justify-center gap-1 text-3xl font-bold text-xp tabular-nums">
              <BoltIcon className="size-6" />
              <CountUp value={xpEarned} />
            </div>
            <div className="mt-1 text-sm text-ink-muted">XP earned</div>
          </div>
          <div className="rounded-card border border-line bg-surface p-4">
            <div className="flex items-center justify-center gap-1 text-3xl font-bold text-challenge tabular-nums">
              <SparkIcon className="size-6" />
              {challengesCompleted}/{challengesTotal}
            </div>
            <div className="mt-1 text-sm text-ink-muted">Challenges</div>
          </div>
        </div>

        {alreadyCompleted && (
          <p className="mx-auto mt-4 max-w-sm text-sm text-ink-muted">
            You&apos;d already finished this lesson, so XP only counts for cards you hadn&apos;t done
            before.
          </p>
        )}
        {!alreadyCompleted && challengesCompleted < challengesTotal && (
          <p className="mx-auto mt-4 max-w-sm text-sm text-ink-muted">
            You can come back any time to try the challenges you skipped.
          </p>
        )}

        <div className="mx-auto mt-10 flex max-w-sm flex-col gap-3">
          {next ? (
            <>
              <ButtonLink href={`/lesson/${next.id}`}>{nextLessonLabel(next)}</ButtonLink>
              <ButtonLink href="/" variant="ghost">
                Back to courses
              </ButtonLink>
            </>
          ) : (
            <ButtonLink href="/">Back to courses</ButtonLink>
          )}
        </div>
      </motion.div>
    </div>
  );
}
