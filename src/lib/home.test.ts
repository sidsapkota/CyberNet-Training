import { describe, expect, it } from "vitest";
import { PROGRESS_STORAGE_KEY } from "@/lib/progress/localStorageProgressStore";
import { HOME_PROGRESS_KEY, HOME_SCRIPT, isReturningVisitor } from "./home";

describe("landing page or dashboard", () => {
  it("shows the dashboard to anyone signed in", () => {
    expect(isReturningVisitor(null, "sb-abcdef-auth-token=base64-xyz")).toBe(true);
    expect(isReturningVisitor(null, "theme=dark; sb-abcdef-auth-token.0=chunk")).toBe(true);
  });

  it("shows the dashboard to guests with any progress, and the landing page otherwise", () => {
    expect(isReturningVisitor(JSON.stringify({ cards: { "l/c": {} }, lessons: {}, quizzes: {} }), "")).toBe(true);
    expect(isReturningVisitor(JSON.stringify({ cards: {}, lessons: {}, quizzes: {}, preferences: { mode: "explore" } }), "")).toBe(false);
    expect(isReturningVisitor(null, "")).toBe(false);
    expect(isReturningVisitor("not json", "other=1")).toBe(false);
  });

  it("reads the same storage key as the progress store, in a self-contained inline script", () => {
    expect(HOME_PROGRESS_KEY).toBe(PROGRESS_STORAGE_KEY);
    expect(HOME_SCRIPT).toContain(JSON.stringify(PROGRESS_STORAGE_KEY));
    expect(HOME_SCRIPT).toContain("data-returning");
    expect(() => new Function(HOME_SCRIPT)).not.toThrow(); // valid JavaScript on its own
  });
});
