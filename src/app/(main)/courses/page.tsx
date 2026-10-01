import type { Metadata } from "next";
import { CourseCatalog } from "@/components/course/CourseCatalog";
import { getCourses } from "@/lib/content/server";
import { AUDIENCE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Courses",
  description: `Four hands-on courses, from Easy to Hard: devices, staying safe online, AI and the internet. ${AUDIENCE}`,
};

export default function CoursesPage() {
  return (
    <main className="mx-auto max-w-wide px-gutter py-6 sm:py-10">
      <h1 className="text-headline font-semibold">Courses</h1>
      <p className="mt-1 text-ink-muted">{AUDIENCE}</p>
      <CourseCatalog courses={getCourses()} />
    </main>
  );
}
