import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

describe("the public verification page (/certificate/<id>)", () => {
  const page = read("src/app/(main)/certificate/[id]/page.tsx");

  it("reads only through verify_certificate(), never the certificates table", () => {
    expect(page).toContain('rpc("verify_certificate"');
    expect(page).not.toMatch(/\.from\(["']certificates["']\)/);
    expect(page).not.toMatch(/supabase\/admin|createSupabaseAdminClient/);
  });

  it("checks the ID's format before looking it up", () => {
    expect(page).toContain("normaliseCertificateId(");
  });

  it("shows only the name, course, date and ID", () => {
    const code = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/email|user_id|issued_at|revoked_at/);
  });

  it("isn't indexed, and robots.txt keeps crawlers away", () => {
    expect(page).toMatch(/robots:\s*\{\s*index:\s*false/);
    expect(read("src/app/robots.ts")).toContain('"/certificate/"');
  });
});

describe("the certificate PDF route", () => {
  const route = read("src/app/api/certificates/[id]/pdf/route.ts");

  it("is for the signed-in owner only, with a valid ID, and never cached", () => {
    expect(route).toContain("await requireUser()");
    expect(route).toContain("ownCertificate(user.id, id)");
    expect(route).toContain("normaliseCertificateId(");
    expect(route).toContain("private, no-store");
  });
});
