import "server-only";
import { cache } from "react";
import { buildContentIndex, type ContentIndex } from "@/lib/progress/authority";
import { loadContent } from "./load";
import type { CourseOutline, Lesson } from "./schema";

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

export function getAllLessonIds(): string[] {
  return [...getContent().lessons.keys()];
}

/** Lesson facts the server uses to award XP and grade quizzes (see progress/authority.ts). */
export const getContentIndex = cache((): ContentIndex => buildContentIndex(getContent().lessons.values()));
