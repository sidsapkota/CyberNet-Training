"use client";

import { motion } from "motion/react";
import { Mascot } from "@/components/mascot/Mascot";
import { ButtonLink } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import { ArrowRightIcon, ChallengeIcon, XpIcon } from "@/components/ui/icons";
import type { LessonOutline } from "@/lib/content/schema";

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
  pathHref,
}: {
  /** The course path, with `?completed=` so the new node fills in there. */
  pathHref: string;
  title: string;
  xpEarned: number;
  alreadyCompleted: boolean;
  challengesCompleted: number;
  challengesTotal: number;
  next: LessonOutline | null;
}) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <Mascot expression="celebrating" size={170} idle />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.3 }}
        className="mt-8 w-full"
      >
        <p className="font-mono text-caption font-semibold tracking-widest text-accent-ink uppercase">
          Lesson complete
        </p>
        <h1 className="mt-2 text-headline font-semibold text-balance">{title}</h1>

        <div className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-2.5">
          <div className="rounded-card border border-line bg-surface p-4">
            <p className="flex items-center justify-center gap-1.5 font-mono text-headline font-semibold text-accent-ink tabular-nums">
              <XpIcon className="size-6" />
              <CountUp value={xpEarned} delay={0.8} />
            </p>
            <p className="mt-1 text-small text-ink-muted">XP earned</p>
          </div>
          <div className="rounded-card border border-line bg-surface p-4">
            <p className="flex items-center justify-center gap-1.5 font-mono text-headline font-semibold text-warning tabular-nums">
              <ChallengeIcon className="size-6" />
              {challengesCompleted}/{challengesTotal}
            </p>
            <p className="mt-1 text-small text-ink-muted">Challenges</p>
          </div>
        </div>

        {alreadyCompleted && (
          <p className="mx-auto mt-4 max-w-sm text-small text-ink-muted">
            You&apos;d already finished this lesson, so XP only counts for cards you hadn&apos;t done
            before.
          </p>
        )}
        {!alreadyCompleted && challengesCompleted < challengesTotal && (
          <p className="mx-auto mt-4 max-w-sm text-small text-ink-muted">
            You can come back any time to try the challenges you skipped.
          </p>
        )}

        <div className="mx-auto mt-10 flex max-w-sm flex-col gap-2">
          {next ? (
            <>
              <ButtonLink href={`/lesson/${next.id}`}>
                {nextLessonLabel(next)} <ArrowRightIcon className="size-5" />
              </ButtonLink>
              <ButtonLink href={pathHref} variant="ghost">
                Back to path
              </ButtonLink>
            </>
          ) : (
            <ButtonLink href={pathHref}>Back to path</ButtonLink>
          )}
        </div>
      </motion.div>
    </div>
  );
}
