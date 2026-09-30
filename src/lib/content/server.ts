import "server-only";
import { cache } from "react";
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
