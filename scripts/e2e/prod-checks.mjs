// The production checks, after every merge: each suite against https://cybernettraining.com, using
// the production keys in `.env.production-checks` (git-ignored; never `.env.local`, which is
// staging). Throwaway accounts only, deleted by each suite; plan buttons are never clicked.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const APP = path.resolve(import.meta.dirname, "../..");
const ENV_FILE = ".env.production-checks";
if (!fs.existsSync(path.join(APP, ENV_FILE))) {
  console.error(`Missing ${ENV_FILE} (the production Supabase URL, publishable key and secret key). See docs/handover.md, "Folders and settings".`);
  process.exit(1);
}
const SUITES = ["prod-mascot", "plans", "mistake-review", "guest-gate", "rewards", "usernames", "dashboard-numbers"];
const env = { ...process.env, E2E_BASE_URL: "https://cybernettraining.com", E2E_ENV_FILE: ENV_FILE };
const outcome = [];
for (const suite of SUITES) {
  console.log(`\n=== e2e:${suite}`);
  const run = spawnSync(process.execPath, [path.join(APP, "scripts/e2e", `${suite}.mjs`)], { cwd: APP, env, stdio: "inherit" });
  outcome.push([suite, run.status === 0]);
}
console.log("\nProduction checks:");
for (const [suite, ok] of outcome) console.log(`${ok ? "✓" : "✗"} e2e:${suite}`);
const failed = outcome.filter(([, ok]) => !ok).length;
console.log(failed ? `\n${failed} suite(s) FAILED` : `\nAll ${outcome.length} suites passed.`);
process.exit(failed ? 1 : 0);
