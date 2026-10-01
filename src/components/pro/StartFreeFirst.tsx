"use client";

import Link from "next/link";
import { Mascot } from "@/components/mascot/Mascot";
import { Button, ButtonLink } from "@/components/ui/Button";
import { LessonIcon, PlayIcon } from "@/components/ui/icons";
import type { CourseOutline, ModuleOutline } from "@/lib/content/schema";
import { startingLesson } from "@/lib/progress/state";
import { ProBadge } from "./ProBadge";

/**
 * Shown instead of the paywall when someone taps a Pro module before finishing any free lesson in
 * the course: the free start is the better first step, and the honest one. One button into the
 * course's first lesson; "Not now" closes; a quiet link to Pro for anyone who wants it anyway.
 */
export function StartFreeFirst({
  course,
  module,
  headingLevel = 2,
  onClose,
}: {
  course: CourseOutline;
  module: ModuleOutline;
  headingLevel?: 1 | 2;
  /** "Not now": closes the sheet; without it, links back to the course path. */
  onClose?: () => void;
}) {
  const first = startingLesson(course);
  const Heading = headingLevel === 1 ? "h1" : "h2";
  if (!first) return null;
  return (
    <section aria-labelledby={`start-free-${module.id}`} className="mx-auto flex w-full max-w-sm flex-col items-center text-center">
      {headingLevel === 1 && <Mascot expression="presenting" size={130} idle />}
      <Heading id={`start-free-${module.id}`} className={`font-semibold text-balance ${headingLevel === 1 ? "mt-5 text-title" : "text-lead"}`}>
        Start with the free lessons first
      </Heading>
      <p className="mt-2 text-ink-muted">
        <span className="inline-flex items-center gap-1.5 align-middle">
          <strong className="font-semibold text-ink">{module.title}</strong> <ProBadge size="sm" />
        </span>{" "}
        comes later in {course.title}. The first lessons are free, and they set it up.
      </p>
      <div className="mt-6 flex w-full flex-col gap-2">
        <ButtonLink href={`/lesson/${first.id}`}>
          {first.icon ? <LessonIcon name={first.icon} className="size-5" /> : <PlayIcon className="size-5" />} Start “{first.title}”
        </ButtonLink>
        {onClose ? (
          <Button variant="ghost" onClick={onClose}>
            Not now
          </Button>
        ) : (
          <ButtonLink href={`/course/${course.id}`} variant="ghost">
            Not now
          </ButtonLink>
        )}
      </div>
      <Link href="/pro" className="mt-3 inline-flex min-h-11 items-center text-small text-ink-muted underline-offset-2 hover:text-ink hover:underline">
        See what&apos;s in CyberNet Pro
      </Link>
    </section>
  );
}
