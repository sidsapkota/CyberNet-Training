/**
 * Course certificates (Pro): pure rules, tested on their own. The server issues and revokes them
 * (lib/certificates/server.ts); the public verification page shows only the name, course, date and
 * ID, through the database's verify_certificate().
 */
import { englishDataset, englishRecommendedTransformers, RegExpMatcher } from "obscenity";
import type { CourseOutline } from "@/lib/content/schema";
import { localDay } from "@/lib/progress/daily";
import { SITE_NAME, siteUrl } from "@/lib/site";

export interface Certificate {
  id: string;
  courseId: string;
  name: string;
  /** "YYYY-MM-DD", the day the course final was first passed (the learner's time zone). */
  completedOn: string;
  issuedAt: string;
}

/** Crockford base32: no I, L, O or U, so IDs can be read aloud and typed without mix-ups. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const CERTIFICATE_ID = /^CNT-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

/** A new ID, "CNT-XXXX-XXXX-XXXX": 12 random characters (60 bits), so IDs can't be guessed or walked. */
export function newCertificateId(randomBytes: (n: number) => Uint8Array): string {
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (b) => ALPHABET[b & 31]!);
  return `CNT-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
}

export function normaliseCertificateId(raw: string): string | null {
  const id = raw.trim().toUpperCase();
  return CERTIFICATE_ID.test(id) ? id : null;
}

export const NAME_MAX = 60;
const profanity = new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers });

export type NameCheck = { ok: true; name: string } | { ok: false; error: string };

/**
 * The name printed on a certificate (and shown on its public page). Letters only, with spaces,
 * apostrophes, hyphens and full stops: so no email addresses, web addresses or phone numbers can
 * get in. A first name or nickname is fine.
 */
export function checkCertificateName(input: string): NameCheck {
  const name = input.normalize("NFC").replace(/\s+/g, " ").trim();
  if (name.length < 1 || name.length > NAME_MAX) return { ok: false, error: `Use 1 to ${NAME_MAX} characters.` };
  if (!/^\p{L}[\p{L}\p{M}' .-]*$/u.test(name)) {
    return { ok: false, error: "Use letters only (spaces, apostrophes and hyphens are fine). No numbers, emails or web addresses." };
  }
  // A full stop ends an initial or title ("Dr. Ada"), never joins words like a web address does.
  if (/\.\S/u.test(name) || /\b(www|https?)\b/i.test(name)) {
    return { ok: false, error: "Use letters only (spaces, apostrophes and hyphens are fine). No numbers, emails or web addresses." };
  }
  if (profanity.hasMatch(name)) return { ok: false, error: "Please choose a different name." };
  return { ok: true, name };
}

/** The course final: the last module's quiz. Passing it completes the course. */
export function courseFinalId(course: CourseOutline): string | null {
  const last = course.modules.at(-1);
  return last?.lessons.find((l) => l.kind === "quiz")?.id ?? null;
}

/** The completion date: the day the final was first passed, in the learner's own time zone. */
export function completedOn(firstPassAt: string, timeZone: string): string {
  return localDay(Date.parse(firstPassAt), timeZone);
}

/** "1 October 2026". */
export function formatCertificateDate(day: string): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function verificationUrl(id: string): string {
  return new URL(`/certificate/${id}`, siteUrl()).toString();
}

/**
 * LinkedIn no longer pre-fills certificates from a link, so the button opens its add-certification
 * form and these are the values to copy into it.
 */
export const LINKEDIN_ADD_CERTIFICATION = "https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME";

export function linkedInFields(cert: { id: string; completedOn: string }, courseTitle: string): { label: string; value: string }[] {
  const [y, m] = cert.completedOn.split("-").map(Number) as [number, number];
  const month = new Intl.DateTimeFormat("en-AU", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
  return [
    { label: "Name", value: `${courseTitle} (${SITE_NAME})` },
    { label: "Issuing organisation", value: SITE_NAME },
    { label: "Issue date", value: `${month} ${y}` },
    { label: "Credential ID", value: cert.id },
    { label: "Credential URL", value: verificationUrl(cert.id) },
  ];
}
