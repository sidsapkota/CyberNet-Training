"use client";

import * as Popover from "@radix-ui/react-popover";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { NetworkMark } from "@/components/network/NetworkMark";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CheckIcon, ExploreModeIcon, LockIcon, PlayIcon, RetryIcon } from "@/components/ui/icons";
import { estimateMinutes } from "@/lib/content/estimate";
import type { LessonOutline } from "@/lib/content/schema";
import { EASE_OUT_QUICK, POPOVER_SPRING, PRESS_SPRING } from "@/lib/motion";
import { useProgress } from "@/lib/progress/ProgressProvider";
import type { LessonState } from "@/lib/progress/state";
import { cardKey, type ProgressSnapshot } from "@/lib/progress/types";

export type NodeLook = "done" | "current" | "available" | "locked";

/** Visual state of a node. "current" is the learner's next item, whatever its status. */
export function nodeLook(state: LessonState, isCurrent: boolean): NodeLook {
  if (state.status === "completed") return "done";
  if (isCurrent) return "current";
  return state.status === "locked" ? "locked" : "available";
}

function earnedXp(snapshot: ProgressSnapshot, lessonId: string): number {
  const prefix = cardKey(lessonId, "");
  let xp = snapshot.lessons[lessonId]?.xp ?? 0;
  for (const [key, card] of Object.entries(snapshot.cards)) if (key.startsWith(prefix)) xp += card.xp;
  for (const attempt of snapshot.quizzes[lessonId]?.attempts ?? []) xp += attempt.xp;
  return xp;
}

/** The popover's one short line, derived from progress (never extra lesson content). */
function summary(state: LessonState, look: NodeLook, snapshot: ProgressSnapshot, blocking: LessonOutline | null) {
  const { lesson } = state;
  const minutes = `about ${estimateMinutes(lesson)} min`;
  if (look === "locked") return blocking ? `Finish “${blocking.title}” first` : "Locked for now";
  if (lesson.kind === "quiz") {
    if (look === "done") return `Passed · best ${Math.round((state.bestScore ?? 1) * 100)}%`;
    const pass = `pass with ${Math.round((lesson.passThreshold ?? 0.7) * 100)}%`;
    return state.bestScore !== null ? `Best ${Math.round(state.bestScore * 100)}% · ${pass}` : `${lesson.cardCount} questions · ${pass}`;
  }
  if (look === "done") return `Done · ${earnedXp(snapshot, lesson.id)} XP`;
  if (state.status === "in_progress") return `In progress · ${minutes}`;
  return look === "current" ? `Up next · ${minutes}` : minutes;
}

const SIZE = { lesson: "size-18", quiz: "size-24" } as const;

const LOOK_CLASSES: Record<NodeLook, string> = {
  done: "border-accent-ink bg-accent text-on-accent shadow-node-lit",
  current: "border-accent-ink bg-surface text-accent-ink shadow-node-lit",
  available: "border-accent-ink bg-surface text-accent-ink shadow-node",
  locked: "border-line-strong bg-surface-raised text-ink-faint shadow-node",
};
/** A passed quiz hub keeps a soft fill so its lit network mark stays visible. */
const QUIZ_DONE = "border-accent-ink bg-accent-soft text-accent-ink shadow-node-lit";

export function PathNode({
  state,
  number,
  look,
  blocking,
  entranceDelay,
  justFilled,
}: {
  state: LessonState;
  /** 1-based position within the module, shown on lesson nodes. */
  number: number;
  look: NodeLook;
  blocking: LessonOutline | null;
  entranceDelay: number;
  /** True right after this node was completed (plays a one-off ripple). */
  justFilled: boolean;
}) {
  const { snapshot, store } = useProgress();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { lesson } = state;
  const isQuiz = lesson.kind === "quiz";
  const kindLabel = isQuiz ? "Module quiz" : `Lesson ${number}`;
  const stateWord = { done: "completed", current: "up next", available: "available", locked: "locked" }[look];

  const openInExplore = async () => {
    await store.setPreferences({ mode: "explore" });
    router.push(`/lesson/${lesson.id}`);
  };

  return (
    <Popover.Root>
      <motion.div
        className="relative"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...PRESS_SPRING, delay: entranceDelay }}
      >
        {look === "current" && (
          <motion.div
            layoutId="path-start-bubble"
            transition={PRESS_SPRING}
            aria-hidden="true"
            className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-3 -translate-x-1/2"
          >
            <span className="relative block rounded-control border-2 border-accent-ink bg-surface px-3 py-1.5 font-mono text-caption font-semibold tracking-widest whitespace-nowrap text-accent-ink uppercase shadow-card">
              {state.status === "in_progress" ? "Continue" : "Start"}
              <span className="absolute top-full left-1/2 -mt-[5px] size-2.5 -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-accent-ink bg-surface" />
            </span>
          </motion.div>
        )}

        <Popover.Trigger asChild>
          <motion.button
            type="button"
            data-current={look === "current" ? "" : undefined}
            aria-label={`${kindLabel}, ${lesson.title}, ${stateWord}`}
            whileHover={reduceMotion ? undefined : { scale: 1.06 }}
            whileTap={reduceMotion ? undefined : { scale: 0.92 }}
            transition={PRESS_SPRING}
            className={`relative grid ${SIZE[lesson.kind]} place-items-center rounded-node border-4 transition-colors focus-visible:outline-offset-4 ${
              isQuiz && look === "done" ? QUIZ_DONE : LOOK_CLASSES[look]
            }`}
          >
            {look === "current" && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -inset-2 animate-node-pulse rounded-node border-2 border-accent"
              />
            )}
            {justFilled && !reduceMotion && (
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute -inset-1 rounded-node border-2 border-accent"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 1.9, opacity: 0 }}
                transition={{ duration: 0.7, ease: EASE_OUT_QUICK }}
              />
            )}
            <NodeGlyph look={look} isQuiz={isQuiz} number={number} />
          </motion.button>
        </Popover.Trigger>
      </motion.div>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          sideOffset={14}
          collisionPadding={16}
          className="z-40 w-[min(20rem,calc(100vw-2rem))] outline-none"
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.9, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={POPOVER_SPRING}
            style={{ transformOrigin: "var(--radix-popover-content-transform-origin)" }}
            className={`rounded-card border-2 p-4 shadow-lift ${look === "locked" ? "border-line-strong bg-surface" : "border-accent-ink bg-surface"}`}
          >
            <p className="font-mono text-caption tracking-widest text-ink-faint uppercase">{kindLabel}</p>
            <p className="mt-1 text-lead leading-snug font-semibold text-balance">{lesson.title}</p>
            <p className="mt-1 text-small text-ink-muted">{snapshot ? summary(state, look, snapshot, blocking) : ""}</p>
            <div className="mt-4 flex flex-col gap-2">
              {look === "locked" ? (
                <>
                  <Button onClick={() => void openInExplore()} className="w-full">
                    <ExploreModeIcon className="size-5" /> Open in Explore
                  </Button>
                  {blocking && (
                    <ButtonLink href={`/lesson/${blocking.id}`} variant="ghost" className="w-full">
                      Go to that lesson
                    </ButtonLink>
                  )}
                </>
              ) : (
                <ButtonLink href={`/lesson/${lesson.id}`} variant={look === "done" ? "secondary" : "primary"} className="w-full">
                  {look === "done" ? (
                    <>
                      <RetryIcon className="size-5" /> Review
                    </>
                  ) : (
                    <>
                      <PlayIcon className="size-5" /> {state.status === "in_progress" ? "Continue" : "Start"}
                    </>
                  )}
                </ButtonLink>
              )}
            </div>
          </motion.div>
          <Popover.Arrow width={16} height={8} className={look === "locked" ? "fill-line-strong" : "fill-accent-ink"} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function NodeGlyph({ look, isQuiz, number }: { look: NodeLook; isQuiz: boolean; number: number }) {
  if (isQuiz) {
    return (
      <>
        <NetworkMark mode={look === "locked" ? "dim" : "lit"} shield={false} className="size-14" />
        {look === "done" && (
          <span className="absolute -right-1 -bottom-1 grid size-8 place-items-center rounded-node border-2 border-accent-ink bg-accent text-on-accent">
            <CheckIcon className="size-4" strokeWidth={2.5} />
          </span>
        )}
        {look === "locked" && (
          <span className="absolute -right-1 -bottom-1 grid size-8 place-items-center rounded-node border-2 border-line-strong bg-surface-raised">
            <LockIcon className="size-4" />
          </span>
        )}
      </>
    );
  }
  if (look === "done") return <CheckIcon className="size-8" strokeWidth={2.5} />;
  if (look === "locked") return <LockIcon className="size-6" />;
  return <span className="font-mono text-title font-semibold">{number}</span>;
}
