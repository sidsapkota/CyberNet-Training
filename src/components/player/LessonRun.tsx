"use client";

import { useEffect, useRef, useState } from "react";
import { getCardDefinition, isGuidedDefinition } from "@/cards/registry";
import { canCheckAgain, retryAnswer } from "@/cards/retry";
import { nudgeFor } from "@/cards/nudge";
import { type Card, isInteractiveCard } from "@/cards/schema";
import type { CardStatus } from "@/cards/types";
import { LessonTimeIcon } from "@/components/ui/icons";
import { formatChecked } from "@/lib/content/lastChecked";
import type { CourseOutline, RegularLesson } from "@/lib/content/schema";
import { useFeedback } from "@/lib/feedback";
import { useCardNavigationKeys, useGlobalKeyDown } from "@/lib/keyboard";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { trackEvent, trackLessonQuit } from "@/lib/analytics";
import { speechText } from "@/cards/speech";
import { reactionExpression, reactionLine } from "@/lib/reactions";
import { hintCost, visibleHint } from "@/lib/hints";
import { getNextLesson, hasAnyProgress, lessonFinishState } from "@/lib/progress/state";
import { coachAllowedOn } from "@/lib/coach";
import { emptySnapshot, isCardCompleted } from "@/lib/progress/types";
import { practicedOn } from "@/lib/progress/daily";
import { milestoneReached } from "@/lib/progress/streak";
import { useDaily } from "@/lib/progress/useDaily";
import { cardXpToAward, exploreXpToAward, lessonBonusToAward, practiceXp, XP } from "@/lib/progress/xp";
import { MilestoneScreen } from "@/components/streak/MilestoneScreen";
import { type ProgressNode } from "@/components/network/NodeProgress";
import { CardReview, type ReviewState } from "./CardReview";
import { CardStage, useFeedbackAnimation } from "./CardStage";
import { FeedbackFooter, type FeedbackTone, type FooterAction } from "./FeedbackFooter";
import { CoachPanel } from "./coach/CoachPanel";
import { useCoach } from "./coach/useCoach";
import { LessonComplete } from "./LessonComplete";
import { LessonMenu } from "./LessonMenu";
import { moduleNeighbours } from "@/lib/progress/lessonNav";
import { wrongThemeFor } from "./WrongBurst";
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
  /** The answer just marked wrong: Check comes back only once the answer differs from it. */
  lastWrong?: unknown;
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
  /** How each card was left in this visit (answered, or skipped), for going back. */
  const [history, setHistory] = useState<ReadonlyMap<number, CardRun>>(() => new Map());
  /** An earlier card being looked at (read-only), or null for the live card. */
  const [viewing, setViewing] = useState<number | null>(null);
  /** Read out to screen readers when the learner moves between cards. */
  const [announcement, setAnnouncement] = useState("");
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
  // Read once when the lesson opens: someone with no progress at all is brand new here.
  const [newcomer] = useState(() => !hasAnyProgress(snapshot));
  useEffect(() => trackEvent("lesson_start", lesson.id), [lesson.id]);
  const showCoach = result === null && run.status === "answering" && coachAllowedOn(index, newcomer) ? coach.coachKey : null;

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
    setViewing(null);
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
    setHistory((current) => new Map(current).set(index, run));
    if (index + 1 < total) goTo(index + 1);
    else void finish(completedByContinue ? card.id : undefined, xp);
  }

  function check() {
    if (!definition.interactive || run.status !== "answering") return;
    if (!definition.isAnswerReady(run.answer, card) || !canCheckAgain(run.answer, run.lastWrong)) return;
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
      // Mistake review: the first wrong try on this card in this visit (the server re-grades it).
      if (attempts === 1) void store.recordMistake(lesson.id, card.id, run.answer);
      playIncorrect();
      feedback.play("wrong");
      feedback.haptic("error");
    }
  }

  /** Try again: the wrong part is cleared, anything right stays (src/cards/retry.ts). */
  function tryAgain() {
    if (!definition.interactive || !isInteractiveCard(card)) return setRun({ ...run, status: "answering" });
    setRun({ ...run, status: "answering", answer: retryAnswer(card, run.answer, definition.initialAnswer(card)), lastWrong: run.answer });
  }
  // The answer is the one just marked wrong: Check waits for a change (no "wrong" loop).
  const unchangedAfterWrong =
    definition.interactive && run.status === "answering" && definition.isAnswerReady(run.answer, card) && !canCheckAgain(run.answer, run.lastWrong);

  let primary: FooterAction;
  if (isGuidedDefinition(definition)) {
    primary = { label: "Continue", onClick: advance, disabled: !definition.isComplete(run.answer, card) };
  } else if (!definition.interactive) {
    primary = { label: "Continue", onClick: advance };
  } else if (run.status === "answering") {
    primary = { label: "Check", onClick: check, disabled: !definition.isAnswerReady(run.answer, card) || unchangedAfterWrong };
  } else if (run.status === "incorrect") {
    primary = { label: "Try again", onClick: tryAgain };
  } else {
    primary = { label: "Continue", onClick: advance };
  }

  // "Skip" sits in the bonus card's own Bonus row (CardStage), not in a second footer row.
  const skip = card.difficulty === "challenge" && run.status !== "correct" ? advance : undefined;

  // ── Back and forward: earlier cards, read-only ──────────────────────────────
  const shownIndex = viewing ?? index;
  const canGoBack = result === null && shownIndex > 0;

  function show(target: number | null) {
    setViewing(target);
    const at = target ?? index;
    const c = lesson.cards[at] as Card;
    setAnnouncement(
      target === null ? `Card ${at + 1} of ${total}, where you were` : `Card ${at + 1} of ${total}, ${reviewWord(c, at)}. Read only.`,
    );
    window.scrollTo({ top: 0 });
    // Focus the card, so keyboard and screen-reader users start reading from its top.
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-card-stage]")?.focus());
  }
  /** From the progress trace: an answered card (read-only), or back to the current one. */
  function jumpTo(target: number) {
    if (target === index) show(null);
    else if (target < index) show(target);
  }
  function goBack() {
    if (shownIndex > 0) show(shownIndex - 1);
  }
  function goForward() {
    if (viewing === null) return;
    show(viewing + 1 >= index ? null : viewing + 1);
  }
  function reviewState(c: Card, at: number): ReviewState {
    const past = history.get(at);
    const definition = getCardDefinition(c);
    if (!definition.interactive) return { kind: "read", answer: past?.answer };
    if (past?.status === "correct") return { kind: "answered", answer: past.answer };
    return isDone(c) ? { kind: "done-before" } : { kind: "skipped" };
  }
  function reviewWord(c: Card, at: number): string {
    const kind = reviewState(c, at).kind;
    return kind === "skipped" ? "skipped" : kind === "read" ? "read" : "answered";
  }
  const reviewPrimary: FooterAction =
    viewing !== null && viewing + 1 < index ? { label: "Next", onClick: goForward } : { label: `Back to card ${index + 1}`, onClick: () => show(null) };

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
    if (viewing !== null) reviewPrimary.onClick();
    else if (showCoach && !fromAnswerBox) coach.dismiss();
    else if (!primary.disabled) primary.onClick();
  }, result === null);
  useCardNavigationKeys(canGoBack ? goBack : null, viewing !== null ? goForward : null, result === null);

  // Leaving before the end (✕, the browser's back, closing the tab): note the card, once.
  const quitState = useRef({ finished: false, sent: false, card: index + 1, pending: 0 });
  useEffect(() => {
    quitState.current.finished = result !== null;
    quitState.current.card = index + 1;
  }, [result, index]);
  useEffect(() => {
    const state = quitState.current;
    // A remount straight after an unmount (React's dev double-mount) cancels the pending send.
    window.clearTimeout(state.pending);
    const send = () => {
      if (state.finished || state.sent) return;
      state.sent = true;
      trackLessonQuit(lesson.id, state.card);
    };
    window.addEventListener("pagehide", send);
    return () => {
      window.removeEventListener("pagehide", send);
      state.pending = window.setTimeout(send, 0);
    };
  }, [lesson.id]);

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
          icon={lesson.icon}
          xpEarned={result.xpEarned}
          alreadyCompleted={result.alreadyCompleted}
          challengesCompleted={result.challengesCompleted}
          challengesTotal={lesson.cards.filter((c) => c.difficulty === "challenge").length}
          next={next}
          previous={moduleNeighbours(course, lesson.id).previous}
          lessonId={lesson.id}
        />
      </PlayerShell>
    );
  }

  if (viewing !== null) {
    const reviewCard = lesson.cards[viewing] as Card;
    const state = reviewState(reviewCard, viewing);
    const answered = state.kind === "answered" || state.kind === "done-before";
    return (
      <PlayerShell
        exitHref={`/course/${course.id}`}
        nodes={progressNodes}
        progressLabel={`Lesson progress: looking back at card ${viewing + 1} of ${total}`}
        onJump={result === null ? jumpTo : undefined}
        viewing={viewing}
        menu={<LessonMenu course={course} lessonId={lesson.id} />}
        listen={speechText(reviewCard, answered ? "correct" : "answering")}
        footer={
          <FeedbackFooter
            key={`review-${viewing}`}
            tone={answered ? "correct" : "neutral"}
            heading={answered ? "You got this one" : undefined}
            explanation={answered && isInteractiveCard(reviewCard) ? reviewCard.explanation : undefined}
            primary={reviewPrimary}
            back={canGoBack ? { label: "Back to the previous card", onClick: goBack } : undefined}
            secondary={viewing + 1 < index ? { label: `Back to card ${index + 1}`, onClick: () => show(null) } : undefined}
          />
        }
      >
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
        <p className="mb-3 font-mono text-caption tracking-widest text-ink-faint uppercase">
          Card {viewing + 1} of {total} · looking back
        </p>
        <CardStage
          cardKey={`${lesson.id}-review-${viewing}`}
          card={reviewCard}
          scope={scope}
        >
          <CardReview card={reviewCard} state={state} />
        </CardStage>
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
      onJump={result === null ? jumpTo : undefined}
      viewing={viewing}
      menu={<LessonMenu course={course} lessonId={lesson.id} />}
      listen={speechText(card, run.status)}
      footer={
        <FeedbackFooter
          key={`${index}-${run.status}`}
          hint={
            hint
              ? { text: hint, used: run.hintUsed, onUse: () => setRun((current) => ({ ...current, hintUsed: true })), cost: hintCost(card, isDone(card)) }
              : undefined
          }
          tone={tone}
          // The mascot reacts to every answer with a short, varied line (src/lib/reactions.ts).
          mascot={run.status === "answering" ? undefined : reactionExpression(run.status === "correct", card.difficulty === "challenge", run.attempts)}
          heading={run.status === "answering" ? undefined : reactionLine(lesson.id, index, run.attempts, run.status === "correct")}
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
          back={canGoBack ? { label: "Back to the previous card", onClick: goBack } : undefined}
          wrongTheme={wrongThemeFor(course.id)}
        />
      }
    >
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {showCoach && <CoachPanel key={showCoach} coachKey={showCoach} onDone={coach.dismiss} />}
      {lesson.lastChecked && index === 0 && (
        <p className="mb-4 inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface px-2.5 py-1 text-caption text-ink-muted">
          <LessonTimeIcon className="size-3.5" /> Last checked {formatChecked(lesson.lastChecked)}. These change fast.
        </p>
      )}
      <CardStage
        cardKey={`${lesson.id}-${index}`}
        card={card}
        scope={scope}
        challengeXp={challengeXp}
        onSkip={skip}
      >
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
      </CardStage>
      {unchangedAfterWrong && (
        <p role="status" className="mt-4 text-center text-small text-ink-muted">
          Change your answer, then press Check.
        </p>
      )}
    </PlayerShell>
  );
}
