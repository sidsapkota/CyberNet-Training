import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Feed, type FeedByte } from "@/components/feed/Feed";
import { getCourses } from "@/lib/content/server";
import { feedAllowed } from "@/lib/feed/config";
import { getBytes } from "@/lib/feed/server";

export const metadata: Metadata = {
  title: "Feed",
  description: "Quick, hands-on bytes of tech: one surprising fact, one tap, the answer. Free, no account needed to start.",
  alternates: { canonical: "/feed" },
};

/** The Feed: today's 3 bytes, then the next lesson (docs/plans/feed.md). Behind FEED_ENABLED. */
export default async function FeedPage({ searchParams }: PageProps<"/feed">) {
  const { feed, start } = await searchParams;
  if (!feedAllowed(feed)) notFound();
  const courses = getCourses();
  const courseTitle = new Map(courses.map((c) => [c.id, c.title]));
  const bytes: FeedByte[] = getBytes().map((b) => ({
    id: b.id,
    hook: b.hook,
    rare: Boolean(b.rare),
    courseId: b.courseId,
    courseTitle: courseTitle.get(b.courseId) ?? "",
    lessonId: b.lesson,
    lessonTitle: b.lessonTitle,
    card: b.card,
  }));
  return <Feed bytes={bytes} courses={courses} start={typeof start === "string" ? start : null} />;
}
