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

      it(`${where}: gets the user id from requireUserId() before touching data`, () => {
        const verify = action.body.indexOf("await requireUserId()");
        expect(verify, `${where} must call requireUserId()`).toBeGreaterThanOrEqual(0);
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

  it("the secret-key client is server-only and imported only by Server Actions", () => {
    const admin = fs.readFileSync(path.join(ROOT, "src/lib/supabase/admin.ts"), "utf8");
    expect(admin.trimStart().startsWith('import "server-only";')).toBe(true);
    expect(admin).toContain("process.env.SUPABASE_SECRET_KEY");

    const importers = sourceFiles(path.join(ROOT, "src")).filter((f) =>
      /from "@\/lib\/supabase\/admin"/.test(fs.readFileSync(f, "utf8")),
    );
    expect(importers.length).toBeGreaterThan(0);
    for (const file of importers) expect(path.relative(ROOT, file).replace(/\\/g, "/")).toMatch(/^src\/app\/actions\//);
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
