"use client";

import { useEffect, useRef, useState } from "react";
import { getCardDefinition, isGuidedDefinition } from "@/cards/registry";
import { nudgeFor } from "@/cards/nudge";
import { type Card, isInteractiveCard } from "@/cards/schema";
import type { CardStatus } from "@/cards/types";
import type { CourseOutline, RegularLesson } from "@/lib/content/schema";
import { useFeedback } from "@/lib/feedback";
import { useGlobalKeyDown } from "@/lib/keyboard";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { trackEvent } from "@/lib/analytics";
import { hintXpNote, visibleHint } from "@/lib/hints";
import { getNextLesson, lessonFinishState } from "@/lib/progress/state";
import { emptySnapshot, isCardCompleted } from "@/lib/progress/types";
import { practicedOn } from "@/lib/progress/daily";
import { milestoneReached } from "@/lib/progress/streak";
import { useDaily } from "@/lib/progress/useDaily";
import { cardXpToAward, exploreXpToAward, lessonBonusToAward, practiceXp, XP } from "@/lib/progress/xp";
import { MilestoneScreen } from "@/components/streak/MilestoneScreen";
import { type ProgressNode } from "@/components/network/NodeProgress";
import { CardStage, useFeedbackAnimation } from "./CardStage";
import { FeedbackFooter, type FeedbackTone, type FooterAction } from "./FeedbackFooter";
import { HintReveal } from "./HintReveal";
import { CoachPanel } from "./coach/CoachPanel";
import { useCoach } from "./coach/useCoach";
import { LessonComplete } from "./LessonComplete";
import { PlayerShell } from "./PlayerShell";

interface CardRun {
  answer: unknown;
  status: CardStatus;
  /** Number of times Check was pressed on this card. */
  attempts: number;
  xpAwarded: number;
  /** Practice XP toward today's goal, when a finished card is replayed. */
  practiceAwarded: number;
  /** The learner opened the hint (the card then pays retry XP). */
  hintUsed: boolean;
}

function freshRun(card: Card): CardRun {
  const definition = getCardDefinition(card);
  return {
    // Guided cards (hotspot explore) keep their progress in `answer` too; it's never graded.
    answer: definition.interactive ? definition.initialAnswer(card) : isGuidedDefinition(definition) ? definition.initialState(card) : null,
    status: "answering",
    attempts: 0,
    xpAwarded: 0,
    practiceAwarded: 0,
    hintUsed: false,
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
  const [completedThisVisit, setCompletedThisVisit] = useState<ReadonlySet<string>>(() => new Set());
  /** Drives the pulse along the progress trace after a correct answer. */
  const [pulse, setPulse] = useState<{ key: number; from: number; to: number } | null>(null);
  const { scope, playIncorrect } = useFeedbackAnimation();
  const feedback = useFeedback();

  // Daily goal and streak: compared with how they stood when the lesson opened, to catch the
  // moment the goal is met (a chime and a note) and a streak milestone (a screen at the end).
  const daily = useDaily();
  const [start] = useState(() => ({
    met: daily?.today.met ?? false,
    streak: daily?.streak.current ?? 0,
    freezes: daily?.streak.freezes ?? 0,
  }));
  const goalMetNow = Boolean(daily?.today.met && !start.met);
  /** The card whose answer met the goal (its footer shows the note). */
  const [goalNoteAt, setGoalNoteAt] = useState<number | null>(null);
  if (goalMetNow && goalNoteAt === null) setGoalNoteAt(index);
  const goalReached = goalNoteAt !== null;
  const { play: playSound, haptic } = feedback;
  useEffect(() => {
    if (!goalReached) return;
    playSound("goal");
    haptic("success");
  }, [goalReached, playSound, haptic]);
  const [milestoneSeen, setMilestoneSeen] = useState(false);

  const card = lesson.cards[index] as Card;
  const definition = getCardDefinition(card);
  const total = lesson.cards.length;
  const coach = useCoach(card);
  useEffect(() => trackEvent("lesson_start", lesson.id), [lesson.id]);
  const showCoach = result === null && run.status === "answering" ? coach.coachKey : null;

  const isDone = (c: Pick<Card, "id">) => completedThisVisit.has(c.id) || isCardCompleted(snapshot, lesson.id, c.id);

  /** Saves are tracked so finishing can wait for them (matters for async stores like Supabase). */
  const pendingSaves = useRef<Promise<void>[]>([]);

  /** Practice XP a finished graded card would add toward today's goal (once per card per day). */
  function practiceFor(c: Card): number {
    if (!isDone(c) || !isInteractiveCard(c) || !daily) return 0;
    return practicedOn(snapshot.xpEvents, daily.today.day, lesson.id, c.id) ? 0 : practiceXp(c.difficulty);
  }

  function markComplete(c: Card, xp: number, practice = 0) {
    setCompletedThisVisit((current) => new Set(current).add(c.id));
    pendingSaves.current.push(store.completeCard(lesson.id, c.id, xp, practice));
  }

  function goTo(nextIndex: number) {
    setIndex(nextIndex);
    setRun(freshRun(lesson.cards[nextIndex] as Card));
    window.scrollTo({ top: 0 });
  }

  /**
   * `justCompleted` is a card marked complete in this same event (a final explainer or explore
   * card), and `justEarned` its XP. Those state updates haven't been applied yet, so they're
   * counted explicitly.
   */
  async function finish(justCompleted?: string, justEarned = 0) {
    const { missingCore, challengesCompleted } = lessonFinishState(
      lesson.cards,
      (c) => c.id === justCompleted || isDone(c),
    );
    if (missingCore !== -1) {
      // Shouldn't happen (core cards can't be skipped), but never mark a lesson done early.
      goTo(missingCore);
      return;
    }
    await Promise.all(pendingSaves.current.splice(0));
    const bonus = lessonBonusToAward(snapshot, lesson.id);
    await store.completeLesson(lesson.id, bonus);
    trackEvent("lesson_complete", lesson.id);
    setResult({ xpEarned: sessionXp + justEarned + bonus, alreadyCompleted: bonus === 0, challengesCompleted });
    window.scrollTo({ top: 0 });
  }

  function advance() {
    if (showCoach) coach.dismiss();
    feedback.play("complete");
    // Explainers and explore cards are completed by Continue. Explore cards pay a small XP once.
    const completedByContinue = !definition.interactive;
    const xp = completedByContinue && isGuidedDefinition(definition) ? exploreXpToAward(isDone(card)) : 0;
    if (completedByContinue) {
      markComplete(card, xp);
      if (xp > 0) setSessionXp((current) => current + xp);
    }
    if (index + 1 < total) goTo(index + 1);
    else void finish(completedByContinue ? card.id : undefined, xp);
  }

  function check() {
    if (!definition.interactive || run.status !== "answering") return;
    if (!definition.isAnswerReady(run.answer, card)) return;
    if (showCoach) coach.dismiss();

    const attempts = run.attempts + 1;
    const { correct } = definition.grade(card, run.answer);
    if (correct) {
      const xp = cardXpToAward(isDone(card), card.difficulty, attempts, run.hintUsed);
      const practice = practiceFor(card);
      setRun({ ...run, status: "correct", attempts, xpAwarded: xp, practiceAwarded: practice });
      setSessionXp((current) => current + xp);
      markComplete(card, xp, practice);
      setPulse((current) => ({ key: (current?.key ?? 0) + 1, from: index - 1, to: index }));
      feedback.play("correct");
      feedback.haptic("success");
    } else {
      setRun({ ...run, status: "incorrect", attempts });
      playIncorrect();
      feedback.play("wrong");
      feedback.haptic("error");
    }
  }

  function tryAgain() {
    setRun({ ...run, status: "answering" });
  }

  let primary: FooterAction;
  if (isGuidedDefinition(definition)) {
    primary = { label: "Continue", onClick: advance, disabled: !definition.isComplete(run.answer, card) };
  } else if (!definition.interactive) {
    primary = { label: "Continue", onClick: advance };
  } else if (run.status === "answering") {
    primary = { label: "Check", onClick: check, disabled: !definition.isAnswerReady(run.answer, card) };
  } else if (run.status === "incorrect") {
    primary = { label: "Try again", onClick: tryAgain };
  } else {
    primary = { label: "Continue", onClick: advance };
  }

  const secondary: FooterAction | undefined =
    card.difficulty === "challenge" && run.status !== "correct"
      ? { label: "Skip challenge", onClick: advance }
      : undefined;

  const progressNodes: ProgressNode[] = lesson.cards.map((c, i) => {
    const challenge = c.difficulty === "challenge";
    if (result) return { state: isDone(c) ? "done" : "skipped", challenge };
    if (i < index) return { state: isDone(c) ? "done" : "skipped", challenge };
    if (i === index) return { state: run.status === "correct" ? "done" : "current", challenge };
    return { state: "upcoming", challenge };
  });

  useGlobalKeyDown((event) => {
    if (event.key !== "Enter" || event.repeat) return;
    event.preventDefault();
    // With the how-to-play panel open, Enter means "Got it", unless it came from an answer box
    // (the learner has clearly started; Check dismisses the panel too).
    const fromAnswerBox = event.target instanceof Element && event.target.closest("[data-enter-submits]");
    if (showCoach && !fromAnswerBox) coach.dismiss();
    else if (!primary.disabled) primary.onClick();
  }, result === null);

  if (result) {
    const next = getNextLesson(course, lesson.id);
    const milestone = daily ? milestoneReached(start.streak, daily.streak.current) : null;
    if (milestone && !milestoneSeen) {
      return (
        <PlayerShell nodes={progressNodes} progressLabel="Lesson progress: complete" exitHref={`/course/${course.id}`}>
          <MilestoneScreen days={milestone} onContinue={() => setMilestoneSeen(true)} />
        </PlayerShell>
      );
    }
    return (
      <PlayerShell nodes={progressNodes} progressLabel="Lesson progress: complete" exitHref={`/course/${course.id}`}>
        <LessonComplete
          goalMetNow={goalMetNow}
          freezeEarned={(daily?.streak.freezes ?? 0) > start.freezes}
          pathHref={`/course/${course.id}?completed=${lesson.id}`}
          title={lesson.title}
          xpEarned={result.xpEarned}
          alreadyCompleted={result.alreadyCompleted}
          challengesCompleted={result.challengesCompleted}
          challengesTotal={lesson.cards.filter((c) => c.difficulty === "challenge").length}
          next={next}
          lessonId={lesson.id}
        />
      </PlayerShell>
    );
  }

  const hint = visibleHint(card, "lesson", run.status);
  const tone: FeedbackTone =
    run.status === "correct" ? "correct" : run.status === "incorrect" ? "incorrect" : "neutral";
  const challengeXp = XP.card.challenge.firstTry;

  return (
    <PlayerShell
      exitHref={`/course/${course.id}`}
      nodes={progressNodes}
      pulse={pulse}
      progressLabel={`Lesson progress: card ${index + 1} of ${total}`}
      footer={
        <FeedbackFooter
          key={`${index}-${run.status}`}
          tone={tone}
          // Wrong answers get a small confused mascot; correct ones keep the usual feedback only.
          mascot={run.status === "incorrect" ? "confused" : undefined}
          heading={
            run.status === "correct"
              ? PRAISE[index % PRAISE.length]
              : run.status === "incorrect"
                ? "Not quite"
                : undefined
          }
          subheading={
            run.status === "incorrect"
              ? ((isInteractiveCard(card) ? nudgeFor(card, run.answer) : undefined) ?? "Have another go. You've got this.")
              : undefined
          }
          xpAwarded={run.xpAwarded}
          practiceXp={run.practiceAwarded}
          goalNote={goalNoteAt === index && run.status === "correct" ? "Daily goal reached" : undefined}
          explanation={isInteractiveCard(card) && run.status !== "answering" ? card.explanation : undefined}
          collapseExplanation={run.status === "incorrect"}
          primary={primary}
          secondary={secondary}
        />
      }
    >
      {showCoach && <CoachPanel key={showCoach} coachKey={showCoach} onDone={coach.dismiss} />}
      <CardStage cardKey={`${lesson.id}-${index}`} card={card} scope={scope} challengeXp={challengeXp}>
        {definition.interactive || isGuidedDefinition(definition) ? (
          <definition.Component
            card={card}
            answer={run.answer}
            onAnswerChange={(answer) => setRun((current) => ({ ...current, answer }))}
            status={run.status}
          />
        ) : (
          <definition.Component card={card} />
        )}
        {hint && (
          <HintReveal
            key={`${lesson.id}-${index}-hint`}
            hint={hint}
            used={run.hintUsed}
            onUse={() => setRun((current) => ({ ...current, hintUsed: true }))}
            xpNote={hintXpNote(card, isDone(card))}
          />
        )}
      </CardStage>
    </PlayerShell>
  );
}
