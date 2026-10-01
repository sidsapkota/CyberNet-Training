/**
 * One-off: gives every account a username and re-checks every username with the current rules.
 *   npm run usernames:scan            (dry run: counts only, changes nothing)
 *   npm run usernames:scan -- --apply (writes)
 *
 * - No username yet: a generated one (never the old private display name: it may be a real name).
 * - A username that fails `checkUsername` (rude, impersonating, contact details, bad shape): a
 *   generated one, and the learner's change is given back (`username_changed_at` cleared).
 * Prints counts only, never names. Needs SUPABASE_SECRET_KEY in .env.local. Safe to run again.
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { parseSecretKey, parseSupabaseEnv } from "../src/lib/supabase/env";
import { checkUsername, usernameKey } from "../src/lib/usernames/check";
import { generateUsername } from "../src/lib/usernames/generate";

for (const file of [".env.local", ".env"]) if (fs.existsSync(file)) process.loadEnvFile(file);
const env = parseSupabaseEnv({ url: process.env.NEXT_PUBLIC_SUPABASE_URL, publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY });
const admin = createClient<Database>(env.url, parseSecretKey(process.env.SUPABASE_SECRET_KEY), {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const apply = process.argv.includes("--apply");

const { data, error } = await admin.from("profiles").select("id, username");
if (error) throw new Error(`Couldn't read profiles: ${error.message}`);
const rows = data ?? [];
const taken = new Set(rows.flatMap((r) => (r.username ? [usernameKey(r.username)] : [])));

const fresh = (): string => {
  for (;;) {
    const name = generateUsername();
    if (!taken.has(usernameKey(name))) {
      taken.add(usernameKey(name));
      return name;
    }
  }
};

let generated = 0;
let replaced = 0;
for (const row of rows) {
  const missing = !row.username;
  const failing = !missing && !checkUsername(row.username!).ok;
  if (!missing && !failing) continue;
  const name = fresh();
  if (missing) generated++;
  else replaced++;
  if (!apply) continue;
  // Only change the row if it still has the value we read (a learner may have just picked one).
  const query = admin.from("profiles").update({ username: name, username_changed_at: null }).eq("id", row.id);
  const { error: writeError } = await (missing ? query.is("username", null) : query.eq("username", row.username!));
  if (writeError) throw new Error(`Couldn't save a username: ${writeError.message}`);
}

console.log(`${apply ? "Applied" : "Dry run"}: checked ${rows.length}, generated ${generated}, replaced ${replaced}.`);
