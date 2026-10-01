import { describe, expect, it } from "vitest";
import { afterSignInPath, cleanCode, isCodeReady, nextCookie, readNextCookie } from "./afterSignIn";

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

describe("after signing in", () => {
  it("sends new accounts to pick a name first, keeping where they were going", () => {
    expect(afterSignInPath("/lesson/two-step-sign-in", false)).toBe("/account?welcome=1&next=%2Flesson%2Ftwo-step-sign-in");
    expect(afterSignInPath("/", false)).toBe("/account?welcome=1");
  });

  it("sends everyone else straight there, and never off-site", () => {
    expect(afterSignInPath("/lesson/two-step-sign-in", true)).toBe("/lesson/two-step-sign-in");
    expect(afterSignInPath("https://evil.example", true)).toBe("/");
    expect(afterSignInPath("//evil.example", false)).toBe("/account?welcome=1");
  });
});

describe("the email sign-in code", () => {
  it("keeps only digits, from typing or pasting", () => {
    expect(cleanCode("123 456")).toBe("123456");
    expect(cleanCode("12-34-56")).toBe("123456");
    expect(cleanCode("Your code: 654321")).toBe("654321");
    expect(cleanCode("1234567890")).toBe("12345678");
  });

  it("is ready at 6 digits (up to 8 accepted)", () => {
    expect(isCodeReady("12345")).toBe(false);
    expect(isCodeReady("123456")).toBe(true);
    expect(isCodeReady("12345678")).toBe(true);
    expect(isCodeReady("12345a")).toBe(false);
  });
});

