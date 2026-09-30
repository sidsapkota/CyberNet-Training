import type { Metadata } from "next";
import { CourseCatalog } from "@/components/course/CourseCatalog";
import { getCourses } from "@/lib/content/server";

export const metadata: Metadata = { title: "Courses" };

export default function CoursesPage() {
  return (
    <main className="mx-auto max-w-wide px-gutter py-6 sm:py-10">
      <h1 className="text-headline font-semibold">Courses</h1>
      <CourseCatalog courses={getCourses()} />
    </main>
  );
}
