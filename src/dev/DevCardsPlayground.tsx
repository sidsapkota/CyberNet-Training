"use client";

import { useState } from "react";
import { isInteractiveCard } from "@/cards/schema";
import { LessonRun } from "@/components/player/LessonRun";
import { QuizRun } from "@/components/player/QuizRun";
import { Button } from "@/components/ui/Button";
import { ArrowRightIcon, ChallengeIcon } from "@/components/ui/icons";
import { type CourseOutline, DEFAULT_PASS_THRESHOLD, type Quiz, type RegularLesson, toLessonOutline } from "@/lib/content/schema";
import { LocalStorageProgressStore } from "@/lib/progress/localStorageProgressStore";
import { MemoryStorage } from "@/lib/progress/memoryStorage";
import { ProgressProvider } from "@/lib/progress/ProgressProvider";
import type { ProgressStore } from "@/lib/progress/ProgressStore";
import { CARD_SAMPLES } from "./card-samples";

type Mode = "lesson" | "quiz";
interface Run {
  key: number;
  mode: Mode;
  cardIds: string[];
  /** Throwaway progress: never touches the learner's real localStorage. */
  store: ProgressStore;
}

function buildRun(mode: Mode, cardIds: string[]) {
  const cards = CARD_SAMPLES.filter((c) => cardIds.includes(c.id));
  const base = { order: 1, courseId: "dev", moduleId: "dev-module", access: "free" as const, guests: true };
  const lesson: RegularLesson | Quiz =
    mode === "lesson"
      ? { ...base, id: "dev-lesson", kind: "lesson", title: "Card playground (lesson)", icon: "layers", cards }
      : {
          ...base,
          id: "dev-quiz",
          kind: "quiz",
          title: "Card playground (quiz)",
          passThreshold: DEFAULT_PASS_THRESHOLD,
          // Quizzes are core, interactive cards only.
          cards: cards.filter(isInteractiveCard).map((c) => ({ ...c, difficulty: "core" as const })),
        };
  const course: CourseOutline = {
    id: "dev",
    title: "Dev",
    level: "easy",
    description: "Dev playground",
    order: 0,
    modules: [
      { id: "dev-module", title: "Dev", description: "Dev", order: 0, access: "free", courseId: "dev", lessons: [toLessonOutline(lesson)] },
    ],
  };
  return { lesson, course };
}

/** Dev-only playground: plays sample cards through the real LessonRun / QuizRun. */
export function DevCardsPlayground() {
  const [run, setRun] = useState<Run | null>(null);

  function start(mode: Mode, cardIds: string[]) {
    const storage = new MemoryStorage();
    setRun((current) => ({
      key: (current?.key ?? 0) + 1,
      mode,
      cardIds,
      store: new LocalStorageProgressStore(() => storage),
    }));
    window.scrollTo({ top: 0 });
  }

  if (run) {
    const { lesson, course } = buildRun(run.mode, run.cardIds);
    return (
      <ProgressProvider key={run.key} store={run.store}>
        <div className="flex items-center gap-3 border-b border-warning/40 bg-warning-soft px-gutter py-1.5 font-mono text-caption text-warning">
          <span className="font-semibold tracking-wider uppercase">Dev · {run.mode} mode</span>
          <button type="button" onClick={() => setRun(null)} className="ml-auto font-semibold underline">
            Back to card list
          </button>
        </div>
        {lesson.kind === "quiz" ? (
          <QuizRun quiz={lesson} course={course} />
        ) : (
          <LessonRun lesson={lesson} course={course} initialIndex={0} />
        )}
      </ProgressProvider>
    );
  }

  const allIds = CARD_SAMPLES.map((c) => c.id);
  return (
    <main className="mx-auto max-w-page px-gutter py-10">
      <p className="font-mono text-caption tracking-widest text-warning uppercase">Dev only · not in production builds</p>
      <h1 className="mt-2 text-headline font-semibold">Card playground</h1>
      <p className="mt-2 text-ink-muted">
        Every card type through the real lesson and quiz players, with throwaway progress. Your real progress and XP are
        never touched.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => start("lesson", allIds)}>
          Play all as a lesson <ArrowRightIcon className="size-5" />
        </Button>
        <Button variant="secondary" onClick={() => start("quiz", allIds)}>
          Play all as a quiz
        </Button>
      </div>

      <ul className="mt-10 divide-y divide-line rounded-card border border-line bg-surface">
        {CARD_SAMPLES.map((card) => (
          <li key={card.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-small font-semibold text-ink">{card.type}</p>
              <p className="flex items-center gap-1.5 text-caption text-ink-muted">
                {card.id}
                {card.difficulty === "challenge" && (
                  <span className="inline-flex items-center gap-1 text-warning">
                    <ChallengeIcon className="size-3" /> challenge
                  </span>
                )}
              </p>
            </div>
            <Button variant="secondary" className="min-h-10 px-3 text-small" onClick={() => start("lesson", [card.id])}>
              Lesson
            </Button>
            <Button
              variant="secondary"
              className="min-h-10 px-3 text-small"
              disabled={!isInteractiveCard(card)}
              onClick={() => start("quiz", [card.id])}
            >
              Quiz
            </Button>
          </li>
        ))}
      </ul>
    </main>
  );
}
