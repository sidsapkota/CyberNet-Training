import "server-only";
/**
 * Certificates on the server, with the secret key. Callers pass a verified user (requireUser()).
 * Everything printed on a certificate comes from here, never from the browser: the course, the
 * completion date (from the server-graded quiz attempts) and the checked name.
 */
import { randomBytes } from "node:crypto";
import { getCourses } from "@/lib/content/server";
import { getEntitlement } from "@/lib/pro/server";
import { safeTimeZone } from "@/lib/progress/daily";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { type Certificate, checkCertificateName, completedOn, courseFinalId, newCertificateId } from "./certificates";

export type { Certificate };


export type IssueResult = { ok: true; certificate: Certificate } | { ok: false; error: string };

type User = { id: string; createdAt: string | null };

function fromRow(r: { id: string; course_id: string; name: string; completed_on: string; issued_at: string }): Certificate {
  return { id: r.id, courseId: r.course_id, name: r.name, completedOn: r.completed_on, issuedAt: r.issued_at };
}

/** When the learner first passed the course final (null: not yet). */
export async function firstFinalPass(userId: string, courseId: string): Promise<string | null> {
  const course = getCourses().find((c) => c.id === courseId);
  const finalId = course ? courseFinalId(course) : null;
  if (!finalId) return null;
  const { data, error } = await createSupabaseAdminClient()
    .from("quiz_attempts")
    .select("attempted_at")
    .match({ user_id: userId, quiz_id: finalId, passed: true })
    .order("attempted_at")
    .limit(1);
  if (error) throw new Error(`Couldn't check the course final: ${error.message}`);
  return data?.[0]?.attempted_at ?? null;
}

/** The learner's valid certificate for a course, if any. */
export async function currentCertificate(userId: string, courseId: string): Promise<Certificate | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("certificates")
    .select("id, course_id, name, completed_on, issued_at")
    .match({ user_id: userId, course_id: courseId })
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw new Error(`Couldn't read the certificate: ${error.message}`);
  return data ? fromRow(data) : null;
}

/** A valid certificate the learner owns, by id (for the PDF). */
export async function ownCertificate(userId: string, id: string): Promise<Certificate | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("certificates")
    .select("id, course_id, name, completed_on, issued_at")
    .match({ id, user_id: userId })
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw new Error(`Couldn't read the certificate: ${error.message}`);
  return data ? fromRow(data) : null;
}

/**
 * Issues a certificate: only for a passed course final, with Pro, and a name that passes the
 * check. Re-issuing (e.g. to fix the name) revokes the learner's old certificate for the course.
 */
export async function issueCertificate(user: User, courseId: string, rawName: string): Promise<IssueResult> {
  const name = checkCertificateName(rawName);
  if (!name.ok) return name;
  const passedAt = await firstFinalPass(user.id, courseId);
  if (!passedAt) return { ok: false, error: "Pass the course final first." };
  const { hasPro } = await getEntitlement(user);
  if (!hasPro) return { ok: false, error: "Certificates are part of CyberNet Pro." };

  const admin = createSupabaseAdminClient();
  const profile = await admin.from("profiles").select("time_zone").eq("id", user.id).maybeSingle();
  const day = completedOn(passedAt, safeTimeZone(profile.data?.time_zone ?? "Australia/Sydney"));

  const revoke = await admin
    .from("certificates")
    .update({ revoked_at: new Date().toISOString() })
    .match({ user_id: user.id, course_id: courseId })
    .is("revoked_at", null);
  if (revoke.error) throw new Error(`Couldn't replace the old certificate: ${revoke.error.message}`);

  for (let attempt = 0; attempt < 5; attempt++) {
    const id = newCertificateId((n) => randomBytes(n));
    const { data, error } = await admin
      .from("certificates")
      .insert({ id, user_id: user.id, course_id: courseId, name: name.name, completed_on: day })
      .select("id, course_id, name, completed_on, issued_at")
      .single();
    if (!error && data) return { ok: true, certificate: fromRow(data) };
    // 23505 on the primary key: an ID collision (vanishingly rare); try a new one.
    if (error?.code !== "23505") throw new Error(`Couldn't issue the certificate: ${error?.message}`);
  }
  throw new Error("Couldn't issue the certificate. Please try again.");
}

/** Revokes one of the learner's certificates: its public page then says it isn't valid. */
export async function revokeCertificate(userId: string, id: string): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from("certificates")
    .update({ revoked_at: new Date().toISOString() })
    .match({ id, user_id: userId })
    .is("revoked_at", null);
  if (error) throw new Error(`Couldn't revoke the certificate: ${error.message}`);
}
