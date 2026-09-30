"use client";

import { useRef, useState } from "react";
import { getCardDefinition } from "@/cards/registry";
import { type Card, isInteractiveCard } from "@/cards/schema";
import type { CardStatus } from "@/cards/types";
import type { CourseOutline, RegularLesson } from "@/lib/content/schema";
import { useGlobalKeyDown } from "@/lib/keyboard";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { getNextLesson } from "@/lib/progress/state";
import { emptySnapshot, isCardCompleted } from "@/lib/progress/types";
import { cardXpToAward, lessonBonusToAward, XP } from "@/lib/progress/xp";
import { CardStage, useFeedbackAnimation } from "./CardStage";
import { FeedbackFooter, type FeedbackTone, type FooterAction } from "./FeedbackFooter";
import { LessonComplete } from "./LessonComplete";
import { PlayerShell } from "./PlayerShell";

interface CardRun {
  answer: unknown;
  status: CardStatus;
  /** Number of times Check was pressed on this card. */
  attempts: number;
  xpAwarded: number;
}

function freshRun(card: Card): CardRun {
  const definition = getCardDefinition(card);
  return {
    answer: definition.interactive ? definition.initialAnswer(card) : null,
    status: "answering",
    attempts: 0,
    xpAwarded: 0,
  };
}

const PRAISE = ["Correct!", "Nice work!", "Spot on!", "You got it!", "Exactly right!"];

interface LessonResult {
  xpEarned: number;
  alreadyCompleted: boolean;
  challengesCompleted: number;
}

export function LessonRun({
  lesson,
  course,
  initialIndex,
}: {
  lesson: RegularLesson;
  course: CourseOutline;
  initialIndex: number;
}) {
  const { store, snapshot: maybeSnapshot } = useProgress();
  const snapshot = maybeSnapshot ?? emptySnapshot();

  const [index, setIndex] = useState(initialIndex);
  const [run, setRun] = useState<CardRun>(() => freshRun(lesson.cards[initialIndex] as Card));
  const [sessionXp, setSessionXp] = useState(0);
  const [result, setResult] = useState<LessonResult | null>(null);
  /** Cards completed during this visit (the snapshot can lag one render behind). */
  const completedThisVisit = useRef(new Set<string>());
  const { scope, playCorrect, playIncorrect } = useFeedbackAnimation();

  const card = lesson.cards[index] as Card;
  const definition = getCardDefinition(card);
  const total = lesson.cards.length;

  const isDone = (c: Card) =>
    completedThisVisit.current.has(c.id) || isCardCompleted(snapshot, lesson.id, c.id);

  function markComplete(c: Card, xp: number) {
    completedThisVisit.current.add(c.id);
    void store.completeCard(lesson.id, c.id, xp);
  }

  function goTo(nextIndex: number) {
    setIndex(nextIndex);
    setRun(freshRun(lesson.cards[nextIndex] as Card));
    window.scrollTo({ top: 0 });
  }

  async function finish() {
    const missingCore = lesson.cards.findIndex((c) => c.difficulty === "core" && !isDone(c));
    if (missingCore !== -1) {
      // Shouldn't happen (core cards can't be skipped), but never mark a lesson done early.
      goTo(missingCore);
      return;
    }
    const bonus = lessonBonusToAward(snapshot, lesson.id);
    await store.completeLesson(lesson.id, bonus);
    setResult({
      xpEarned: sessionXp + bonus,
      alreadyCompleted: bonus === 0,
      challengesCompleted: lesson.cards.filter((c) => c.difficulty === "challenge" && isDone(c))
        .length,
    });
    window.scrollTo({ top: 0 });
  }

  function advance() {
    if (!definition.interactive) markComplete(card, 0);
    if (index + 1 < total) goTo(index + 1);
    else void finish();
  }

  function check() {
    if (!definition.interactive || run.status !== "answering") return;
    if (!definition.isAnswerReady(run.answer)) return;

    const attempts = run.attempts + 1;
    const { correct } = definition.grade(card, run.answer);
    if (correct) {
      const xp = cardXpToAward(isDone(card), card.difficulty, attempts);
      setRun({ ...run, status: "correct", attempts, xpAwarded: xp });
      setSessionXp((current) => current + xp);
      markComplete(card, xp);
      playCorrect();
    } else {
      setRun({ ...run, status: "incorrect", attempts });
      playIncorrect();
    }
  }

  function tryAgain() {
    setRun({ ...run, status: "answering" });
  }

  let primary: FooterAction;
  if (!definition.interactive) {
    primary = { label: "Continue", onClick: advance };
  } else if (run.status === "answering") {
    primary = { label: "Check", onClick: check, disabled: !definition.isAnswerReady(run.answer) };
  } else if (run.status === "incorrect") {
    primary = { label: "Try again", onClick: tryAgain };
  } else {
    primary = { label: "Continue", onClick: advance };
  }

  const secondary: FooterAction | undefined =
    card.difficulty === "challenge" && run.status !== "correct"
      ? { label: "Skip challenge", onClick: advance }
      : undefined;

  useGlobalKeyDown((event) => {
    if (event.key !== "Enter" || event.repeat) return;
    event.preventDefault();
    if (!primary.disabled) primary.onClick();
  }, result === null);

  if (result) {
    const next = getNextLesson(course, lesson.id);
    return (
      <PlayerShell progress={1} progressLabel="Lesson progress">
        <LessonComplete
          title={lesson.title}
          xpEarned={result.xpEarned}
          alreadyCompleted={result.alreadyCompleted}
          challengesCompleted={result.challengesCompleted}
          challengesTotal={lesson.cards.filter((c) => c.difficulty === "challenge").length}
          next={next}
        />
      </PlayerShell>
    );
  }

  const tone: FeedbackTone =
    run.status === "correct" ? "correct" : run.status === "incorrect" ? "incorrect" : "neutral";
  const progress = (index + (run.status === "correct" ? 1 : 0)) / total;
  const challengeXp = XP.card.challenge.firstTry;

  return (
    <PlayerShell
      progress={progress}
      progressLabel={`Lesson progress: card ${index + 1} of ${total}`}
      footer={
        <FeedbackFooter
          key={`${index}-${run.status}`}
          tone={tone}
          heading={
            run.status === "correct"
              ? PRAISE[index % PRAISE.length]
              : run.status === "incorrect"
                ? "Not quite"
                : undefined
          }
          subheading={run.status === "incorrect" ? "Have another go. You've got this." : undefined}
          xpAwarded={run.xpAwarded}
          explanation={isInteractiveCard(card) && run.status !== "answering" ? card.explanation : undefined}
          collapseExplanation={run.status === "incorrect"}
          primary={primary}
          secondary={secondary}
        />
      }
    >
      <CardStage cardKey={`${lesson.id}-${index}`} card={card} scope={scope} challengeXp={challengeXp}>
        {definition.interactive ? (
          <definition.Component
            card={card}
            answer={run.answer}
            onAnswerChange={(answer) => setRun((current) => ({ ...current, answer }))}
            status={run.status}
          />
        ) : (
          <definition.Component card={card} />
        )}
      </CardStage>
    </PlayerShell>
  );
}
