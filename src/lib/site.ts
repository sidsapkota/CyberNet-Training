/**
 * Site-wide facts: the production address, name and contact. The production domain is
 * cybernettraining.com; `NEXT_PUBLIC_SITE_URL` can override it (e.g. for a staging domain).
 * Canonical URLs, Open Graph URLs and the sitemap all use `siteUrl()`, so preview deployments
 * still point search engines at production.
 */

export const SITE_NAME = "CyberNet Training";
export const SITE_TAGLINE = "Short, hands-on lessons on how devices and the internet really work, and how to stay safe online.";
export const CONTACT_EMAIL = "hello@cybernettraining.com";
export const DEFAULT_SITE_URL = "https://cybernettraining.com";

/** The production origin. Only an absolute https URL is accepted; anything else falls back. */
export function siteUrl(env: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): URL {
  try {
    const url = new URL(env ?? "");
    if (url.protocol === "https:" || url.hostname === "localhost") return new URL(url.origin);
  } catch {
    // fall through
  }
  return new URL(DEFAULT_SITE_URL);
}

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).toString();
}

/** Only the production deployment may be indexed; previews and local dev never are. */
export function isIndexable(vercelEnv: string | undefined = process.env.VERCEL_ENV): boolean {
  return vercelEnv === "production";
}
