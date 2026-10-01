import { describe, expect, it } from "vitest";
import { WRONG_BURST_SECONDS, wrongThemeFor } from "./WrongBurst";

describe("wrong-answer animations", () => {
  it("are short (under 700ms)", () => {
    expect(WRONG_BURST_SECONDS).toBeLessThan(0.7);
  });

  it("are themed per course", () => {
    expect(wrongThemeFor("inside-your-devices")).toBe("devices");
    expect(wrongThemeFor("how-ai-really-works")).toBe("ai");
    expect(wrongThemeFor("how-the-internet-works")).toBe("internet");
    expect(wrongThemeFor("stay-safe-online")).toBe("safety");
  });
});
