import { describe, expect, it } from "vitest";
import { formatChecked, isRecheckOverdue, recheckDue } from "./lastChecked";

describe("last checked dates", () => {
  it("reads as a plain date", () => {
    expect(formatChecked("2026-10-01")).toBe("1 Oct 2026");
  });

  it("is due again 3 months later", () => {
    expect(recheckDue("2026-10-01")).toBe("2027-01-01");
    expect(isRecheckOverdue("2026-10-01", "2026-12-31")).toBe(false);
    expect(isRecheckOverdue("2026-10-01", "2027-01-01")).toBe(true);
  });
});
