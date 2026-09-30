import { describe, expect, it } from "vitest";
import { ageGateStep } from "./age";

describe("age check (accounts are 13+)", () => {
  it("never bothers guests or accounts that have confirmed", () => {
    expect(ageGateStep(false, false, false)).toBe("none");
    expect(ageGateStep(true, true, false)).toBe("none");
    expect(ageGateStep(true, true, true)).toBe("none");
  });

  it("saves a confirmation ticked on /login, and asks existing accounts once", () => {
    expect(ageGateStep(true, false, true)).toBe("auto-confirm");
    expect(ageGateStep(true, false, false)).toBe("prompt");
  });
});
