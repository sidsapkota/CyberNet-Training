import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { NotSignedInError } from "@/lib/auth/verify";
import { normaliseCertificateId } from "@/lib/certificates/certificates";
import { renderCertificatePdf } from "@/lib/certificates/pdf";
import { ownCertificate } from "@/lib/certificates/server";
import { getCourses } from "@/lib/content/server";

/**
 * The certificate PDF, for its owner only (a valid certificate they hold). Everything printed
 * comes from the database and the content, never from the request. Never cached.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRIVATE = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, { params }: RouteContext<"/api/certificates/[id]/pdf">) {
  const id = normaliseCertificateId((await params).id);
  if (!id) return NextResponse.json({ error: "Not found" }, { status: 404, headers: PRIVATE });
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof NotSignedInError) return NextResponse.json({ error: "Sign in first" }, { status: 401, headers: PRIVATE });
    throw error;
  }
  const cert = await ownCertificate(user.id, id);
  const course = cert ? getCourses().find((c) => c.id === cert.courseId) : undefined;
  if (!cert || !course) return NextResponse.json({ error: "Not found" }, { status: 404, headers: PRIVATE });
  const pdf = await renderCertificatePdf({ id: cert.id, name: cert.name, courseTitle: course.title, completedOn: cert.completedOn });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      ...PRIVATE,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cybernet-certificate-${course.id}.pdf"`,
    },
  });
}
