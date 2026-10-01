"use client";

import { motion } from "motion/react";
import { DailyGoalSummary } from "@/components/streak/DailyGoalSummary";
import { useEffect } from "react";
import { getCardDefinition } from "@/cards/registry";
import { isInteractiveCard } from "@/cards/schema";
import { Mascot } from "@/components/mascot/Mascot";
import { QuizNetwork } from "@/components/network/QuizNetwork";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import { ArrowRightIcon, CheckIcon, RetryIcon, XIcon, XpIcon } from "@/components/ui/icons";
import { Markdown } from "@/components/ui/Markdown";
import { WhatsNext } from "@/components/pro/WhatsNext";
import { usePro } from "@/lib/pro/ProProvider";
import type { CourseOutline, LessonOutline, Quiz } from "@/lib/content/schema";
import { celebrate } from "@/lib/celebrate";
import { useFeedback } from "@/lib/feedback";
import type { QuizAttempt } from "@/lib/progress/types";

export function QuizResults({
  course,
  quiz,
  attempt,
  next,
  onRetake,
  pathHref,
  goalMetNow = false,
  freezeEarned = false,
}: {
  /** Passing met today's daily goal. */
  goalMetNow?: boolean;
  /** Meeting it earned a streak freeze. */
  freezeEarned?: boolean;
  /** The course path, with `?completed=` so the hub fills in there. */
  pathHref: string;
  course: CourseOutline;
  quiz: Quiz;
  attempt: QuizAttempt;
  next: LessonOutline | null;
  onRetake: () => void;
}) {
  const correct = attempt.answers.filter((a) => a.correct).length;
  const total = quiz.cards.length;
  const percent = Math.round(attempt.score * 100);
  const threshold = Math.round(quiz.passThreshold * 100);
  const results = quiz.cards.map((card) => attempt.answers.find((a) => a.cardId === card.id)?.correct ?? false);
  // After the last free module: what the next (Pro) module holds, for learners without Pro.
  const { hasPro, pro } = usePro();
  const moduleIndex = course.modules.findIndex((m) => m.id === quiz.moduleId);
  const nextModule = course.modules[moduleIndex + 1];
  const showWhatsNext = attempt.passed && !pro.loading && !hasPro && nextModule?.access === "pro";
  const isCourseFinal = moduleIndex === course.modules.length - 1;

  // Passing the quiz completes the module: a short confetti burst as the hub lights up.
  // (celebrate() does nothing under prefers-reduced-motion.)
  const { play } = useFeedback();
  useEffect(() => {
    if (!attempt.passed) return;
    play("lessonComplete");
    const timer = window.setTimeout(() => void celebrate(), 600);
    return () => window.clearTimeout(timer);
  }, [attempt, play]);

  return (
    <div>
      <div className="text-center">
        <div className="flex items-end justify-center gap-1">
          <QuizNetwork results={results} passed={attempt.passed} />
          <Mascot expression={attempt.passed ? "celebrating" : "thinking"} size={112} idle className="-ml-4" />
        </div>
        <p
          className={`mt-6 inline-flex items-center gap-1.5 font-mono text-caption font-semibold tracking-widest uppercase ${
            attempt.passed ? "text-success" : "text-ink-muted"
          }`}
        >
          {attempt.passed ? <CheckIcon className="size-4" /> : <XIcon className="size-4" />}
          {attempt.passed ? "Passed · module complete" : "Not passed yet"}
        </p>
        <h1 className="mt-2 text-headline font-semibold">
          You scored <span className="font-mono">{correct}</span> out of <span className="font-mono">{total}</span>
        </h1>
        <p className="mt-2 text-ink-muted">
          That&apos;s <span className="font-mono text-ink">{percent}%</span>. You needed{" "}
          <span className="font-mono text-ink">{threshold}%</span>.{" "}
          {attempt.passed
            ? "Great work!"
            : "Check the explanations below, then have another go. You've got this."}
        </p>
        {attempt.xp > 0 && (
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-3 py-1.5 font-mono text-lead font-semibold text-accent-ink">
            <XpIcon className="size-5" />
            <span>
              +<CountUp value={attempt.xp} delay={0.7} /> XP
            </span>
          </div>
        )}

        {attempt.passed && <DailyGoalSummary goalMetNow={goalMetNow} freezeEarned={freezeEarned} />}
        <div className="mx-auto mt-8 flex max-w-sm flex-col gap-2">
          {attempt.passed ? (
            <>
              {isCourseFinal && (
                <ButtonLink href={`/course/${course.id}/certificate`}>
                  Get your certificate <ArrowRightIcon className="size-5" />
                </ButtonLink>
              )}
              {showWhatsNext ? null : next ? (
                <ButtonLink href={`/lesson/${next.id}`}>
                  Start the next module <ArrowRightIcon className="size-5" />
                </ButtonLink>
              ) : (
                <ButtonLink href={pathHref}>Back to path</ButtonLink>
              )}
              {next && (
                <ButtonLink href={pathHref} variant="ghost">
                  Back to path
                </ButtonLink>
              )}
              <Button variant="ghost" onClick={onRetake}>
                <RetryIcon className="size-4" /> Retake quiz
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onRetake}>
                <RetryIcon className="size-5" /> Retake quiz
              </Button>
              <ButtonLink href={pathHref} variant="ghost">
                Back to path
              </ButtonLink>
            </>
          )}
        </div>
      </div>

      {showWhatsNext && nextModule && (
        <section className="mx-auto mt-10 max-w-lesson rounded-card border border-line bg-surface p-5 shadow-card">
          <WhatsNext course={course} module={nextModule} />
        </section>
      )}

      <section aria-labelledby="review-heading" className="mt-14">
        <h2 id="review-heading" className="text-title font-semibold">
          Review your answers
        </h2>
        <ol className="mt-4 space-y-3">
          {quiz.cards.map((card, i) => {
            if (!isInteractiveCard(card)) return null;
            const definition = getCardDefinition(card);
            if (!definition.interactive) return null;
            const given = attempt.answers.find((a) => a.cardId === card.id);
            const right = given?.correct ?? false;
            // Mono is for technical values (bits, addresses), not sentences.
            const valueFont = ["binary_toggle", "numeric_input", "terminal"].includes(card.type) ? "font-mono" : "";
            return (
              <motion.li
                key={card.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.2 }}
                className={`rounded-card border border-l-4 bg-surface p-4 shadow-card sm:p-5 ${
                  right ? "border-line border-l-success" : "border-line border-l-danger"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-caption font-semibold tracking-wider text-ink-faint uppercase">
                    Question {i + 1}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-caption font-semibold ${
                      right ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                    }`}
                  >
                    {right ? <CheckIcon className="size-3.5" /> : <XIcon className="size-3.5" />}
                    {right ? "Correct" : "Incorrect"}
                  </span>
                </div>
                <Markdown className="mt-2 font-semibold [&_p]:mb-1">{card.prompt}</Markdown>
                <dl className="mt-3 grid gap-2 text-small">
                  <div>
                    <dt className="text-ink-muted">Your answer</dt>
                    <dd className={`font-medium break-words text-ink ${valueFont}`}>
                      {given ? definition.describeAnswer(card, given.answer) : "No answer"}
                    </dd>
                  </div>
                  {!right && (
                    <div>
                      <dt className="text-ink-muted">Correct answer</dt>
                      <dd className={`font-medium break-words text-success ${valueFont}`}>
                        {definition.describeCorrectAnswer(card)}
                      </dd>
                    </div>
                  )}
                </dl>
                <Markdown className="mt-3 border-t border-line pt-3 text-small text-ink-muted">
                  {card.explanation}
                </Markdown>
              </motion.li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
