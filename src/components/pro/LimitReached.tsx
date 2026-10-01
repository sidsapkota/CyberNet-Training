"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";
import type { CourseOutline } from "@/lib/content/schema";
import { DAILY_LESSON_LIMIT } from "@/lib/pro/dailyLimit";
import { ProPitch } from "./ProPitch";
import { UPGRADE_COURSE_KEY } from "./WhatsNext";

/**
 * A free account has opened today's new lessons. Said plainly, with no timers or guilt: come back
 * tomorrow, or go unlimited with Pro. "Not now" goes back to the course path, where replays and the
 * help lessons stay open.
 */
export function LimitReached({ lessonId, course }: { lessonId: string; course: CourseOutline }) {
  const viewed = useRef(false);

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    trackEvent("limit_reached", lessonId);
    try {
      sessionStorage.setItem(UPGRADE_COURSE_KEY, course.id);
    } catch {
      // storage blocked: the welcome screen links to all courses instead
    }
  }, [lessonId, course.id]);

  return (
    <ProPitch
      headline={`You've done ${DAILY_LESSON_LIMIT} lessons today.`}
      sub="Come back tomorrow, or go unlimited with Pro."
      track={lessonId}
      notNow={{ href: `/course/${course.id}` }}
    />
  );
}
