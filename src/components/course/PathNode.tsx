"use client";

import * as Popover from "@radix-ui/react-popover";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UpgradeSheet } from "@/components/pro/UpgradeSheet";
import { NetworkMark } from "@/components/network/NetworkMark";
import { ProBadge } from "@/components/pro/ProBadge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AccountIcon, CheckIcon, ExploreModeIcon, LessonIcon, LockIcon, PlayIcon, RetryIcon } from "@/components/ui/icons";
import { getDailyLessonsAction } from "@/app/actions/pro";
import { useAuth } from "@/lib/auth/AuthProvider";
import { estimateMinutes } from "@/lib/content/estimate";
import { formatChecked } from "@/lib/content/lastChecked";
import type { CourseOutline, LessonOutline, ModuleOutline } from "@/lib/content/schema";
import { EASE_OUT_QUICK, POPOVER_SPRING, PRESS_SPRING } from "@/lib/motion";
import { lessonsLeftLine } from "@/lib/pro/dailyLimit";
import { usePro } from "@/lib/pro/ProProvider";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { hasCourseProgress, hasFinishedFreeLesson, type LessonState } from "@/lib/progress/state";
import { cardKey, type ProgressSnapshot } from "@/lib/progress/types";

export type NodeLook = "done" | "current" | "available" | "locked" | "pro";

/**
 * Visual state of a node. "current" is the learner's next item, whatever its status. "pro": part
 * of CyberNet Pro and the learner doesn't have it (a finished one still shows as done).
 */
export function nodeLook(state: LessonState, isCurrent: boolean): NodeLook {
  if (state.status === "completed") return "done";
  if (state.needsPro) return "pro";
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
  pro: "border-line-strong bg-surface text-ink-muted shadow-node",
};
/** A passed quiz hub keeps a soft fill so its lit network mark stays visible. */
const QUIZ_DONE = "border-accent-ink bg-accent-soft text-accent-ink shadow-node-lit";

export function PathNode({
  course,
  module,
  state,
  number,
  look,
  blocking,
  entranceDelay,
  justFilled,
}: {
  course: CourseOutline;
  module: ModuleOutline;
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
  const stateWord = { done: "completed", current: "up next", available: "available", locked: "locked", pro: "part of CyberNet Pro" }[look];
  const [sheetOpen, setSheetOpen] = useState(false);
  const { auth, available } = useAuth();
  // A lesson a guest needs a (free) account for: everything but each course's first lesson and the
  // help modules, Pro modules included. Its page shows the sign-up gate. Finished ones stay "done".
  const needsAccount = available && auth.status === "guest" && !lesson.guests && look !== "done";
  // Free accounts open a few new lessons a day (guest lessons never count): say how many are left.
  const { pro, hasPro } = usePro();
  const limited = available && auth.status === "signed-in" && !pro.loading && !hasPro && !lesson.guests;

  // Pro lessons without Pro open the gentle upgrade sheet instead of the popover.
  if (state.needsPro) {
    return (
      <motion.div
        className="relative"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ ...PRESS_SPRING, delay: entranceDelay }}
      >
        <motion.button
          type="button"
          aria-haspopup="dialog"
          aria-label={`${kindLabel}, ${lesson.title}, ${look === "done" ? "completed, " : ""}part of CyberNet Pro`}
          onClick={() => setSheetOpen(true)}
          whileHover={reduceMotion ? undefined : { scale: 1.06 }}
          whileTap={reduceMotion ? undefined : { scale: 0.92 }}
          transition={PRESS_SPRING}
          className={`relative grid ${SIZE[lesson.kind]} place-items-center rounded-node border-4 transition-colors focus-visible:outline-offset-4 ${
            isQuiz && look === "done" ? QUIZ_DONE : LOOK_CLASSES[look]
          }`}
        >
          <NodeGlyph look={look} lesson={lesson} />
          {/* Finished before Pro ended: the check stays, and the Pro badge sits on the other corner. */}
          {look === "done" && <ProBadge size="sm" className="absolute -bottom-1 -left-2 ring-2 ring-canvas" />}
        </motion.button>
        <UpgradeSheet
          title={lesson.title}
          course={course}
          module={module}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          startFirst={snapshot ? !hasFinishedFreeLesson(snapshot, course) : false}
        />
      </motion.div>
    );
  }

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
              {state.status === "in_progress" ? "Continue" : snapshot && !hasCourseProgress(snapshot, course) ? "Start here" : "Start"}
              <span className="absolute top-full left-1/2 -mt-[5px] size-2.5 -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-accent-ink bg-surface" />
            </span>
          </motion.div>
        )}

        <Popover.Trigger asChild>
          <motion.button
            type="button"
            data-current={look === "current" ? "" : undefined}
            aria-label={`${kindLabel}, ${lesson.title}, ${stateWord}${needsAccount ? ", needs a free account" : ""}`}
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
            <NodeGlyph look={look} lesson={lesson} account={needsAccount} />
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
            <p className="mt-1 flex items-start gap-2 text-lead leading-snug font-semibold text-balance">
              {lesson.icon && <LessonIcon name={lesson.icon} className="mt-0.5 size-6 shrink-0 text-ink-muted" />}
              {lesson.title}
            </p>
            <p className="mt-1 text-small text-ink-muted">
              {snapshot ? summary(state, look, snapshot, blocking) : ""}
              {needsAccount && look !== "locked" ? " · free account" : ""}
              {lesson.lastChecked ? ` · checked ${formatChecked(lesson.lastChecked)}` : ""}
            </p>
            {limited && look !== "done" && <LessonsLeftToday lessonId={lesson.id} />}
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
              ) : needsAccount ? (
                <ButtonLink href={`/lesson/${lesson.id}`} className="w-full">
                  <AccountIcon className="size-5" /> Create a free account
                </ButtonLink>
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

/**
 * The badge on a node's corner: a check when done, a lock when locked, the Pro badge (gem and
 * the word, never colour alone) on Pro lessons the learner can't open yet, and a person on free
 * lessons a guest needs an account for (the lock wins while it's also locked by the path).
 */
function StateBadge({ look, size }: { look: "done" | "locked" | "pro" | "account"; size: "lesson" | "quiz" }) {
  if (look === "pro") {
    return <ProBadge size="sm" className="absolute -right-2 -bottom-1 ring-2 ring-canvas" />;
  }
  const box = size === "quiz" ? "size-8" : "size-7";
  const colours = look === "done" ? "border-accent-ink bg-accent text-on-accent" : "border-line-strong bg-surface-raised text-ink-muted";
  return (
    <span className={`absolute -right-1 -bottom-1 grid ${box} place-items-center rounded-node border-2 ring-2 ring-canvas ${colours}`}>
      {look === "done" ? (
        <CheckIcon className="size-4" strokeWidth={2.5} />
      ) : look === "account" ? (
        <AccountIcon className="size-4" />
      ) : (
        <LockIcon className="size-4" />
      )}
    </span>
  );
}

/**
 * What's inside a node. Lessons show their icon in every state (done, current, available and
 * locked differ by fill, ring and badge); the module quiz keeps the network hub.
 */
function NodeGlyph({ look, lesson, account = false }: { look: NodeLook; lesson: LessonOutline; account?: boolean }) {
  const badge = look === "done" || look === "locked" || look === "pro" ? look : account ? "account" : null;
  if (lesson.kind === "quiz") {
    return (
      <>
        <NetworkMark mode={look === "locked" || look === "pro" ? "dim" : "lit"} shield={false} className="size-14" />
        {badge && <StateBadge look={badge} size="quiz" />}
      </>
    );
  }
  const dim = look === "locked" || look === "pro";
  return (
    <>
      {lesson.icon && <LessonIcon name={lesson.icon} className={`size-8 ${dim ? "opacity-70" : ""}`} />}
      {badge && <StateBadge look={badge} size="lesson" />}
    </>
  );
}

/**
 * "2 new lessons left today", for a free account (fetched when the popover opens; display only:
 * the lesson API decides). Nothing when this lesson already counted today, so reopening is free.
 */
function LessonsLeftToday({ lessonId }: { lessonId: string }) {
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    getDailyLessonsAction(lessonId).then(
      (d) => {
        if (live) setLine(d.openedToday ? null : lessonsLeftLine(d));
      },
      (error: unknown) => console.error(error),
    );
    return () => {
      live = false;
    };
  }, [lessonId]);
  if (!line) return null;
  return <p className="mt-1 text-small text-ink-muted">{line}</p>;
}
