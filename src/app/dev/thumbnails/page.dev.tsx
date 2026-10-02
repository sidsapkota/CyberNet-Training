import type { Metadata } from "next";
import { CourseCard } from "@/components/course/CourseCard";
import { getCourses } from "@/lib/content/server";

// Dev-only route: the four course cards side by side (thumbnail art, level dots and progress bar
// in each course's colour), for review screenshots. Hover or tap a card to see its one move.
export const metadata: Metadata = { title: "Course thumbnails (dev)", robots: { index: false, follow: false } };

export default function DevThumbnailsPage() {
  const courses = getCourses();
  return (
    <main className="mx-auto max-w-[96rem] px-gutter py-8">
      <h1 className="text-headline font-semibold">Course thumbnails</h1>
      <div data-shot="cards" className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </main>
  );
}
