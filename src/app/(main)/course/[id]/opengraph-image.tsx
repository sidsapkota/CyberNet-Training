import { getCourses } from "@/lib/content/server";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og";

export const alt = "A free, hands-on course from CyberNet Training";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return getCourses().map((course) => ({ id: course.id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return renderCourseImage(id);
}

/** A course's preview. Lesson pages use it too, so links to a lesson show its course. */
export function renderCourseImage(courseId: string) {
  const course = getCourses().find((c) => c.id === courseId);
  const lessons = course?.modules.flatMap((m) => m.lessons).filter((l) => l.kind === "lesson").length ?? 0;
  return renderOgImage({
    eyebrow: `Free course · ${lessons} lessons`,
    title: course?.title ?? "CyberNet Training",
    subtitle: course?.description ?? "Short, hands-on lessons.",
    mascot: "presenting",
  });
}
