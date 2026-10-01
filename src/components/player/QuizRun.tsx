"use client";

import { useState } from "react";
import { getCardDefinition } from "@/cards/registry";
import type { Card } from "@/cards/schema";
import type { CardStatus } from "@/cards/types";
import { NetworkMark } from "@/components/network/NetworkMark";
import type { ProgressNode } from "@/components/network/NodeProgress";
import { Button } from "@/components/ui/Button";
import type { CourseOutline, Quiz } from "@/lib/content/schema";
import { trackEvent } from "@/lib/analytics";
import { useGlobalKeyDown } from "@/lib/keyboard";
import { CoachPanel } from "./coach/CoachPanel";
import { useCoach } from "./coach/useCoach";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { useFeedback } from "@/lib/feedback";
import { getNextLesson } from "@/lib/progress/state";
import { emptySnapshot, type QuizAttempt } from "@/lib/progress/types";
import { quizXpToAward, scoreQuiz } from "@/lib/progress/xp";
import { milestoneReached } from "@/lib/progress/streak";
import { useDaily } from "@/lib/progress/useDaily";
import { MilestoneScreen } from "@/components/streak/MilestoneScreen";
import { speechText } from "@/cards/speech";
import { useCardNavigationKeys } from "@/lib/keyboard";
import { CardStage, useFeedbackAnimation } from "./CardStage";
import { FeedbackFooter, type FooterAction } from "./FeedbackFooter";
import { PlayerShell, uniformNodes } from "./PlayerShell";
import { QuizResults } from "./QuizResults";

type Phase = "intro" | "playing" | "results";

interface QuestionRun {
  answer: unknown;
  status: CardStatus;
}

function freshRun(card: Card): QuestionRun {
  const definition = getCardDefinition(card);
  return { answer: definition.interactive ? definition.initialAnswer(card) : null, status: "answering" };
}

/**
 * Quiz mode: same cards as lessons, but one attempt per question, right/wrong
 * shown immediately, explanations held back until the review screen.
 */
export function QuizRun({ quiz, course }: { quiz: Quiz; course: CourseOutline }) {
  const { store, snapshot: maybeSnapshot } = useProgress();
  const snapshot = maybeSnapshot ?? emptySnapshot();

  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [run, setRun] = useState<QuestionRun>(() => freshRun(quiz.cards[0] as Card));
  const [answers, setAnswers] = useState<QuizAttempt["answers"]>([]);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [pulse, setPulse] = useState<{ key: number; from: number; to: number } | null>(null);
  const { scope, playIncorrect } = useFeedbackAnimation();
  const feedback = useFeedback();
  // Daily goal and streak as they stood when the quiz opened (a first pass can meet the goal).
  const daily = useDaily();
  const [startDaily] = useState(() => ({
    met: daily?.today.met ?? false,
    streak: daily?.streak.current ?? 0,
    freezes: daily?.streak.freezes ?? 0,
  }));
  const [milestoneSeen, setMilestoneSeen] = useState(false);
  /** An earlier question being looked at (read-only: no explanation, no second try), or null. */
  const [viewing, setViewing] = useState<number | null>(null);

  const card = quiz.cards[index] as Card;
  const definition = getCardDefinition(card);
  const total = quiz.cards.length;
  const coach = useCoach(card);
  const showCoach = phase === "playing" && run.status === "answering" ? coach.coachKey : null;
  const isLast = index + 1 >= total;

  function start() {
    setViewing(null);
    setPhase("playing");
    setIndex(0);
    setRun(freshRun(quiz.cards[0] as Card));
    setAnswers([]);
    setAttempt(null);
    setPulse(null);
    window.scrollTo({ top: 0 });
  }

  function check() {
    if (!definition.interactive || run.status !== "answering") return;
    if (!definition.isAnswerReady(run.answer, card)) return;
    if (showCoach) coach.dismiss();
    const { correct } = definition.grade(card, run.answer);
    setRun({ ...run, status: correct ? "correct" : "incorrect" });
    setAnswers((current) => [...current, { cardId: card.id, answer: run.answer, correct }]);
    if (correct) setPulse((current) => ({ key: (current?.key ?? 0) + 1, from: index - 1, to: index }));
    else playIncorrect();
    feedback.play(correct ? "correct" : "wrong");
    feedback.haptic(correct ? "success" : "error");
  }

  async function finish() {
    const score = scoreQuiz(
      answers.map((a) => a.correct),
      quiz.passThreshold,
    );
    const result: QuizAttempt = {
      at: new Date().toISOString(),
      score: score.score,
      passed: score.passed,
      xp: quizXpToAward(snapshot, quiz.id, score.passed),
      answers,
    };
    await store.recordQuizAttempt(quiz.id, result);
    if (result.passed) trackEvent("quiz_pass", quiz.id);
    setAttempt(result);
    setPhase("results");
    window.scrollTo({ top: 0 });
  }

  function next() {
    if (!isLast) {
      setViewing(null);
      setIndex(index + 1);
      setRun(freshRun(quiz.cards[index + 1] as Card));
      window.scrollTo({ top: 0 });
    } else {
      void finish();
    }
  }

  const primary: FooterAction | null =
    phase === "intro"
      ? { label: "Start quiz", onClick: start }
      : phase === "playing"
        ? run.status === "answering"
          ? {
              label: "Check",
              onClick: check,
              disabled: !definition.interactive || !definition.isAnswerReady(run.answer, card),
            }
          : { label: isLast ? "See results" : "Next question", onClick: next }
        : null;

  // Back and forward: answered questions only, read-only (right or wrong, no explanation yet).
  const shownIndex = viewing ?? index;
  const canGoBack = phase === "playing" && shownIndex > 0;
  function show(target: number | null) {
    setViewing(target);
    window.scrollTo({ top: 0 });
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-card-stage]")?.focus());
  }
  const goBack = () => shownIndex > 0 && show(shownIndex - 1);
  const goForward = () => viewing !== null && show(viewing + 1 >= index ? null : viewing + 1);
  const reviewPrimary: FooterAction =
    viewing !== null && viewing + 1 < index ? { label: "Next", onClick: goForward } : { label: `Back to question ${index + 1}`, onClick: () => show(null) };
  useCardNavigationKeys(canGoBack ? goBack : null, viewing !== null ? goForward : null, phase === "playing");

  useGlobalKeyDown((event) => {
    if (event.key !== "Enter" || event.repeat || !primary) return;
    event.preventDefault();
    if (viewing !== null) {
      reviewPrimary.onClick();
      return;
    }
    // With the how-to-play panel open, Enter means "Got it", unless it came from an answer box
    // (the learner has clearly started; Check dismisses the panel too).
    const fromAnswerBox = event.target instanceof Element && event.target.closest("[data-enter-submits]");
    if (showCoach && !fromAnswerBox) coach.dismiss();
    else if (!primary.disabled) primary.onClick();
  }, primary !== null);

  if (phase === "results" && attempt) {
    const milestone = daily ? milestoneReached(startDaily.streak, daily.streak.current) : null;
    if (milestone && !milestoneSeen) {
      return (
        <PlayerShell nodes={uniformNodes(total, "done")} progressLabel="Quiz progress: complete" exitHref={`/course/${course.id}`}>
          <MilestoneScreen days={milestone} onContinue={() => setMilestoneSeen(true)} />
        </PlayerShell>
      );
    }
    return (
      <PlayerShell nodes={uniformNodes(total, "done")} progressLabel="Quiz progress: complete" exitHref={`/course/${course.id}`}>
        <QuizResults
          course={course}
          goalMetNow={Boolean(daily?.today.met && !startDaily.met)}
          freezeEarned={(daily?.streak.freezes ?? 0) > startDaily.freezes}
          quiz={quiz}
          attempt={attempt}
          next={getNextLesson(course, quiz.id)}
          onRetake={start}
          pathHref={`/course/${course.id}?completed=${quiz.id}`}
        />
      </PlayerShell>
    );
  }

  if (phase === "intro") {
    const needed = Math.ceil(quiz.passThreshold * total - 1e-9);
    const previous = snapshot.quizzes[quiz.id];
    return (
      <PlayerShell nodes={uniformNodes(total, "upcoming")} progressLabel="Quiz progress: not started" exitHref={`/course/${course.id}`}>
        <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
          <NetworkMark mode="lit" className="size-24" />
          <p className="mt-6 font-mono text-caption font-semibold tracking-widest text-ink-faint uppercase">
            Module quiz
          </p>
          <h1 className="mt-2 text-headline font-semibold text-balance">{quiz.title}</h1>
          <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left text-ink-muted">
            <li className="flex gap-2">
              <span className="font-mono text-ink-faint">→</span>
              <span>
                <span className="font-mono text-ink">{total}</span> questions, one try each
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-ink-faint">→</span>
              <span>
                Get <span className="font-mono text-ink">{needed}</span> of{" "}
                <span className="font-mono text-ink">{total}</span> right (
                <span className="font-mono text-ink">{Math.round(quiz.passThreshold * 100)}%</span>) to pass and
                finish the module
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-ink-faint">→</span>
              <span>You&apos;ll see if you&apos;re right straight away; explanations come at the end</span>
            </li>
          </ul>
          {previous && (
            <p className="mt-4 text-small text-ink-muted">
              Your best so far: <span className="font-mono">{Math.round(previous.bestScore * 100)}%</span>
              {previous.passedAt ? " (passed)" : ""}
            </p>
          )}
          <Button onClick={start} className="mt-10 w-full max-w-sm">
            Start quiz
          </Button>
        </div>
      </PlayerShell>
    );
  }

  if (viewing !== null) {
    const reviewCard = quiz.cards[viewing] as Card;
    const reviewDefinition = getCardDefinition(reviewCard);
    const past = answers.find((a) => a.cardId === reviewCard.id);
    const reviewNodes: ProgressNode[] = quiz.cards.map((_, i) => ({ state: i < index || (i === index && run.status !== "answering") ? "done" : i === index ? "current" : "upcoming" }));
    return (
      <PlayerShell
        exitHref={`/course/${course.id}`}
        nodes={reviewNodes}
        progressLabel={`Quiz progress: looking back at question ${viewing + 1} of ${total}`}
        onBack={canGoBack ? goBack : undefined}
        footer={
          <FeedbackFooter
            key={`review-${viewing}`}
            tone={past?.correct ? "correct" : "incorrect"}
            heading={past?.correct ? "Correct" : "Incorrect"}
            subheading="You'll see the full explanation at the end."
            primary={reviewPrimary}
          />
        }
      >
        <p className="mb-4 font-mono text-caption font-semibold tracking-wider text-ink-faint uppercase">
          Question {viewing + 1} / {total} · looking back
        </p>
        <CardStage cardKey={`${quiz.id}-review-${viewing}`} card={reviewCard} scope={scope} listen={speechText(reviewCard, "answering")}>
          {reviewDefinition.interactive && past && (
            <reviewDefinition.Component
              card={reviewCard}
              answer={past.answer}
              onAnswerChange={() => {}}
              status={past.correct ? "correct" : "incorrect"}
            />
          )}
        </CardStage>
      </PlayerShell>
    );
  }

  const progressNodes: ProgressNode[] = quiz.cards.map((_, i) =>
    i < index || (i === index && run.status !== "answering")
      ? { state: "done" }
      : i === index
        ? { state: "current" }
        : { state: "upcoming" },
  );

  return (
    <PlayerShell
      exitHref={`/course/${course.id}`}
      nodes={progressNodes}
      pulse={pulse}
      progressLabel={`Quiz progress: question ${index + 1} of ${total}`}
      onBack={canGoBack ? goBack : undefined}
      footer={
        primary && (
          <FeedbackFooter
            key={`${index}-${run.status}`}
            tone={run.status === "correct" ? "correct" : run.status === "incorrect" ? "incorrect" : "neutral"}
            heading={run.status === "correct" ? "Correct" : run.status === "incorrect" ? "Incorrect" : undefined}
            subheading={run.status === "answering" ? undefined : "You'll see the full explanation at the end."}
            primary={primary}
          />
        )
      }
    >
      <p className="mb-4 font-mono text-caption font-semibold tracking-wider text-ink-faint uppercase">
        Question {index + 1} / {total}
      </p>
      {showCoach && <CoachPanel key={showCoach} coachKey={showCoach} onDone={coach.dismiss} />}
      <CardStage cardKey={`${quiz.id}-${index}`} card={card} scope={scope} listen={speechText(card, "answering")}>
        {definition.interactive && (
          <definition.Component
            card={card}
            answer={run.answer}
            onAnswerChange={(answer) => setRun((current) => ({ ...current, answer }))}
            status={run.status}
          />
        )}
      </CardStage>
    </PlayerShell>
  );
}
