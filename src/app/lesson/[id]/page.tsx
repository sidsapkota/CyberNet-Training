import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/player/LessonPlayer";
import { getAllLessonIds, getCourses, getLesson, getLessonPage } from "@/lib/content/server";

// Every lesson is known at build time; unknown ids are a 404. Pro lessons are built as a shell
// (title only): their cards come from /api/lessons/[id] after the server checks entitlement.
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllLessonIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps<"/lesson/[id]">): Promise<Metadata> {
  const { id } = await params;
  const lesson = getLesson(id);
  const course = getCourses().find((c) => c.id === lesson?.courseId);
  if (!lesson || !course) return { title: "Lesson not found" };
  const description =
    lesson.access === "free"
      ? `A free, hands-on lesson from ${course.title}. No sign-up needed.`
      : `A hands-on lesson from ${course.title}, part of CyberNet Pro.`;
  // The preview image is the course's (see ./opengraph-image.tsx), so a video's link shows the course.
  return {
    title: `${lesson.title} (${course.title})`,
    description,
    alternates: { canonical: `/lesson/${lesson.id}` },
    openGraph: { title: lesson.title, description, url: `/lesson/${lesson.id}` },
  };
}

export default async function LessonPage({ params }: PageProps<"/lesson/[id]">) {
  const { id } = await params;
  const page = getLessonPage(id);
  if (!page) notFound();
  return <LessonPlayer lesson={page.lesson} outline={page.outline} course={page.course} />;
}
