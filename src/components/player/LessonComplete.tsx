"use client";

import { SpinPrompt } from "@/components/rewards/SpinPrompt";
import Link from "next/link";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { SaveProgressPrompt } from "@/components/account/SaveProgressPrompt";
import { SignUpGate } from "@/components/account/SignUpGate";
import { LeagueRankMoment } from "@/components/leagues/LeagueRankMoment";
import { DailyGoalSummary } from "@/components/streak/DailyGoalSummary";
import { Mascot } from "@/components/mascot/Mascot";
import { ButtonLink, buttonClasses } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import { ArrowRightIcon, BackIcon, ChallengeIcon, FeedbackIcon, LessonIcon, XpIcon } from "@/components/ui/icons";
import { NetworkMark } from "@/components/network/NetworkMark";
import type { LessonIconName } from "@/lib/content/lessonIcons";
import type { LessonOutline } from "@/lib/content/schema";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFeedback } from "@/lib/feedback";

export function nextLessonLabel(next: LessonOutline) {
  return next.kind === "quiz" ? "Take the module quiz" : "Next lesson";
}

export function LessonComplete({
  title,
  icon,
  xpEarned,
  alreadyCompleted,
  challengesCompleted,
  challengesTotal,
  next,
  previous = null,
  courseHref,
  pathHref,
  lessonId,
  goalMetNow = false,
  freezeEarned = false,
}: {
  /** This lesson met today's daily goal. */
  goalMetNow?: boolean;
  /** Meeting it earned a streak freeze. */
  freezeEarned?: boolean;
  /** For the "Send feedback" link, which fills in this lesson. */
  lessonId: string;
  /** The course path, with `?completed=` so the new node fills in there. */
  pathHref: string;
  title: string;
  /** The lesson's icon, beside its title (as on its course path node). */
  icon?: LessonIconName;
  xpEarned: number;
  alreadyCompleted: boolean;
  challengesCompleted: number;
  challengesTotal: number;
  next: LessonOutline | null;
  /** The lesson before this one in its module, for "Previous lesson". */
  previous?: LessonOutline | null;
  /** The course path (no `?completed=`), for "Back to course" on the Up next step. */
  courseHref?: string;
}) {
  // Two steps on a phone-sized screen: the celebration, then "Up next".
  const [step, setStep] = useState<"done" | "next">("done");
  const feedback = useFeedback();
  const { auth, available } = useAuth();
  // A guest whose next lesson needs a free account (after each course's first lesson).
  const gateNext = available && auth.status === "guest" && next !== null && next.access === "free" && !next.guests;
  // The lesson-complete chime, once, as the screen appears.
  const { play } = feedback;
  useEffect(() => {
    play("lessonComplete");
  }, [play]);

  if (step === "next" && next) {
    return <UpNext next={next} previous={previous} courseHref={courseHref ?? pathHref} lessonId={lessonId} />;
  }

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <Mascot expression="celebrating" size={170} idle reaction="scan" />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.3 }}
        className="mt-8 w-full"
      >
        <p className="font-mono text-caption font-semibold tracking-widest text-accent-ink uppercase">
          Lesson complete
        </p>
        <h1 className="mt-2 text-headline font-semibold text-balance">
          {icon && <LessonIcon name={icon} className="mr-2 inline-block size-8 align-[-0.15em] text-ink-muted" />}
          {title}
        </h1>

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

        <DailyGoalSummary goalMetNow={goalMetNow} freezeEarned={freezeEarned} />
        <LeagueRankMoment />
        <SpinPrompt />

        {gateNext && next ? (
          <SignUpGate lessonId={lessonId} next={`/lesson/${next.id}`} xp={xpEarned} variant="inline" notNowHref={pathHref} />
        ) : (
          <>
            <SaveProgressPrompt />
            <div className="mx-auto mt-8 flex max-w-sm flex-col gap-2">
              {next ? (
                <>
                  <button type="button" onClick={() => setStep("next")} className={buttonClasses("primary")}>
                    Continue <ArrowRightIcon className="size-5" />
                  </button>
                  <ButtonLink href={pathHref} variant="ghost">
                    Back to course
                  </ButtonLink>
                </>
              ) : (
                <ButtonLink href={pathHref}>Back to course</ButtonLink>
              )}
            </div>
          </>
        )}
        <Link
          href={`/feedback?lesson=${lessonId}`}
          className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-small text-ink-muted underline-offset-2 hover:text-ink hover:underline"
        >
          <FeedbackIcon className="size-4" /> Send feedback about this lesson
        </Link>
      </motion.div>
    </div>
  );
}

/**
 * "Up next": the next lesson's icon, title and one line of what you'll learn, before it starts.
 * Start, Back to course, and (quietly) the previous lesson. The lesson's own page applies the guest
 * gate, the daily limit and Pro as usual.
 */
function UpNext({
  next,
  previous,
  courseHref,
  lessonId,
}: {
  next: LessonOutline;
  previous: LessonOutline | null;
  courseHref: string;
  lessonId: string;
}) {
  const quiz = next.kind === "quiz";
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <p className="font-mono text-caption font-semibold tracking-widest text-ink-faint uppercase">Up next</p>
      <span className="mt-4 grid size-20 place-items-center rounded-node border-2 border-accent-ink bg-accent-soft text-accent-ink shadow-node-lit">
        {quiz ? <NetworkMark mode="lit" className="size-10" /> : next.icon ? <LessonIcon name={next.icon} className="size-9" /> : null}
      </span>
      <h1 className="mt-5 text-headline font-semibold text-balance">{next.title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-body text-ink-muted">
        {quiz ? "Show what you've learned in this module. Pass to unlock the next one." : next.about}
      </p>
      <div className="mx-auto mt-8 flex w-full max-w-sm flex-col gap-2">
        <ButtonLink href={`/lesson/${next.id}`}>
          {quiz ? "Start the quiz" : "Start"} <ArrowRightIcon className="size-5" />
        </ButtonLink>
        <ButtonLink href={courseHref} variant="ghost">
          Back to course
        </ButtonLink>
        {previous && (
          <Link
            href={`/lesson/${previous.id}`}
            className="mt-2 inline-flex min-h-11 items-center justify-center gap-1.5 text-small text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          >
            <BackIcon className="size-4" /> Previous lesson: {previous.title}
          </Link>
        )}
        <Link
          href={`/feedback?lesson=${lessonId}`}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 text-small text-ink-muted underline-offset-2 hover:text-ink hover:underline"
        >
          <FeedbackIcon className="size-4" /> Send feedback about the last lesson
        </Link>
      </div>
    </div>
  );
}
