"use client";

import { useEffect, useRef } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { LessonIcon, SignInIcon } from "@/components/ui/icons";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { CourseOutline, ModuleOutline } from "@/lib/content/schema";
import { usePro } from "@/lib/pro/ProProvider";
import { ProBadge } from "./ProBadge";
import { TeaserCard } from "./TeaserCard";

/**
 * The paywall moment, told honestly: what the next (Pro) module covers, one card from it to try,
 * and one clear way in. No timers, no "last chance", no guilt; "Not now" is always there. Shown on
 * the course path (Pro nodes), on a Pro lesson's page, and after the last free module's quiz.
 */
/** The course the learner was looking at when they decided to upgrade (sessionStorage). */
export const UPGRADE_COURSE_KEY = "cybernet.upgradeCourse";

export function WhatsNext({
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
  const { auth, available } = useAuth();
  const { pro } = usePro();
  const signedIn = available && auth.status === "signed-in";
  const trial = !signedIn || pro.loading || pro.trialEligible;
  const lessons = module.lessons.filter((l) => l.kind === "lesson");
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const viewed = useRef(false);

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    trackEvent("paywall_viewed", { course: course.id });
    // So /pro/welcome can send the learner back to this course, where the Pro nodes light up.
    try {
      sessionStorage.setItem(UPGRADE_COURSE_KEY, course.id);
    } catch {
      // storage blocked: the welcome screen links to all courses instead
    }
  }, [course.id]);

  return (
    <div className="text-left">
      <div className="flex items-center gap-2">
        <ProBadge />
        <p className="font-mono text-caption tracking-widest text-ink-faint uppercase">What&apos;s next</p>
      </div>
      <Heading className="mt-2 text-title font-semibold text-balance">{module.title}</Heading>
      <p className="mt-1 text-ink-muted">{module.description}</p>

      <ul aria-label={`Lessons in ${module.title}`} className="mt-4 space-y-1.5">
        {lessons.map((lesson) => (
          <li key={lesson.id} className="flex items-center gap-3 rounded-control bg-surface-raised px-3 py-2.5">
            {lesson.icon && <LessonIcon name={lesson.icon} className="size-5 shrink-0 text-ink-muted" />}
            <span className="font-semibold">{lesson.title}</span>
          </li>
        ))}
      </ul>

      {module.teaser && (
        <div className="mt-5">
          <TeaserCard card={module.teaser} courseId={course.id} />
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {signedIn ? (
          <ButtonLink href="/pro">
            {trial ? "Start your 7-day free trial" : "Upgrade to Pro"}
          </ButtonLink>
        ) : (
          <ButtonLink href="/login?next=/pro">
            <SignInIcon className="size-5" /> Sign in to start your free trial
          </ButtonLink>
        )}
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
      <p className="mt-3 text-center text-small text-ink-muted">Ask a parent or guardian before subscribing.</p>
      <p className="mt-1 text-center text-caption text-ink-faint">The first module of every course stays free, and your progress is always kept.</p>
    </div>
  );
}
