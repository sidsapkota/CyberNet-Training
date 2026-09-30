/**
 * `/` shows the landing page to first-time visitors and the dashboard to returning learners.
 * The page is static (fast, and crawlers see the landing page), so the choice is made in the
 * browser before first paint: a tiny inline script in the root layout's <head> sets
 * `data-returning` on <html>, and CSS shows one or the other. No flash, no server round trip.
 *
 * Returning = signed in (a Supabase auth cookie exists) or has any guest progress saved.
 */

/**
 * Self-contained on purpose: its source is inlined into the page by `HOME_SCRIPT`, so it can't
 * use imports or outer variables. `progressJson` is the saved guest progress (or null).
 */
export function isReturningVisitor(progressJson: string | null, cookie: string): boolean {
  if (/(?:^|;\s*)sb-[^=;]*-auth-token/.test(cookie)) return true;
  if (!progressJson) return false;
  try {
    const p = JSON.parse(progressJson) as { cards?: object; lessons?: object; quizzes?: object };
    const count = (o: object | undefined) => (o && typeof o === "object" ? Object.keys(o).length : 0);
    return count(p.cards) + count(p.lessons) + count(p.quizzes) > 0;
  } catch {
    return false;
  }
}

/** Keep in sync with PROGRESS_STORAGE_KEY (a test checks). */
export const HOME_PROGRESS_KEY = "cybernet.progress.v1";

export const HOME_SCRIPT = `(function(){try{var r=(${isReturningVisitor.toString()})(localStorage.getItem(${JSON.stringify(
  HOME_PROGRESS_KEY,
)}),document.cookie);if(r)document.documentElement.setAttribute("data-returning","");}catch(e){}})();`;
