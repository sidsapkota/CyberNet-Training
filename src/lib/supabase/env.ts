/**
 * Supabase connection settings from the environment (see .env.example).
 *
 * `process.env.NEXT_PUBLIC_*` must be referenced literally so Next.js can inline the values
 * into the browser bundle; don't refactor this into a dynamic lookup.
 */

export interface SupabaseEnv {
  url: string;
  publishableKey: string;
}

export class SupabaseEnvError extends Error {
  constructor(problems: string[]) {
    super(
      `Supabase is not configured:\n${problems.map((p) => `  - ${p}`).join("\n")}\n` +
        "Set the values in .env.local (see .env.example), then restart `npm run dev`.",
    );
    this.name = "SupabaseEnvError";
  }
}

/** Decodes a JWT payload's `role` without verifying it (used only to catch misconfiguration). */
function jwtRole(token: string): string | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    // atob exists in browsers and Node; base64url → base64 with padding first.
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const json = JSON.parse(atob(base64));
    return typeof json?.role === "string" ? json.role : null;
  } catch {
    return null;
  }
}

/** True if the key is a server-only secret that must never reach the browser. */
export function isSecretKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) return true;
  return key.startsWith("eyJ") && jwtRole(key) === "service_role";
}

/**
 * Validates raw values. Pure, so it can be unit-tested; throws `SupabaseEnvError` listing
 * every problem at once.
 */
export function parseSupabaseEnv(raw: { url?: string; publishableKey?: string }): SupabaseEnv {
  const url = raw.url?.trim() ?? "";
  const publishableKey = raw.publishableKey?.trim() ?? "";
  const problems: string[] = [];

  if (!url) {
    problems.push("NEXT_PUBLIC_SUPABASE_URL is empty.");
  } else {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
        problems.push("NEXT_PUBLIC_SUPABASE_URL must start with https:// (http is only allowed for localhost).");
      }
    } catch {
      problems.push(`NEXT_PUBLIC_SUPABASE_URL is not a valid URL: "${url}".`);
    }
  }

  if (!publishableKey) {
    problems.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is empty.");
  } else if (isSecretKey(publishableKey)) {
    problems.push(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY contains a SECRET / service_role key. Remove it now and use " +
        "the publishable (anon) key instead: NEXT_PUBLIC_ values are shipped to every browser.",
    );
  }

  if (problems.length > 0) throw new SupabaseEnvError(problems);
  return { url: url.replace(/\/+$/, ""), publishableKey };
}

/** Reads and validates the Supabase env vars. Throws a clear error if they're missing. */
export function getSupabaseEnv(): SupabaseEnv {
  return parseSupabaseEnv({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

/**
 * Validates the server-only secret key (`SUPABASE_SECRET_KEY`). Pure, so it can be tested; only
 * `admin.ts` (which is `server-only`) ever reads the real value.
 */
export function parseSecretKey(raw: string | undefined): string {
  const key = raw?.trim() ?? "";
  if (!key) {
    throw new SupabaseEnvError([
      "SUPABASE_SECRET_KEY is empty. Add the secret key (sb_secret_...) to .env.local. Never commit it or " +
        "put it in a NEXT_PUBLIC_ variable.",
    ]);
  }
  if (!isSecretKey(key)) {
    throw new SupabaseEnvError([
      "SUPABASE_SECRET_KEY doesn't look like a secret key (expected sb_secret_... or a service_role JWT).",
    ]);
  }
  return key;
}
