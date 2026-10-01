import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CertificateFlow } from "@/components/certificates/CertificateFlow";
import { signedInUserId } from "@/lib/auth/session";
import { getCourses } from "@/lib/content/server";

export const metadata: Metadata = { title: "Your certificate", robots: { index: false } };
export const dynamic = "force-dynamic";

/** The certificate step at the end of a course (signed in; certificates belong to an account). */
export default async function CourseCertificatePage({ params }: PageProps<"/course/[id]/certificate">) {
  const { id } = await params;
  const course = getCourses().find((c) => c.id === id);
  if (!course) notFound();
  if (!(await signedInUserId())) redirect(`/login?next=/course/${course.id}/certificate`);
  return (
    <main className="mx-auto max-w-lesson px-gutter py-8 sm:py-12">
      <CertificateFlow courseId={course.id} courseTitle={course.title} />
    </main>
  );
}
