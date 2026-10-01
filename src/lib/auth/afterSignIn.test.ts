import { describe, expect, it } from "vitest";
import { nextCookie, readNextCookie } from "./afterSignIn";

describe("the path to return to after sign-in", () => {
  it("is a same-site path in a short-lived, same-site cookie", () => {
    expect(nextCookie("/lesson/memory-vs-storage", true)).toBe(
      "cybernet_next=%2Flesson%2Fmemory-vs-storage; Path=/; Max-Age=3600; SameSite=Lax; Secure",
    );
    expect(nextCookie("/lesson/x", false)).not.toContain("Secure");
  });

  it("never sends anyone off-site", () => {
    expect(nextCookie("https://evil.example/", true)).toContain("cybernet_next=%2F;");
    expect(readNextCookie(encodeURIComponent("//evil.example"))).toBeNull();
    expect(readNextCookie(encodeURIComponent("https://evil.example"))).toBeNull();
    expect(readNextCookie("%E0%A4%A")).toBeNull(); // malformed
    expect(readNextCookie(undefined)).toBeNull();
    expect(readNextCookie(encodeURIComponent("/lesson/bits-and-binary"))).toBe("/lesson/bits-and-binary");
  });
});
