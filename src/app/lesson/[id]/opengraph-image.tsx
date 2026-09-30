import { renderCourseImage } from "@/app/(main)/course/[id]/opengraph-image";
import { getAllLessonIds, getLesson } from "@/lib/content/server";
import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const alt = "A free, hands-on lesson from CyberNet Training";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return getAllLessonIds().map((id) => ({ id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return renderCourseImage(getLesson(id)?.courseId ?? "");
}
