import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p));

describe("Continue with Google button (Google's branding guidelines)", () => {
  it("uses Google's official G, unmodified (see public/brand/google/README.md)", () => {
    const png = read("public/brand/google/google-g.png");
    expect(createHash("sha256").update(png).digest("hex")).toBe(
      "b72631fc1fee93e8842bbfe76e7f7481dadedd5bac5e86df306eab4c85c2f7c0",
    );
    // 80 × 80 RGBA: Google's 20px logo at 4x, on a transparent background.
    expect(png.readUInt32BE(16)).toBe(80);
    expect(png.readUInt32BE(20)).toBe(80);
    expect(png[25]).toBe(6);
  });

  it("shows the G at Google's fixed 20px with an approved label", () => {
    const src = read("src/components/account/GoogleSignInButton.tsx").toString();
    expect(src).toMatch(/src=\{GOOGLE_G_SRC\} width=\{20\} height=\{20\}/);
    expect(src).toContain(">Continue with Google<");
    expect(src).toMatch(/Google_Sans\(\{[^}]*weight: "500"/);
  });

  it("uses Google's light and dark button colours", () => {
    const css = read("src/app/theme.css").toString();
    expect(css).toContain("--color-google-fill: light-dark(#ffffff, #131314);");
    expect(css).toContain("--color-google-stroke: light-dark(#747775, #8e918f);");
    expect(css).toContain("--color-google-ink: light-dark(#1f1f1f, #e3e3e3);");
    expect(css).toMatch(/--text-google-button: 0\.875rem;\s*--text-google-button--line-height: 1\.25rem;/);
  });

  it("is the sign-in page's Google button", () => {
    const login = read("src/components/account/LoginForm.tsx").toString();
    expect(login).toContain("<GoogleSignInButton");
    expect(login.match(/Continue with Google/g)).toBeNull();
  });
});
