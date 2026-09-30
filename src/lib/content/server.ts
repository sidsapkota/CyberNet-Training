import "server-only";
import { cache } from "react";
import { buildContentIndex, type ContentIndex } from "@/lib/progress/authority";
import { loadContent } from "./load";
import { publicLesson } from "@/lib/pro/access";
import { type CourseOutline, type Lesson, type LessonOutline, toLessonOutline } from "./schema";

/**
 * Server-side content access for pages. Reads and validates everything once per
 * request (so edits show up in dev); invalid content throws and fails the build.
 */
const getContent = cache(() => loadContent());

export function getCourses(): CourseOutline[] {
  return getContent().courses;
}

export function getLesson(id: string): Lesson | undefined {
  return getContent().lessons.get(id);
}

/**
 * What a lesson page may render: its outline always, and the full lesson only if it's free. Pro
 * lessons come from /api/lessons/[id] after an entitlement check, never from the page itself.
 */
export function getLessonPage(id: string): { outline: LessonOutline; lesson: Lesson | null; course: CourseOutline } | undefined {
  const lesson = getLesson(id);
  const course = getCourses().find((c) => c.id === lesson?.courseId);
  if (!lesson || !course) return undefined;
  return { outline: toLessonOutline(lesson), lesson: publicLesson(lesson), course };
}

export function getAllLessonIds(): string[] {
  return [...getContent().lessons.keys()];
}

/** Lesson facts the server uses to award XP and grade quizzes (see progress/authority.ts). */
export const getContentIndex = cache((): ContentIndex => buildContentIndex(getContent().lessons.values()));
