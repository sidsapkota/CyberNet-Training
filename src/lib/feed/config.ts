/**
 * The Feed's flag (docs/plans/feed.md). Off: no Feed tab, no landing-page byte, and /feed is a 404,
 * except as a preview with `?feed=1` outside production (dev server, staging checks, previews).
 * Shipping is this one line.
 */
export const FEED_ENABLED = true;

/** Whether a request may see the Feed (`preview` is the `?feed=1` query). */
export function feedAllowed(preview: string | string[] | undefined, env = process.env.VERCEL_ENV): boolean {
  return FEED_ENABLED || (env !== "production" && preview === "1");
}
