"use server";

/**
 * Certificate actions. The user always comes from the verified session; course ids and names are
 * checked on the server, and the date comes from the server-graded course final.
 */
import { z } from "zod";
import { requireUser, requireUserId } from "@/lib/auth/server";
import { CERTIFICATE_ID } from "@/lib/certificates/certificates";
import { type Certificate, currentCertificate, firstFinalPass, type IssueResult, issueCertificate, revokeCertificate } from "@/lib/certificates/server";
import { getCourses } from "@/lib/content/server";
import { getEntitlement } from "@/lib/pro/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const CourseId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(120);

export interface CertificateStatus {
  passedFinal: boolean;
  hasPro: boolean;
  certificate: Certificate | null;
}

export async function getCertificateStatusAction(courseId: string): Promise<CertificateStatus> {
  const user = await requireUser();
  const id = CourseId.parse(courseId);
  if (!getCourses().some((c) => c.id === id)) throw new Error("Unknown course.");
  // No suggested name: the name on a certificate is chosen at issue (a username isn't a real name).
  const [passedAt, entitlement, certificate] = await Promise.all([firstFinalPass(user.id, id), getEntitlement(user), currentCertificate(user.id, id)]);
  return { passedFinal: passedAt !== null, hasPro: entitlement.hasPro, certificate };
}

export async function issueCertificateAction(courseId: string, name: string): Promise<IssueResult> {
  const user = await requireUser();
  const id = CourseId.parse(courseId);
  if (!getCourses().some((c) => c.id === id)) return { ok: false, error: "Unknown course." };
  return issueCertificate(user, id, z.string().max(200).parse(name));
}

export async function revokeCertificateAction(certificateId: string): Promise<void> {
  const userId = await requireUserId();
  await revokeCertificate(userId, z.string().regex(CERTIFICATE_ID).parse(certificateId));
}

/** The learner's valid certificates (read with their own session: RLS shows only their rows). */
export async function listMyCertificatesAction(): Promise<Certificate[]> {
  await requireUserId();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("certificates")
    .select("id, course_id, name, completed_on, issued_at")
    .is("revoked_at", null)
    .order("issued_at", { ascending: false });
  if (error) throw new Error(`Couldn't load your certificates: ${error.message}`);
  return (data ?? []).map((r) => ({ id: r.id, courseId: r.course_id, name: r.name, completedOn: r.completed_on, issuedAt: r.issued_at }));
}
