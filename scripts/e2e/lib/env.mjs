// Settings for the e2e scripts, with one safety rule: the site and the database must match.
// - Development (the dev server, a local build, staging): `.env.local`, which points at the
//   STAGING Supabase project. These runs create and delete throwaway accounts there.
// - Production checks (E2E_BASE_URL=https://cybernettraining.com): the production keys live in a
//   separate file, `.env.production-checks` (git-ignored), passed as E2E_ENV_FILE. `npm run
//   e2e:prod-checks` does both.
// A run that mixes them (the live site with staging keys, or a local server with production keys)
// is refused, so a local test can never write to the production database by accident.
import fs from "node:fs";
import path from "node:path";

export const PRODUCTION_REF = "qyjmowpkdcunkfitbwca";
const PRODUCTION_SITE = /(^|\.)cybernettraining\.com|\.vercel\.app/;

/** The env file's `NAME=value` pairs, as entries (for `Object.fromEntries`). */
export function readEnvEntries(app) {
  const file = process.env.E2E_ENV_FILE ?? ".env.local";
  const full = path.isAbsolute(file) ? file : path.join(app, file);
  if (!fs.existsSync(full)) throw new Error(`Missing ${file}. See docs/handover.md, "Folders and settings".`);
  const entries = fs.readFileSync(full, "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]);
  const url = Object.fromEntries(entries).NEXT_PUBLIC_SUPABASE_URL ?? "";
  const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  const productionDb = url.includes(PRODUCTION_REF);
  const productionSite = PRODUCTION_SITE.test(new URL(base).hostname);
  if (productionSite && !productionDb) {
    throw new Error(`${base} uses the production database, but ${file} isn't production. Run the production checks with: npm run e2e:prod-checks`);
  }
  if (!productionSite && productionDb) {
    throw new Error(`${file} points at the PRODUCTION database, but ${base} isn't the live site. Development runs use staging (.env.local).`);
  }
  return entries;
}
