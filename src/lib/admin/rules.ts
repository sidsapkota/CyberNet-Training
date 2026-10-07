/**
 * The admin dashboard's pure rules (tested): who's an admin, the recent sign-in rule, and the small
 * sums the pages show. Nothing here reads a request or the database.
 */

/** Admins must have signed in within this long. */
export const ADMIN_SESSION_MS = 12 * 60 * 60_000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The allowlist from ADMIN_USER_IDS: comma-separated Supabase user ids. Anything else is ignored. */
export function parseAdminIds(value: string | undefined): ReadonlySet<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => UUID.test(s)),
  );
}

/** Signed in within ADMIN_SESSION_MS (a missing or future time doesn't count). */
export function recentSignIn(lastSignInAt: string | null | undefined, now: Date): boolean {
  const at = lastSignInAt ? Date.parse(lastSignInAt) : NaN;
  return Number.isFinite(at) && at <= now.getTime() + 60_000 && now.getTime() - at < ADMIN_SESSION_MS;
}

export function isAdmin(userId: string | null | undefined, lastSignInAt: string | null | undefined, allowlist: ReadonlySet<string>, now: Date): boolean {
  return Boolean(userId) && allowlist.has(userId!.toLowerCase()) && recentSignIn(lastSignInAt, now);
}

/** Counts per day for the last `days` days (oldest first), from YYYY-MM-DD strings. */
export function perDay(days: readonly string[], today: string, count: number): { day: string; n: number }[] {
  const counts = new Map<string, number>();
  for (const d of days) counts.set(d, (counts.get(d) ?? 0) + 1);
  const out: { day: string; n: number }[] = [];
  const [y, m, d] = today.split("-").map(Number) as [number, number, number];
  for (let i = count - 1; i >= 0; i--) {
    const day = new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10);
    out.push({ day, n: counts.get(day) ?? 0 });
  }
  return out;
}

/** Learners with XP on at least two different days. */
export function returningLearners(events: readonly { user_id: string; day: string }[]): number {
  const days = new Map<string, Set<string>>();
  for (const e of events) {
    const set = days.get(e.user_id) ?? new Set<string>();
    set.add(e.day);
    days.set(e.user_id, set);
  }
  return [...days.values()].filter((s) => s.size >= 2).length;
}

/** "a***@example.com": enough to tell emails apart, nothing more (the full one is revealed on request). */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "none";
  const [user, domain] = email.split("@");
  return `${(user ?? "").slice(0, 1)}***@${domain ?? ""}`;
}
