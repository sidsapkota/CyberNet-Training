import type { Metadata } from "next";
import Link from "next/link";
import { DevLesson } from "@/dev/DevLesson";
import { getCourses, getLesson } from "@/lib/content/server";

// Dev-only route (`.dev.tsx` is only a route under `next dev` and on Vercel previews): plays any real
// lesson or quiz from the start with throwaway in-memory progress, so a rebuilt course can be tried
// end to end without an account or a database. Nothing is saved anywhere.
export const metadata: Metadata = { title: "Lesson preview (dev)", robots: { index: false, follow: false } };

export default async function DevLessonsPage({ searchParams }: { searchParams: Promise<{ lesson?: string; course?: string }> }) {
  const { lesson: id, course: courseId = "stay-safe-online" } = await searchParams;
  const lesson = id ? getLesson(id) : undefined;
  const courses = getCourses();
  if (lesson) {
    const course = courses.find((c) => c.id === lesson.courseId)!;
    return <DevLesson lesson={lesson} course={course} />;
  }
  const course = courses.find((c) => c.id === courseId) ?? courses[0]!;
  return (
    <main className="mx-auto max-w-page px-gutter py-10">
      <p className="font-mono text-caption tracking-widest text-warning uppercase">Dev only · nothing is saved</p>
      <h1 className="mt-2 text-headline font-semibold">{course.title}: lesson preview</h1>
      <p className="mt-2 text-ink-muted">Every lesson plays from the start with throwaway progress. Rebuilt lessons are marked.</p>
      {course.modules.map((m) => (
        <section key={m.id} className="mt-6">
          <h2 className="text-lead font-semibold">{m.title}</h2>
          <ul className="mt-2 grid gap-1">
            {m.lessons.map((l) => {
              const full = getLesson(l.id);
              const rebuilt = full?.kind === "lesson" && full.blueprint !== undefined;
              return (
                <li key={l.id}>
                  <Link href={`/dev/lessons?lesson=${l.id}`} className="inline-flex min-h-11 items-center gap-2 font-semibold text-accent-ink underline-offset-2 hover:underline">
                    {l.title}
                    {rebuilt && <span className="rounded-sm border border-accent-ink px-1.5 font-mono text-caption">Blueprint v1.1</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
