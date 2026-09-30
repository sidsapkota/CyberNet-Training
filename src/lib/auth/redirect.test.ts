import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("allows same-site paths only", () => {
    expect(safeNextPath("/account")).toBe("/account");
    expect(safeNextPath("/course/x?y=1")).toBe("/course/x?y=1");
    for (const bad of [null, "", "https://example.com", "//example.com", "/\\example.com", "javascript:alert(1)"]) {
      expect(safeNextPath(bad)).toBe("/");
    }
  });
});
