"use client";

import * as Popover from "@radix-ui/react-popover";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getDailyLessonsAction } from "@/app/actions/pro";
import { ProBadge } from "@/components/pro/ProBadge";
import { AccountIcon, CheckIcon, LessonIcon, LessonMenuIcon, LockIcon } from "@/components/ui/icons";
import { NetworkMark } from "@/components/network/NetworkMark";
import { XpPill } from "@/components/XpPill";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { CourseOutline } from "@/lib/content/schema";
import { POPOVER_SPRING } from "@/lib/motion";
import { lessonsLeftLine } from "@/lib/pro/dailyLimit";
import { usePro } from "@/lib/pro/ProProvider";
import { moduleNav } from "@/lib/progress/lessonNav";
import { useProgress } from "@/lib/progress/ProgressProvider";

/**
 * The lesson header's menu: this module's lessons with their state (done, you're here, locked,
 * needs a free account, Pro), each a link to its page, which applies the guest gate, the daily
 * limit and Pro as usual. Free accounts see how many new lessons are left today.
 */
export function LessonMenu({ course, lessonId }: { course: CourseOutline; lessonId: string }) {
  const reduceMotion = useReducedMotion();
  const { snapshot } = useProgress();
  const { auth, available } = useAuth();
  const { pro, hasPro } = usePro();
  const [open, setOpen] = useState(false);
  const guest = !available || auth.status === "guest";
  const nav = snapshot ? moduleNav(snapshot, course, lessonId, { guest, accounts: available, proOpen: hasPro || available }) : null;
  const limited = available && auth.status === "signed-in" && !pro.loading && !hasPro;
  if (!nav) return null;
  const moduleNumber = course.modules.indexOf(nav.module) + 1;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Lessons in module ${moduleNumber}`}
          title="This module's lessons"
          className="grid size-11 shrink-0 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink active:bg-surface-raised"
        >
          <LessonMenuIcon className="size-5" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="bottom" align="end" sideOffset={8} collisionPadding={16} className="z-40 w-[min(22rem,calc(100vw-2rem))] outline-none">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={POPOVER_SPRING}
            style={{ transformOrigin: "var(--radix-popover-content-transform-origin)" }}
            className="max-h-[min(32rem,calc(100dvh-6rem))] overflow-y-auto rounded-card border border-line-strong bg-surface p-4 shadow-lift"
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-caption tracking-widest text-ink-faint uppercase">Module {moduleNumber}</p>
                <p className="truncate font-semibold">{nav.module.title}</p>
              </div>
              {/* XP lives here on narrow phones (the header has no room for it). */}
              <span className="min-[400px]:hidden">
                <XpPill />
              </span>
            </div>
            {limited && <LessonsLeft lessonId={lessonId} />}
            <ol className="mt-3 grid gap-1">
              {nav.rows.map((row) => {
                const { lesson } = row;
                const kind = lesson.kind === "quiz" ? "Module quiz" : null;
                const note =
                  row.state === "here"
                    ? "You're here"
                    : row.state === "done"
                      ? "Done"
                      : row.state === "locked"
                        ? row.blockedBy
                          ? `Finish “${row.blockedBy.title}” first`
                          : "Locked"
                        : row.needsAccount
                          ? "Free account"
                          : row.needsPro
                            ? "Part of Pro"
                            : kind;
                const icon =
                  row.state === "done" ? (
                    <CheckIcon className="size-4" />
                  ) : row.state === "locked" ? (
                    <LockIcon className="size-4" />
                  ) : row.needsAccount ? (
                    <AccountIcon className="size-4" />
                  ) : lesson.kind === "quiz" ? (
                    <NetworkMark mode="dim" className="size-4" />
                  ) : lesson.icon ? (
                    <LessonIcon name={lesson.icon} className="size-4" />
                  ) : null;
                const body = (
                  <>
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-node border-2 ${
                        row.state === "here"
                          ? "border-accent-ink bg-accent text-on-accent"
                          : row.state === "done"
                            ? "border-accent-ink bg-accent-soft text-accent-ink"
                            : row.state === "locked"
                              ? "border-line text-ink-faint"
                              : "border-accent-ink text-accent-ink"
                      }`}
                    >
                      {icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate font-semibold ${row.state === "locked" ? "text-ink-muted" : "text-ink"}`}>{lesson.title}</span>
                      {note && <span className="block truncate text-small text-ink-muted">{note}</span>}
                    </span>
                    {row.needsPro && <ProBadge size="sm" />}
                  </>
                );
                const rowClass = "flex min-h-12 items-center gap-3 rounded-control px-2 py-1.5";
                return (
                  <li key={lesson.id}>
                    {row.state === "here" ? (
                      <button type="button" aria-current="page" onClick={() => setOpen(false)} className={`${rowClass} w-full bg-surface-raised text-left`}>
                        {body}
                      </button>
                    ) : row.state === "locked" ? (
                      <div aria-disabled="true" className={rowClass}>
                        {body}
                      </div>
                    ) : (
                      <Link href={`/lesson/${lesson.id}`} onClick={() => setOpen(false)} className={`${rowClass} transition-colors hover:bg-surface-raised`}>
                        {body}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
            <Link href={`/course/${course.id}`} className="mt-3 flex min-h-11 items-center justify-center rounded-control text-small font-semibold text-accent-ink hover:bg-surface-raised">
              Course path
            </Link>
            <Popover.Arrow className="fill-surface" />
          </motion.div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** "2 new lessons left today", for a free account (display only: the lesson API decides). */
function LessonsLeft({ lessonId }: { lessonId: string }) {
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    getDailyLessonsAction(lessonId).then(
      (d) => live && setLine(lessonsLeftLine(d)),
      (error: unknown) => console.error(error),
    );
    return () => {
      live = false;
    };
  }, [lessonId]);
  return line ? <p className="mt-2 rounded-control bg-surface-raised px-3 py-2 text-small text-ink-muted">{line}</p> : null;
}
