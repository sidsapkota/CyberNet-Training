import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VideoByte } from "@/components/feed/VideoByte";
import { getCourses } from "@/lib/content/server";
import { feedAllowed } from "@/lib/feed/config";
import { getByte } from "@/lib/feed/server";

export const metadata: Metadata = { title: "Byte video", robots: { index: false, follow: false } };

/** A byte as a 9:16 video to screen-record (docs/plans/feed.md). Not linked anywhere. */
export default async function ByteVideoPage({ params, searchParams }: PageProps<"/feed/video/[id]">) {
  const [{ id }, { feed }] = await Promise.all([params, searchParams]);
  const byte = getByte(id);
  if (!feedAllowed(feed) || !byte) notFound();
  const course = getCourses().find((c) => c.id === byte.courseId);
  return <VideoByte hook={byte.hook} courseTitle={course?.title ?? ""} rare={Boolean(byte.rare)} card={byte.card} />;
}
