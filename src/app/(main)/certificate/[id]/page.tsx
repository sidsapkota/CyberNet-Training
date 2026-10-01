import type { Metadata } from "next";
import { CertificateView } from "@/components/certificates/CertificateView";
import { NetworkMark } from "@/components/network/NetworkMark";
import { normaliseCertificateId } from "@/lib/certificates/certificates";
import { getCourses } from "@/lib/content/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The public verification page for a certificate. It shows only what verify_certificate()
 * returns (the name, course and date) plus the ID; never an account, email or anything else.
 * Unknown and revoked IDs look the same. Not indexed (learners can be 13).
 */
export const metadata: Metadata = { title: "Certificate check", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

async function lookUp(id: string): Promise<{ name: string; courseTitle: string; completedOn: string } | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("verify_certificate", { p_id: id });
    const row = !error ? data?.[0] : undefined;
    const course = row ? getCourses().find((c) => c.id === row.course_id) : undefined;
    return row && course ? { name: row.name, courseTitle: course.title, completedOn: row.completed_on } : null;
  } catch {
    return null; // no Supabase settings on this copy: nothing can be verified
  }
}

export default async function CertificatePage({ params }: PageProps<"/certificate/[id]">) {
  const id = normaliseCertificateId((await params).id);
  const cert = id ? await lookUp(id) : null;
  return (
    <main className="mx-auto max-w-lesson px-gutter py-8 sm:py-12">
      {cert && id ? (
        <>
          <p className="font-mono text-caption tracking-widest text-success uppercase">Valid certificate</p>
          <h1 className="mt-1 text-title font-semibold">This certificate is genuine</h1>
          <p className="mt-2 text-ink-muted">It was issued by CyberNet Training and hasn&apos;t been withdrawn.</p>
          <div className="mt-6">
            <CertificateView name={cert.name} courseTitle={cert.courseTitle} completedOn={cert.completedOn} id={id} />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center py-10 text-center">
          <NetworkMark mode="dim" className="size-20" />
          <h1 className="mt-6 text-title font-semibold">This certificate isn&apos;t valid</h1>
          <p className="mt-2 max-w-sm text-ink-muted">The ID may be mistyped, or its owner has withdrawn it.</p>
        </div>
      )}
    </main>
  );
}
