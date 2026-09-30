import { describe, expect, it } from "vitest";
import { proLine } from "./describe";

const tz = "Australia/Sydney";
const base = { kind: "subscription" as const, status: "active" as const, interval: "month" as const, periodEnd: "2026-11-01T00:00:00Z", trialEnd: null, cancelling: false };

describe("proLine", () => {
  it("describes each state in one plain line", () => {
    expect(proLine({ kind: "none", hadSubscription: false }, tz)).toBe("Every module of every course.");
    expect(proLine({ kind: "none", hadSubscription: true }, tz)).toMatch(/ended.*progress is all still here/);
    expect(proLine({ kind: "grant", expiresAt: "2026-10-31T00:00:00Z", thanked: true }, tz)).toBe("Free for early users until 31 October 2026. Thank you!");
    expect(proLine(base, tz)).toBe("Monthly plan. Renews on 1 November 2026.");
    expect(proLine({ ...base, interval: "year" }, tz)).toMatch(/^Annual plan/);
    expect(proLine({ ...base, status: "trialing", trialEnd: "2026-10-07T00:00:00Z" }, tz)).toBe(
      "Monthly plan, free trial until 7 October 2026. You can cancel before then.",
    );
  });

  it("says a cancelled plan keeps Pro to the end and isn't charged again", () => {
    expect(proLine({ ...base, cancelling: true }, tz)).toBe("Monthly plan, cancelled. Pro stays until 1 November 2026, and you won't be charged again.");
  });

  it("asks for a new card when a payment failed (access continues while Stripe retries)", () => {
    expect(proLine({ ...base, status: "past_due", cancelling: true }, tz)).toMatch(/didn't go through: update your card/);
  });
});
