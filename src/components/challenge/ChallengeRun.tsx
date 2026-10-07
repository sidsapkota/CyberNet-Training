"use client";

import { useState } from "react";
import { PlayModeContext } from "@/cards/playMode";
import { getCardDefinition } from "@/cards/registry";
import type { InteractiveCard } from "@/cards/schema";
import type { CardStatus } from "@/cards/types";
import { speechText } from "@/cards/speech";
import { CardStage, useFeedbackAnimation } from "@/components/player/CardStage";
import { FeedbackFooter, type FooterAction } from "@/components/player/FeedbackFooter";
import { PlayerShell } from "@/components/player/PlayerShell";
import { wrongThemeFor } from "@/components/player/WrongBurst";
import { health } from "@/lib/challenges/rules";
import { useFeedback } from "@/lib/feedback";
import { useGlobalKeyDown } from "@/lib/keyboard";
import { type Duelist, HealthBars } from "./HealthBars";

interface Run {
  answer: unknown;
  status: CardStatus;
}

const fresh = (card: InteractiveCard): Run => {
  const definition = getCardDefinition(card);
  return { answer: definition.interactive ? definition.initialAnswer(card) : null, status: "answering" };
};

/**
 * The duel itself: the challenge's questions, one try each (quiz rules: no hints, no explanations,
 * no live results inside cards), with the two health bars on top. After each Check the rival's
 * recorded answer to the same question is revealed, and their bar drops if they missed it.
 * The challenger plays it with no rival. The server re-grades everything afterwards.
 */
export function ChallengeRun({
  cards,
  courseId,
  exitHref,
  me,
  rival,
  onFinish,
}: {
  cards: InteractiveCard[];
  courseId: string;
  exitHref: string;
  me: Duelist;
  rival: (Duelist & { results: boolean[] }) | null;
  onFinish: (answers: unknown[], results: boolean[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [run, setRun] = useState<Run>(() => fresh(cards[0]!));
  const [answers, setAnswers] = useState<unknown[]>([]);
  const [results, setResults] = useState<boolean[]>([]);
  const [pulse, setPulse] = useState<{ key: number; from: number; to: number } | null>(null);
  const { scope, playIncorrect } = useFeedbackAnimation();
  const feedback = useFeedback();
  const card = cards[index]!;
  const definition = getCardDefinition(card);
  const total = cards.length;
  const isLast = index + 1 >= total;

  function check() {
    if (!definition.interactive || run.status !== "answering" || !definition.isAnswerReady(run.answer, card)) return;
    const { correct } = definition.grade(card, run.answer);
    setRun({ ...run, status: correct ? "correct" : "incorrect" });
    setAnswers((a) => [...a, run.answer]);
    setResults((r) => [...r, correct]);
    if (correct) setPulse((p) => ({ key: (p?.key ?? 0) + 1, from: index - 1, to: index }));
    else playIncorrect();
    feedback.play(correct ? "correct" : "wrong");
    feedback.haptic(correct ? "success" : "error");
  }

  function next() {
    if (isLast) return onFinish(answers, results);
    setIndex(index + 1);
    setRun(fresh(cards[index + 1]!));
    window.scrollTo({ top: 0 });
  }

  const primary: FooterAction =
    run.status === "answering"
      ? { label: "Check", onClick: check, disabled: !definition.interactive || !definition.isAnswerReady(run.answer, card) }
      : { label: isLast ? "See the result" : "Next question", onClick: next };

  useGlobalKeyDown((event) => {
    if (event.key !== "Enter" || event.repeat || primary.disabled) return;
    event.preventDefault();
    primary.onClick();
  });

  const rivalLine =
    rival && run.status !== "answering" ? `${rival.name} ${rival.results[index] ? "got this one" : "missed this one"}.` : undefined;

  return (
    <PlayerShell
      exitHref={exitHref}
      nodes={cards.map((_, i) => ({ state: i < index || (i === index && run.status !== "answering") ? "done" : i === index ? "current" : "upcoming" }))}
      pulse={pulse}
      progressLabel={`Challenge: question ${index + 1} of ${total}`}
      listen={speechText(card, "answering")}
      footer={
        <FeedbackFooter
          key={`${index}-${run.status}`}
          tone={run.status === "correct" ? "correct" : run.status === "incorrect" ? "incorrect" : "neutral"}
          heading={run.status === "correct" ? "Correct" : run.status === "incorrect" ? "Incorrect" : undefined}
          subheading={rivalLine}
          primary={primary}
          wrongTheme={wrongThemeFor(courseId)}
        />
      }
    >
      <HealthBars
        me={me}
        rival={rival}
        mine={total - results.filter((r) => !r).length}
        theirs={rival ? health(rival.results, results.length) : 0}
        total={total}
      />
      <PlayModeContext.Provider value="quiz">
        <CardStage cardKey={`challenge-${index}`} card={card} scope={scope}>
          {definition.interactive && (
            <definition.Component card={card} answer={run.answer} onAnswerChange={(answer) => setRun((r) => ({ ...r, answer }))} status={run.status} />
          )}
        </CardStage>
      </PlayModeContext.Provider>
    </PlayerShell>
  );
}
