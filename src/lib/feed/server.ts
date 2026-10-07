import "server-only";
import { cache } from "react";
import { getAllLessonIds, getLesson } from "@/lib/content/server";
import type { Lesson } from "@/lib/content/schema";
import { type Byte, loadBytes } from "./bytes";

/** Every byte, checked against the loaded lessons (once per server process). */
export const getBytes = cache((): Byte[] => {
  const lessons = new Map<string, Lesson>();
  for (const id of getAllLessonIds()) {
    const lesson = getLesson(id);
    if (lesson) lessons.set(id, lesson);
  }
  return loadBytes(lessons);
});

export function getByte(id: string): Byte | undefined {
  return getBytes().find((b) => b.id === id);
}
