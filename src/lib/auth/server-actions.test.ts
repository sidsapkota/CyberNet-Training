import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NotSignedInError, verifiedUserId } from "./verify";

/*
 * Guards for writes that use the Supabase SECRET key (which bypasses Row Level Security):
 * - every Server Action gets the user id from a server-verified session, first thing;
 * - no action accepts a user id from the client;
 * - nothing uses getSession() (it doesn't validate the session with the auth server);
 * - the secret-key client is server-only and imported only by Server Actions.
 */

const ROOT = process.cwd();
const ACTIONS_DIR = path.join(ROOT, "src/app/actions");

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** Exported async functions with their parameter list and body. */
function exportedActions(source: string) {
  const matches = [...source.matchAll(/export async function (\w+)\(([^)]*)\)[^{]*\{/g)];
  return matches.map((m, i) => ({
    name: m[1]!,
    params: m[2]!,
    body: source.slice(m.index! + m[0].length, matches[i + 1]?.index ?? source.length),
  }));
}

describe("Server Actions that write with the secret key", () => {
  const actionFiles = sourceFiles(ACTIONS_DIR);

  it("exist and are all marked 'use server'", () => {
    expect(actionFiles.length).toBeGreaterThan(0);
    for (const file of actionFiles) expect(fs.readFileSync(file, "utf8").trimStart(), file).toMatch(/^"use server";/);
  });

  for (const file of sourceFiles(ACTIONS_DIR)) {
    const source = fs.readFileSync(file, "utf8");
    for (const action of exportedActions(source)) {
      const where = `${path.basename(file)} → ${action.name}`;

      it(`${where}: gets the user id from requireUserId() (or requireUser()) before touching data`, () => {
        // Both go through verifiedUser(): auth.getUser(), checked by the Supabase Auth server.
        const found = ["await requireUserId()", "await requireUser()"].map((c) => action.body.indexOf(c)).filter((i) => i >= 0);
        const verify = found.length ? Math.min(...found) : -1;
        expect(verify, `${where} must call requireUserId() or requireUser()`).toBeGreaterThanOrEqual(0);
        for (const later of ["createSupabaseAdminClient(", "createSupabaseServerClient(", ".from("]) {
          const at = action.body.indexOf(later);
          if (at !== -1) expect(verify, `${where}: requireUserId() must come before ${later}`).toBeLessThan(at);
        }
      });

      it(`${where}: never accepts a user id from the client`, () => {
        expect(action.params).not.toMatch(/user_?id|uid\b|owner/i);
      });
    }
  }

  it("nothing in the app calls getSession() (it doesn't verify the session)", () => {
    for (const file of sourceFiles(path.join(ROOT, "src"))) {
      expect(fs.readFileSync(file, "utf8"), file).not.toMatch(/\.getSession\(/);
    }
  });

  it("the secret-key client is server-only and imported only by Server Actions and the vetted Pro server code", () => {
    const admin = fs.readFileSync(path.join(ROOT, "src/lib/supabase/admin.ts"), "utf8");
    expect(admin.trimStart().startsWith('import "server-only";')).toBe(true);
    expect(admin).toContain("process.env.SUPABASE_SECRET_KEY");

    const importers = sourceFiles(path.join(ROOT, "src")).filter((f) =>
      /from "@\/lib\/supabase\/admin"/.test(fs.readFileSync(f, "utf8")),
    );
    expect(importers.length).toBeGreaterThan(0);
    // Besides Server Actions: the Pro entitlement helpers (server-only; callers pass a verified
    // user id) and the Stripe webhook, which has no user session and is authenticated by Stripe's
    // signature instead (checked before anything is read or written).
    const vetted = ["src/lib/pro/server.ts", "src/lib/leagues/server.ts", "src/lib/certificates/server.ts", "src/app/api/stripe/webhook/route.ts", "src/lib/feedback/server.ts", "src/lib/usernames/server.ts", "src/lib/rewards/server.ts"];
    for (const file of importers) {
      const rel = path.relative(ROOT, file).replace(/\\/g, "/");
      if (!rel.startsWith("src/app/actions/")) expect(vetted, rel).toContain(rel);
    }
    for (const helper of ["src/lib/pro/server.ts", "src/lib/leagues/server.ts", "src/lib/certificates/server.ts"]) {
      expect(fs.readFileSync(path.join(ROOT, helper), "utf8").trimStart().startsWith('import "server-only";'), helper).toBe(true);
    }
    const webhook = fs.readFileSync(path.join(ROOT, "src/app/api/stripe/webhook/route.ts"), "utf8");
    const verified = webhook.indexOf("webhooks.constructEvent(");
    expect(verified, "the webhook must verify Stripe's signature").toBeGreaterThan(0);
    for (const later of ["createSupabaseAdminClient(", "syncSubscription(", ".from("]) {
      const at = webhook.indexOf(later);
      if (at !== -1) expect(verified, `the webhook must verify the signature before ${later}`).toBeLessThan(at);
    }
  });

  it("the league job checks CRON_SECRET before touching any data", () => {
    const cron = fs.readFileSync(path.join(ROOT, "src/app/api/cron/leagues/route.ts"), "utf8");
    const check = cron.indexOf("if (!authorised(");
    expect(check, "the cron route must check CRON_SECRET").toBeGreaterThan(0);
    for (const later of ["finalizeDueWeeks(", "sendReportSummary("]) expect(check).toBeLessThan(cron.indexOf(later, cron.indexOf("export async function GET")));
    expect(cron).toContain("timingSafeEqual");
  });

  it("the Pro and league server helpers are only used from server code, with a verified user (or the cron secret)", () => {
    for (const file of sourceFiles(path.join(ROOT, "src"))) {
      const source = fs.readFileSync(file, "utf8");
      if (!/from "@\/lib\/(pro|leagues|certificates)\/server"/.test(source) || file.endsWith(".test.ts")) continue;
      // The helpers call each other; each is server-only and checked above.
      const rel = path.relative(ROOT, file).replace(/\\/g, "/");
      if (/^src\/lib\/(pro|leagues|certificates)\/server\.ts$/.test(rel)) continue;
      if (rel.startsWith("src/app/api/cron/")) continue;
      expect(source.trimStart().startsWith('"use client"'), file).toBe(false);
      expect(source, `${file} must get the user from the verified session`).toMatch(/await requireUser(Id)?\(\)/);
    }
  });

  it("no file reads the secret key except admin.ts, and no public variable holds it", () => {
    for (const file of sourceFiles(path.join(ROOT, "src"))) {
      const source = fs.readFileSync(file, "utf8");
      if (source.includes("process.env.SUPABASE_SECRET_KEY")) expect(file.replace(/\\/g, "/")).toMatch(/src\/lib\/supabase\/admin\.ts$/);
      expect(source, file).not.toMatch(/NEXT_PUBLIC_\w*SECRET/);
    }
  });
});

describe("verifiedUserId", () => {
  const client = (result: { data: { user: { id: string } | null }; error: unknown }) => ({
    auth: {
      getUser: async () => result,
      getSession: () => {
        throw new Error("getSession must never be used");
      },
    },
  });

  it("returns the id the auth server verified", async () => {
    await expect(verifiedUserId(client({ data: { user: { id: "user-a" } }, error: null }))).resolves.toBe("user-a");
  });

  it("rejects guests and invalid sessions", async () => {
    await expect(verifiedUserId(client({ data: { user: null }, error: null }))).rejects.toBeInstanceOf(NotSignedInError);
    await expect(
      verifiedUserId(client({ data: { user: { id: "user-a" } }, error: new Error("JWT expired") })),
    ).rejects.toBeInstanceOf(NotSignedInError);
  });
});
