import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoursePath } from "@/components/course/CoursePath";
import { getCourses } from "@/lib/content/server";

// Every course is known at build time; unknown ids are a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getCourses().map((course) => ({ id: course.id }));
}

export async function generateMetadata({ params }: PageProps<"/course/[id]">): Promise<Metadata> {
  const { id } = await params;
  const course = getCourses().find((c) => c.id === id);
  if (!course) return { title: "Course not found" };
  return {
    title: course.title,
    description: course.description,
    alternates: { canonical: `/course/${course.id}` },
    openGraph: { title: course.title, description: course.description, url: `/course/${course.id}` },
  };
}

export default async function CoursePage({ params }: PageProps<"/course/[id]">) {
  const { id } = await params;
  const course = getCourses().find((c) => c.id === id);
  if (!course) notFound();

  return (
    <main className="mx-auto max-w-wide px-gutter py-6 sm:py-10">
      <CoursePath course={course} />
    </main>
  );
}
