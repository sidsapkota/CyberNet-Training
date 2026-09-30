import { siteUrl } from "@/lib/site";

/**
 * Where Stripe sends the learner back to (after Checkout or the Customer Portal). Only our own
 * origins are allowed: production, local dev, and this project's Vercel preview deployments. A
 * request from anywhere else gets the production site, so a forged Origin header can't turn
 * Stripe into a redirect to someone else's site.
 */
const PREVIEW = /^https:\/\/cyber-net-training-[a-z0-9-]+-sidsapkotas-projects\.vercel\.app$/;
const LOCAL = /^http:\/\/localhost:\d{2,5}$/;

export function returnOrigin(requestOrigin: string | null | undefined, production: URL = siteUrl()): string {
  if (requestOrigin && (requestOrigin === production.origin || PREVIEW.test(requestOrigin) || LOCAL.test(requestOrigin))) {
    return requestOrigin;
  }
  return production.origin;
}
