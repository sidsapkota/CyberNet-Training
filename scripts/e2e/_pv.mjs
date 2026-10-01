import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright-core";
import { prepare } from "./lib/access.mjs";
const APP = path.resolve(import.meta.dirname, "../..");
const env = Object.fromEntries(fs.readFileSync(path.join(APP, ".env.local"), "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const BASE = process.env.E2E_BASE_URL;
const email = `pv-${Date.now()}@example.com`;
const { data } = await admin.auth.admin.createUser({ email, email_confirm: true });
await admin.from("profiles").update({ display_name: "Pv", age_confirmed: true }).eq("id", data.user.id);
const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
const b = await chromium.launch({ channel: "msedge" });
const p = await b.newPage({ viewport: { width: 360, height: 640 } });
await prepare(p);
await p.route(/\/script\.js$|\/_vercel\/insights\//, (r) => r.abort());
await p.goto(`${BASE}/auth/callback?token_hash=${link.data.properties.hashed_token}&type=magiclink&next=/`);
await p.waitForTimeout(2000);
for (const id of ["what-is-an-ip-address", "memory-vs-storage"]) {
  const r = await p.request.get(`${BASE}/api/lessons/${id}?tz=Australia/Sydney`);
  console.log(BASE, id, r.status(), (await r.text()).slice(0, 120));
}
await b.close();
await admin.auth.admin.deleteUser(data.user.id);
