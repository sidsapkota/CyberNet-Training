/**
 * Lessons about fast-changing things (the AI course's "AI Tools Today") carry `lastChecked`, the
 * date someone last checked their facts. Learners see it, and `validate-content` warns (never
 * fails) once it's due for another check. Pure, so it's tested.
 */

/** Recheck every 3 months (content/REVIEW.md lists what to check). */
export const RECHECK_MONTHS = 3;

/** "1 Oct 2026": the date as written, in plain words, without time-zone shifts. */
export function formatChecked(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** The day the next check is due: `RECHECK_MONTHS` after the last one. */
export function recheckDue(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const due = new Date(Date.UTC(y!, m! - 1 + RECHECK_MONTHS, d!));
  return due.toISOString().slice(0, 10);
}

export function isRecheckOverdue(date: string, today: string): boolean {
  return today >= recheckDue(date);
}
