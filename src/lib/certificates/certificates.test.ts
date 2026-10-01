import { describe, expect, it } from "vitest";
import { twoModuleCourse } from "@/test/fixtures";
import {
  CERTIFICATE_ID,
  checkCertificateName,
  completedOn,
  courseFinalId,
  formatCertificateDate,
  linkedInFields,
  newCertificateId,
  normaliseCertificateId,
  verificationUrl,
} from "./certificates";

describe("certificate IDs", () => {
  it("are CNT- and 12 characters from an alphabet without look-alikes", () => {
    let n = 0;
    const id = newCertificateId((len) => Uint8Array.from({ length: len }, () => n++ * 7));
    expect(id).toMatch(CERTIFICATE_ID);
    expect(id).not.toMatch(/[ILOU]/);
  });

  it("differ every time with real randomness", () => {
    const random = (len: number) => crypto.getRandomValues(new Uint8Array(len));
    const ids = new Set(Array.from({ length: 500 }, () => newCertificateId(random)));
    expect(ids.size).toBe(500);
  });

  it("are read case-insensitively, and anything else is rejected", () => {
    expect(normaliseCertificateId(" cnt-ab12-cd34-ef56 ")).toBe("CNT-AB12-CD34-EF56");
    expect(normaliseCertificateId("CNT-AB12-CD34-EF5O")).toBeNull(); // O isn't in the alphabet
    expect(normaliseCertificateId("../etc/passwd")).toBeNull();
  });
});

describe("certificate names", () => {
  it("accepts first names, nicknames and full names in any language", () => {
    for (const n of ["Sid", "Ava Chen", "Zoë O'Neil", "Jean-Luc", "Mai Thảo", "Dr. Ada"]) expect(checkCertificateName(n), n).toEqual({ ok: true, name: n });
    expect(checkCertificateName("  Ava   Chen ")).toEqual({ ok: true, name: "Ava Chen" });
  });

  it("rejects emails, web addresses, phone numbers and numbers", () => {
    for (const n of ["sid@example.com", "www.example.com", "0412 345 678", "Sid 2012", "R2D2"]) expect(checkCertificateName(n).ok, n).toBe(false);
  });

  it("rejects empty, too long and rude names", () => {
    for (const n of ["", "   ", "A".repeat(61), "Shit Head"]) expect(checkCertificateName(n).ok, n).toBe(false);
  });
});

describe("course completion", () => {
  it("the final is the last module's quiz", () => {
    expect(courseFinalId(twoModuleCourse())).toBe("quiz2");
  });

  it("the date is the day of the first pass, in the learner's time zone", () => {
    expect(completedOn("2026-09-30T15:30:00Z", "Australia/Sydney")).toBe("2026-10-01");
    expect(completedOn("2026-09-30T15:30:00Z", "America/New_York")).toBe("2026-09-30");
    expect(formatCertificateDate("2026-10-01")).toBe("1 October 2026");
  });
});

describe("sharing", () => {
  it("links to the public verification page", () => {
    expect(verificationUrl("CNT-AB12-CD34-EF56")).toBe("https://cybernettraining.com/certificate/CNT-AB12-CD34-EF56");
  });

  it("gives the values to copy into LinkedIn's form", () => {
    const fields = linkedInFields({ id: "CNT-AB12-CD34-EF56", completedOn: "2026-10-01" }, "Stay Safe Online");
    expect(fields.map((f) => f.value)).toEqual([
      "Stay Safe Online (CyberNet Training)",
      "CyberNet Training",
      "October 2026",
      "CNT-AB12-CD34-EF56",
      "https://cybernettraining.com/certificate/CNT-AB12-CD34-EF56",
    ]);
  });
});
