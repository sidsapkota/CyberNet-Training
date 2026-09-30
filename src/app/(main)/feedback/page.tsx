import type { Metadata } from "next";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";
import { getCourses } from "@/lib/content/server";
import { feedbackLesson } from "@/lib/feedback-form";

export const metadata: Metadata = { title: "Send feedback", robots: { index: false } };

export default async function FeedbackPage({ searchParams }: PageProps<"/feedback">) {
  const { lesson } = await searchParams;
  const lessons = getCourses().flatMap((c) => c.modules.flatMap((m) => m.lessons.map((l) => ({ id: l.id, title: l.title }))));
  return (
    <main className="mx-auto max-w-lesson px-gutter py-8 sm:py-12">
      <h1 className="text-headline font-semibold">Send feedback</h1>
      <p className="mt-2 text-body text-ink-muted">Found a mistake, or have an idea? Tell us.</p>
      <div className="mt-8">
        <FeedbackForm lessons={lessons} initialLesson={feedbackLesson(lesson, lessons.map((l) => l.id))} />
      </div>
    </main>
  );
}
