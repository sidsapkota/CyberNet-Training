"use client";

import { motion } from "motion/react";
import { getCardDefinition } from "@/cards/registry";
import { isInteractiveCard } from "@/cards/schema";
import { Button, ButtonLink } from "@/components/ui/Button";
import { BoltIcon, CheckIcon, XIcon } from "@/components/ui/icons";
import { Markdown } from "@/components/ui/Markdown";
import type { LessonOutline, Quiz } from "@/lib/content/schema";
import type { QuizAttempt } from "@/lib/progress/types";
import { CelebrationBadge, CountUp } from "./CelebrationBadge";

export function QuizResults({
  quiz,
  attempt,
  next,
  onRetake,
}: {
  quiz: Quiz;
  attempt: QuizAttempt;
  next: LessonOutline | null;
  onRetake: () => void;
}) {
  const correct = attempt.answers.filter((a) => a.correct).length;
  const total = quiz.cards.length;
  const percent = Math.round(attempt.score * 100);
  const threshold = Math.round(quiz.passThreshold * 100);

  return (
    <div>
      <div className="text-center">
        {attempt.passed ? (
          <CelebrationBadge />
        ) : (
          <div className="mx-auto grid size-28 place-items-center rounded-pill bg-surface-muted text-4xl font-bold text-ink-muted tabular-nums">
            {percent}%
          </div>
        )}
        <p
          className={`mt-8 text-sm font-semibold uppercase tracking-wider ${attempt.passed ? "text-success" : "text-ink-muted"}`}
        >
          {attempt.passed ? "Quiz passed · module complete" : "Not passed yet"}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          You scored {correct} out of {total}
        </h1>
        <p className="mt-2 text-ink-muted">
          {attempt.passed
            ? `That's ${percent}%. You needed ${threshold}%. Great work!`
            : `That's ${percent}%. You need ${threshold}% to pass. Read through the explanations below, then give it another go.`}
        </p>
        {attempt.xp > 0 && (
          <div className="mt-4 inline-flex items-center gap-1 rounded-pill bg-xp-soft px-4 py-1.5 text-lg font-bold text-xp">
            <BoltIcon className="size-5" />+<CountUp value={attempt.xp} /> XP
          </div>
        )}

        <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3">
          {attempt.passed ? (
            <>
              {next ? (
                <ButtonLink href={`/lesson/${next.id}`}>Start the next module</ButtonLink>
              ) : (
                <ButtonLink href="/">Back to courses</ButtonLink>
              )}
              <Button variant="ghost" onClick={onRetake}>
                Retake quiz
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onRetake}>Retake quiz</Button>
              <ButtonLink href="/" variant="ghost">
                Back to courses
              </ButtonLink>
            </>
          )}
        </div>
      </div>

      <section aria-labelledby="review-heading" className="mt-14">
        <h2 id="review-heading" className="text-xl font-bold">
          Review your answers
        </h2>
        <ol className="mt-4 space-y-4">
          {quiz.cards.map((card, i) => {
            if (!isInteractiveCard(card)) return null;
            const definition = getCardDefinition(card);
            if (!definition.interactive) return null;
            const given = attempt.answers.find((a) => a.cardId === card.id);
            const right = given?.correct ?? false;
            return (
              <motion.li
                key={card.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className="rounded-card border border-line bg-surface p-5 shadow-card"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-pill text-on-primary ${right ? "bg-success" : "bg-danger"}`}
                    aria-label={right ? "Correct" : "Incorrect"}
                  >
                    {right ? <CheckIcon className="size-4" strokeWidth={3} /> : <XIcon className="size-4" strokeWidth={3} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                      Question {i + 1}
                    </p>
                    <Markdown className="mt-1 font-semibold [&_p]:mb-1">{card.prompt}</Markdown>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div>
                        <dt className="font-medium text-ink-muted">Your answer</dt>
                        <dd className={`font-medium break-words ${right ? "text-success" : "text-danger"}`}>
                          {given ? definition.describeAnswer(card, given.answer) : "No answer"}
                        </dd>
                      </div>
                      {!right && (
                        <div>
                          <dt className="font-medium text-ink-muted">Correct answer</dt>
                          <dd className="font-medium break-words text-success">
                            {definition.describeCorrectAnswer(card)}
                          </dd>
                        </div>
                      )}
                    </dl>
                    <Markdown className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-ink-muted">
                      {card.explanation}
                    </Markdown>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
