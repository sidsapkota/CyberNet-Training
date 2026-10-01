import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DevFit } from "@/dev/DevFit";
import { getCourses, getLesson } from "@/lib/content/server";

// Dev-only route (the `.dev.tsx` extension is only registered under `next dev`): any card of any
// lesson in the real lesson player, for the fit audit (scripts/e2e/fit-audit.mjs).
export const metadata: Metadata = { title: "Fit check (dev)", robots: { index: false, follow: false } };

export default async function DevFitPage({ searchParams }: { searchParams: Promise<{ lesson?: string; card?: string }> }) {
  const { lesson: id, card } = await searchParams;
  const lesson = id ? getLesson(id) : undefined;
  const course = getCourses().find((c) => c.id === lesson?.courseId);
  if (!lesson || !course) notFound();
  return <DevFit lesson={lesson} course={course} index={Math.max(0, Math.min(Number(card ?? 0), lesson.cards.length - 1))} />;
}
