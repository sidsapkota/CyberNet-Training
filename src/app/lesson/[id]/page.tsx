import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/player/LessonPlayer";
import { getAllLessonIds, getCourses, getLesson } from "@/lib/content/server";

// Every lesson is known at build time; unknown ids are a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllLessonIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps<"/lesson/[id]">): Promise<Metadata> {
  const { id } = await params;
  const lesson = getLesson(id);
  return { title: lesson?.title ?? "Lesson not found" };
}

export default async function LessonPage({ params }: PageProps<"/lesson/[id]">) {
  const { id } = await params;
  const lesson = getLesson(id);
  const course = getCourses().find((c) => c.id === lesson?.courseId);
  if (!lesson || !course) notFound();

  return <LessonPlayer lesson={lesson} course={course} />;
}
