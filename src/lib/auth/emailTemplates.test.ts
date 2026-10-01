import fs from "node:fs";
import { describe, expect, it } from "vitest";

// The sign-in emails Supabase sends (pasted from docs/email; see docs/launch-checklist.md, 4d).
describe("sign-in email templates", () => {
  for (const file of ["docs/email/magic-link.html", "docs/email/confirm-signup.html"]) {
    it(`${file} has the 6-digit code and the sign-in link`, () => {
      const html = fs.readFileSync(file, "utf8");
      // The code, for typing into the page in any browser (including in-app ones)...
      expect(html).toContain("{{ .Token }}");
      // ...and the button, for normal browsers.
      expect(html).toContain('href="{{ .ConfirmationURL }}"');
    });
  }
});
