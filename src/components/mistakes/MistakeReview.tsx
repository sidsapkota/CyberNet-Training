"use client";

import { useEffect, useRef, useState } from "react";
import { checkMistakeAction, getMistakeCountAction, getMistakesToReviewAction, type MistakeToReview } from "@/app/actions/mistakes";
import { nudgeFor } from "@/cards/nudge";
import { getCardDefinition } from "@/cards/registry";
import { canCheckAgain, retryAnswer } from "@/cards/retry";
import { speechText } from "@/cards/speech";
import type { CardStatus } from "@/cards/types";
import { Mascot } from "@/components/mascot/Mascot";
import type { ProgressNode } from "@/components/network/NodeProgress";
import { NetworkMark } from "@/components/network/NetworkMark";
import { CardStage, useFeedbackAnimation } from "@/components/player/CardStage";
import { FeedbackFooter, type FeedbackTone, type FooterAction } from "@/components/player/FeedbackFooter";
import { PlayerShell, uniformNodes } from "@/components/player/PlayerShell";
import { ProPitch } from "@/components/pro/ProPitch";
import { ButtonLink, Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFeedback } from "@/lib/feedback";
import { hintCost, visibleHint } from "@/lib/hints";
import { useGlobalKeyDown } from "@/lib/keyboard";
import { practicedOn } from "@/lib/progress/daily";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { isCardCompleted } from "@/lib/progress/types";
import { useDaily } from "@/lib/progress/useDaily";
import { cardXpToAward, practiceXp } from "@/lib/progress/xp";
import { usePro } from "@/lib/pro/ProProvider";

/**
 * Mistake review (Pro): the cards a learner got wrong, one at a time, newest first. A right answer
 * (re-graded on the server) clears the mistake and pays like a replay: practice toward today's goal,
 * or the card's XP if it was never finished. Quiz cards pay nothing, as in quizzes. "Skip for now"
 * keeps a mistake for next time. The card's hint is there as in lessons: opening it makes a card that
 * was never finished pay retry XP, and practice XP is the retry amount anyway, so it can't be gamed. Free learners see the Pro pitch instead.
 */
export function MistakeReview() {
  const { pro, hasPro } = usePro();
  if (pro.loading) return <Loading />;
  return hasPro ? <ReviewLoader /> : <ReviewPitch />;
}

function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <NetworkMark mode="loading" className="size-20" label="Loading your mistakes" />
    </div>
  );
}

function ReviewPitch() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    getMistakeCountAction().then(
      (r) => setCount(r.count),
      () => setCount(0),
    );
  }, []);
  return (
    <main className="grid min-h-dvh place-items-center px-gutter py-8">
      <ProPitch
        headline="Review your mistakes"
        sub={count ? `${count} ${count === 1 ? "card" : "cards"} saved to try again.` : "Every card you miss, saved to try again."}
        track="page"
        declineSource="paywall"
        notNow={{ href: "/" }}
      />
    </main>
  );
}

function ReviewLoader() {
  const [loaded, setLoaded] = useState<{ mistakes: MistakeToReview[]; total: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [round, setRound] = useState(0);
  useEffect(() => {
    let live = true;
    getMistakesToReviewAction().then(
      (r) => live && setLoaded(r),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [round]);

  if (failed) {
    return (
      <EndScreen heading="Couldn't load your mistakes" line="Check your connection and try again.">
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </EndScreen>
    );
  }
  if (!loaded) return <Loading />;
  if (loaded.mistakes.length === 0) {
    return (
      <EndScreen heading="Nothing to review" line="Cards you get wrong will wait here for another go." mascot="presenting">
        <ButtonLink href="/">Back to dashboard</ButtonLink>
      </EndScreen>
    );
  }
  return (
    <ReviewRun
      key={round}
      mistakes={loaded.mistakes}
      more={loaded.total > loaded.mistakes.length}
      onMore={() => {
        setLoaded(null);
        setRound((r) => r + 1);
      }}
    />
  );
}

interface Run {
  answer: unknown;
  status: CardStatus;
  attempts: number;
  xp: number;
  practice: number;
  /** The learner opened the hint. */
  hintUsed: boolean;
  /** The answer just marked wrong: Check waits for a change. */
  lastWrong?: unknown;
}

function freshRun(m: MistakeToReview): Run {
  const definition = getCardDefinition(m.card);
  return { answer: definition.interactive ? definition.initialAnswer(m.card) : null, status: "answering", attempts: 0, xp: 0, practice: 0, hintUsed: false };
}

function ReviewRun({ mistakes, more, onMore }: { mistakes: MistakeToReview[]; more: boolean; onMore: () => void }) {
  const { store, snapshot } = useProgress();
  const daily = useDaily();
  const feedback = useFeedback();
  const { scope, playIncorrect } = useFeedbackAnimation();
  const [index, setIndex] = useState(0);
  const [run, setRun] = useState<Run>(() => freshRun(mistakes[0]!));
  const [results, setResults] = useState<ReadonlyMap<number, "cleared" | "skipped">>(() => new Map());
  /** Set when the review ends: every save still in flight ("Review more" waits for them). */
  const [saves, setSaves] = useState<Promise<unknown> | null>(null);
  const finished = saves !== null;
  const pending = useRef<Promise<unknown>[]>([]);

  const mistake = mistakes[index]!;
  const card = mistake.card;
  const definition = getCardDefinition(card);
  const total = mistakes.length;
  const cleared = [...results.values()].filter((r) => r === "cleared").length;

  function next(result: "cleared" | "skipped") {
    setResults((current) => new Map(current).set(index, result));
    if (index + 1 >= total) {
      setSaves(Promise.allSettled(pending.current.splice(0)));
    } else {
      setIndex(index + 1);
      setRun(freshRun(mistakes[index + 1]!));
    }
    window.scrollTo({ top: 0 });
  }

  function check() {
    if (!definition.interactive || run.status !== "answering" || !definition.isAnswerReady(run.answer, card)) return;
    if (!canCheckAgain(run.answer, run.lastWrong)) return;
    const attempts = run.attempts + 1;
    if (!definition.grade(card, run.answer).correct) {
      setRun({ ...run, status: "incorrect", attempts });
      playIncorrect();
      feedback.play("wrong");
      feedback.haptic("error");
      return;
    }
    // Right: the server re-grades and clears it; XP goes through the normal card write.
    let xp = 0;
    let practice = 0;
    if (mistake.kind === "lesson" && snapshot) {
      if (isCardCompleted(snapshot, mistake.lessonId, card.id)) {
        practice = daily && !practicedOn(snapshot.xpEvents, daily.today.day, mistake.lessonId, card.id) ? practiceXp(card.difficulty) : 0;
      } else {
        xp = cardXpToAward(false, card.difficulty, attempts, run.hintUsed);
      }
      pending.current.push(store.completeCard(mistake.lessonId, card.id, xp, practice));
    }
    pending.current.push(checkMistakeAction(mistake.lessonId, card.id, run.answer).catch((error: unknown) => console.error(error)));
    setRun({ ...run, status: "correct", attempts, xp, practice });
    feedback.play("correct");
    feedback.haptic("success");
  }

  let primary: FooterAction;
  if (run.status === "answering")
    primary = {
      label: "Check",
      onClick: check,
      disabled: !definition.interactive || !definition.isAnswerReady(run.answer, card) || !canCheckAgain(run.answer, run.lastWrong),
    };
  else if (run.status === "incorrect")
    primary = {
      label: "Try again",
      // The wrong part is cleared, anything right stays (src/cards/retry.ts).
      onClick: () =>
        setRun({
          ...run,
          status: "answering",
          answer: definition.interactive ? retryAnswer(card, run.answer, definition.initialAnswer(card)) : run.answer,
          lastWrong: run.answer,
        }),
    };
  else primary = { label: index + 1 < total ? "Next" : "Finish", onClick: () => next("cleared") };
  const secondary: FooterAction | undefined = run.status !== "correct" ? { label: "Skip for now", onClick: () => next("skipped") } : undefined;

  useGlobalKeyDown((event) => {
    if (event.key !== "Enter" || event.repeat) return;
    event.preventDefault();
    if (!primary.disabled) primary.onClick();
  }, !finished);

  const nodes: ProgressNode[] = mistakes.map((m, i) => {
    const challenge = m.card.difficulty === "challenge";
    const r = results.get(i);
    if (r) return { state: r === "cleared" ? "done" : "skipped", challenge };
    if (i === index && !finished) return { state: run.status === "correct" ? "done" : "current", challenge };
    return { state: "upcoming", challenge };
  });

  if (finished) {
    return (
      <PlayerShell nodes={nodes} progressLabel="Mistake review: complete" exitHref="/">
        <FinishScreen cleared={cleared} total={total} more={more} onMore={onMore} saves={saves} />
      </PlayerShell>
    );
  }

  const hint = visibleHint(card, "lesson", run.status);
  // Only a lesson card never finished has XP to lose (quiz cards pay nothing; replays pay practice).
  const unfinished = mistake.kind === "lesson" && snapshot !== null && !isCardCompleted(snapshot, mistake.lessonId, card.id);
  const tone: FeedbackTone = run.status === "correct" ? "correct" : run.status === "incorrect" ? "incorrect" : "neutral";
  return (
    <PlayerShell
      nodes={nodes}
      progressLabel={`Mistake review: card ${index + 1} of ${total}`}
      exitHref="/"
      listen={speechText(card, run.status)}
      footer={
        <FeedbackFooter
          key={`${index}-${run.status}`}
          hint={
            hint
              ? { text: hint, used: run.hintUsed, onUse: () => setRun((current) => ({ ...current, hintUsed: true })), cost: unfinished ? hintCost(card, false) : undefined }
              : undefined
          }
          tone={tone}
          heading={run.status === "correct" ? "Got it this time." : run.status === "incorrect" ? "Not quite yet." : undefined}
          subheading={run.status === "incorrect" ? (nudgeFor(card, run.answer) ?? "Have another go, or skip it for now.") : undefined}
          xpAwarded={run.xp}
          practiceXp={run.practice}
          explanation={run.status !== "answering" ? card.explanation : undefined}
          collapseExplanation={run.status === "incorrect"}
          primary={primary}
          secondary={secondary}
        />
      }
    >
      <p className="mb-3 truncate font-mono text-caption tracking-widest text-ink-faint uppercase">
        Mistake {index + 1} of {total} · {mistake.lessonTitle}
      </p>
      {/* Shown as core: "Bonus · Optional: skip it any time" means nothing here (Skip for now is always there). */}
      <CardStage cardKey={`review-${index}`} card={{ ...card, difficulty: "core" }} scope={scope}>
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

function FinishScreen({
  cleared,
  total,
  more,
  onMore,
  saves,
}: {
  cleared: number;
  total: number;
  more: boolean;
  onMore: () => void;
  saves: Promise<unknown>;
}) {
  const [saving, setSaving] = useState(true);
  useEffect(() => {
    let live = true;
    void saves.then(() => live && setSaving(false));
    return () => {
      live = false;
    };
  }, [saves]);
  const left = total - cleared;
  const { auth } = useAuth();
  const name = auth.status === "signed-in" ? auth.username : null;
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <Mascot expression={cleared > 0 ? "celebrating" : "thinking"} size={120} idle />
      <h1 className="mt-4 text-headline font-semibold">
        {cleared > 0 ? "Review done" : "Review over"}
        {name && <span className="block truncate text-lead font-medium text-ink-muted">{name}</span>}
      </h1>
      <p className="mt-2 text-ink-muted">
        <span className="font-mono font-semibold text-ink tabular-nums">{cleared}</span> of {total} fixed
        {left > 0 ? `. ${left === 1 ? "One waits" : `${left} wait`} for next time.` : "."}
      </p>
      <div className="mt-6 grid w-full max-w-xs gap-2">
        {more ? (
          <Button onClick={onMore} disabled={saving}>
            Review more
          </Button>
        ) : null}
        {/* Waits for the last answers to save, so leaving at once can't lose a fixed card. */}
        {saving ? (
          <Button variant={more ? "ghost" : "primary"} disabled>
            Back to dashboard
          </Button>
        ) : (
          <ButtonLink href="/" variant={more ? "ghost" : "primary"}>
            Back to dashboard
          </ButtonLink>
        )}
      </div>
    </div>
  );
}

function EndScreen({
  heading,
  line,
  mascot = "thinking",
  children,
}: {
  heading: string;
  line: string;
  mascot?: "thinking" | "presenting";
  children: React.ReactNode;
}) {
  return (
    <PlayerShell nodes={uniformNodes(1, "upcoming")} progressLabel="Mistake review" exitHref="/">
      <div className="flex flex-col items-center py-6 text-center">
        <Mascot expression={mascot} size={120} />
        <h1 className="mt-4 text-headline font-semibold">{heading}</h1>
        <p className="mt-2 text-ink-muted">{line}</p>
        <div className="mt-6 grid w-full max-w-xs gap-2">{children}</div>
      </div>
    </PlayerShell>
  );
}
