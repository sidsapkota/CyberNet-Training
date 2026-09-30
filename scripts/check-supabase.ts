/**
 * `npm run check:supabase`: confirms the Supabase URL and publishable key in .env.local work,
 * by calling the Auth service health endpoint (no tables needed). Never prints the key.
 *
 * Sets process.exitCode instead of calling process.exit(): exiting while fetch's sockets are
 * closing trips a libuv assertion on Windows.
 */
import fs from "node:fs";
import { parseSupabaseEnv, SupabaseEnvError } from "../src/lib/supabase/env";

async function main(): Promise<string | null> {
  // Same precedence as Next.js for local dev: shell env, then .env.local, then .env.
  for (const file of [".env.local", ".env"]) {
    if (fs.existsSync(file)) process.loadEnvFile(file);
  }

  let env;
  try {
    env = parseSupabaseEnv({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });
  } catch (error) {
    if (error instanceof SupabaseEnvError) return error.message;
    throw error;
  }

  const keyKind = env.publishableKey.startsWith("sb_publishable_")
    ? "publishable key"
    : env.publishableKey.startsWith("eyJ")
      ? "legacy anon key"
      : "key in an unrecognised format";
  console.log(`Checking ${new URL(env.url).host} with a ${keyKind}…`);

  let response: Response;
  try {
    response = await fetch(`${env.url}/auth/v1/health`, {
      headers: { apikey: env.publishableKey },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    return (
      `Could not reach ${env.url} (${(error as Error).message}).\n` +
      "Check NEXT_PUBLIC_SUPABASE_URL for typos, and that the project isn't paused."
    );
  }

  if (response.status === 401 || response.status === 403) {
    return (
      `The project responded, but rejected the key (HTTP ${response.status}).\n` +
      "Copy the publishable key again from Project Settings → API Keys."
    );
  }
  if (response.status === 404) {
    return `${env.url} doesn't look like a Supabase project URL (HTTP 404). Use the Project URL from Data API settings.`;
  }
  if (!response.ok) {
    return `Unexpected response from Supabase: HTTP ${response.status} ${response.statusText}.`;
  }

  let service = "auth";
  try {
    const body = (await response.json()) as { name?: string; version?: string };
    service = [body.name, body.version].filter(Boolean).join(" ") || service;
  } catch {
    // Health body is informational only.
  }
  console.log(`✓ Supabase check PASSED: URL and key are valid (${service} is healthy).`);
  return null;
}

const failure = await main();
if (failure) {
  console.error(`✗ Supabase check FAILED\n  ${failure.split("\n").join("\n  ")}`);
  process.exitCode = 1;
}
