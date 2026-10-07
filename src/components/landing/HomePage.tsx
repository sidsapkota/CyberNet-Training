import { Dashboard } from "@/components/dashboard/Dashboard";
import { estimateMinutes } from "@/lib/content/estimate";
import { getCourses } from "@/lib/content/server";
import type { ByteForView } from "@/components/feed/ByteView";
import { FEED_ENABLED } from "@/lib/feed/config";
import { HERO_BYTE } from "@/lib/feed/rules";
import { getByte } from "@/lib/feed/server";
import { HomeSwitch } from "./HomeSwitch";
import { Landing } from "./Landing";

/** `/` (and the `/from/<platform>` video links): the landing page, or the dashboard for returning learners. */
export function HomePage() {
  const courses = getCourses();
  const lessons = courses.flatMap((c) => c.modules.flatMap((m) => m.lessons)).filter((l) => l.kind === "lesson");
  const minutes = lessons.map(estimateMinutes).sort((a, b) => a - b);
  const median = minutes[Math.floor(minutes.length / 2)] ?? 8;
  const firstLesson = courses[0]?.modules[0]?.lessons[0];
  // With the Feed on, new visitors' first screen is a live byte (docs/plans/feed.md).
  const byte = FEED_ENABLED ? getByte(HERO_BYTE) : undefined;
  const heroByte: ByteForView | undefined = byte && {
    id: byte.id,
    hook: byte.hook,
    rare: Boolean(byte.rare),
    courseTitle: courses.find((c) => c.id === byte.courseId)?.title ?? "",
    lessonId: byte.lesson,
    lessonTitle: byte.lessonTitle,
    card: byte.card,
  };

  return (
    <HomeSwitch
      landing={<Landing courses={courses} firstLessonId={firstLesson?.id ?? ""} lessonMinutes={median} heroByte={heroByte} />}
      dashboard={
        <main className="mx-auto max-w-wide px-gutter py-6 sm:py-10">
          <Dashboard courses={courses} />
        </main>
      }
    />
  );
}
