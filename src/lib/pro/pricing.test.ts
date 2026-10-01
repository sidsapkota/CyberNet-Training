import { describe, expect, it } from "vitest";
import { annualSaving, formatPrice, pitchPrices, shortPrice } from "./pricing";

describe("pricing", () => {
  it("formats Australian dollars unambiguously", () => {
    expect(formatPrice(799, "aud")).toBe("A$7.99");
    expect(formatPrice(5999, "AUD")).toBe("A$59.99");
    expect(formatPrice(500, "usd")).toBe("5.00 USD");
  });

  it("works out the annual saving honestly from the real prices", () => {
    // 12 × A$7.99 = A$95.88; A$95.88 − A$59.99 = A$35.89, 37% (rounded down, never up).
    expect(annualSaving({ unitAmount: 799, currency: "aud", interval: "month" }, { unitAmount: 5999, currency: "aud", interval: "year" })).toEqual({
      perMonth: "A$5.00",
      saving: "A$35.89",
      percent: 37,
    });
  });

  it("claims no saving when there isn't one, or the prices can't be compared", () => {
    expect(annualSaving({ unitAmount: 500, currency: "aud", interval: "month" }, { unitAmount: 6000, currency: "aud", interval: "year" })).toBeNull();
    expect(annualSaving({ unitAmount: 799, currency: "aud", interval: "month" }, { unitAmount: 5999, currency: "usd", interval: "year" })).toBeNull();
    expect(annualSaving({ unitAmount: 799, currency: "aud", interval: "year" }, { unitAmount: 5999, currency: "aud", interval: "year" })).toBeNull();
  });
});

describe("pitchPrices", () => {
  it("shows the annual price with a short monthly equivalent", () => {
    const p = pitchPrices({ unitAmount: 799, currency: "aud", interval: "month" }, { unitAmount: 5999, currency: "aud", interval: "year" });
    expect(p).toEqual({ annual: { price: "A$59.99", perMonth: "A$5", percent: 37 }, monthly: { price: "A$7.99" } });
  });

  it("keeps cents when they aren't zero, and drops the saving when there isn't one", () => {
    expect(shortPrice(550, "aud")).toBe("A$5.50");
    const p = pitchPrices({ unitAmount: 100, currency: "aud", interval: "month" }, { unitAmount: 1200, currency: "aud", interval: "year" });
    expect(p.annual).toEqual({ price: "A$12.00", perMonth: null, percent: null });
  });
});
