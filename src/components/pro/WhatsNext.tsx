"use client";

import { useEffect } from "react";
import type { CourseOutline, ModuleOutline } from "@/lib/content/schema";
import { ProPitch } from "./ProPitch";
import { TeaserCard } from "./TeaserCard";

/** The course the learner was looking at when they decided to upgrade (sessionStorage). */
export const UPGRADE_COURSE_KEY = "cybernet.upgradeCourse";

/**
 * The paywall moment, told honestly: the Pro pitch (one screen, the button in view), with the next
 * module named and its sample card behind a small "Try a sample" link. No timers, no "last chance",
 * no guilt; "Not now" is always there. Shown for Pro lessons where Pro is still needed.
 */
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
  useEffect(() => {
    // So /pro/welcome can send the learner back to this course.
    try {
      sessionStorage.setItem(UPGRADE_COURSE_KEY, course.id);
    } catch {
      // storage blocked: the welcome screen links to all courses instead
    }
  }, [course.id]);

  return (
    <ProPitch
      headline="Go unlimited with Pro"
      sub={`Next up: ${module.title}`}
      track={{ course: course.id }}
      headingLevel={headingLevel}
      declineSource="paywall"
      notNow={onClose ? { onClick: onClose } : { href: `/course/${course.id}` }}
      sample={module.teaser ? <TeaserCard card={module.teaser} courseId={course.id} /> : undefined}
    />
  );
}
