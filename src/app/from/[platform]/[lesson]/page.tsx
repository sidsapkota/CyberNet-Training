import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/player/LessonPlayer";
import { cleanSource } from "@/lib/analytics";
import { getCourses, getLesson } from "@/lib/content/server";

/**
 * Tagged lesson links for videos: cybernettrainer.com/from/tiktok/<lesson-id> plays that lesson
 * straight away (it's the same player as /lesson/<id>), and the page view records the platform.
 */
export async function generateMetadata({ params }: PageProps<"/from/[platform]/[lesson]">): Promise<Metadata> {
  const { lesson: id } = await params;
  const lesson = getLesson(id);
  return {
    title: lesson?.title ?? "Lesson not found",
    alternates: { canonical: `/lesson/${id}` },
    robots: { index: false, follow: true },
  };
}

export default async function FromPlatformLesson({ params }: PageProps<"/from/[platform]/[lesson]">) {
  const { platform, lesson: id } = await params;
  const lesson = getLesson(id);
  const course = getCourses().find((c) => c.id === lesson?.courseId);
  if (!cleanSource(platform) || !lesson || !course) notFound();
  return <LessonPlayer lesson={lesson} course={course} />;
}
