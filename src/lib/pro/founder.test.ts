import { describe, expect, it } from "vitest";
import { hasPro, proCosmeticUntil, proIntervals, proStatus } from "./entitlement";
import { proLine } from "./describe";
import { founderCopy, founderCounter, founderOfferOn, founderPurchaseOf, fullyRefundedPayment, seatsLeftText, showFounderOffer } from "./founder";
import { FOUNDER_ERRORS, FOUNDER_ERROR_TEXT, FOUNDER_RETRYABLE, FOUNDER_SIGN_IN_PATH, founderErrorData, isFounderContinue } from "./founder";

const monthly = { unitAmount: 799, currency: "aud", interval: "month" as const };
const NOW = new Date("2026-10-07T00:00:00Z");

describe("founderCopy: the real comparison, from the live prices", () => {
  it("A$29 against A$7.99 a month", () => {
    expect(founderCopy({ unitAmount: 2900, currency: "aud" }, monthly)).toEqual({
      price: "A$29",
      headline: "Lifetime Pro for A$29, less than 4 months of the monthly plan",
      comparison: "A year of monthly is A$95.88. This is A$29, once.",
    });
  });

  it("stays true when prices change (always fewer months than it says)", () => {
    for (const [founder, month] of [[2900, 999], [2900, 725], [3000, 1000], [4999, 899], [500, 799]] as const) {
      const copy = founderCopy({ unitAmount: founder, currency: "aud" }, { ...monthly, unitAmount: month });
      const n = Number(/less than (\d+) month/.exec(copy.headline)?.[1]);
      expect(founder).toBeLessThan(n * month);
      expect(founder).toBeGreaterThanOrEqual((n - 1) * month);
    }
    expect(founderCopy({ unitAmount: 500, currency: "aud" }, monthly).headline).toBe("Lifetime Pro for A$5, less than 1 month of the monthly plan");
    expect(founderCopy({ unitAmount: 2950, currency: "aud" }, monthly).price).toBe("A$29.50");
  });

  it("never invents a comparison across currencies", () => {
    expect(founderCopy({ unitAmount: 2900, currency: "usd" }, monthly)).toEqual({ price: "29 USD", headline: "Lifetime Pro for 29 USD", comparison: "29 USD, once. Nothing to renew." });
    expect(founderCopy({ unitAmount: 2900, currency: "aud" }, null).headline).toBe("Lifetime Pro for A$29");
  });
});

describe("founderCounter", () => {
  it("counts what's left, and sells out at 50", () => {
    expect(founderCounter({ sold: 13, held: 0, total: 50 })).toEqual({ left: 37, total: 50, soldOut: false, allHeld: false });
    expect(seatsLeftText(founderCounter({ sold: 13, held: 0, total: 50 }))).toBe("37 of 50 left");
    expect(founderCounter({ sold: 50, held: 0, total: 50 }).soldOut).toBe(true);
    expect(founderCounter({ sold: 52, held: 0, total: 50 })).toMatchObject({ left: 0, soldOut: true });
  });

  it("says when the last seats are all in someone's checkout", () => {
    expect(founderCounter({ sold: 48, held: 2, total: 50 }).allHeld).toBe(true);
    expect(founderCounter({ sold: 48, held: 1, total: 50 }).allHeld).toBe(false);
  });
});

describe("founderOfferOn: off unless switched on", () => {
  it("needs FOUNDER_OFFER=on and a price", () => {
    expect(founderOfferOn({})).toBe(false);
    expect(founderOfferOn({ price: "price_1UM0pXRt4PD9fCsfxqwBBuf0" })).toBe(false);
    expect(founderOfferOn({ flag: "off", price: "price_1UM0pXRt4PD9fCsfxqwBBuf0" })).toBe(false);
    expect(founderOfferOn({ flag: "on" })).toBe(false);
    expect(founderOfferOn({ flag: " ON ", price: "price_1UM0pXRt4PD9fCsfxqwBBuf0" })).toBe(true);
  });
});

describe("showFounderOffer", () => {
  const offer = { price: "A$29", headline: "h", comparison: "c", counter: founderCounter({ sold: 1, held: 0, total: 50 }) };
  it("shows to guests, free learners and early-user grant holders", () => {
    expect(showFounderOffer(offer, null)).toBe(true);
    expect(showFounderOffer(offer, { loading: false, kind: "none" })).toBe(true);
    expect(showFounderOffer(offer, { loading: false, kind: "grant" })).toBe(true);
  });
  it("never to subscribers or founders, never while loading, never when sold out", () => {
    expect(showFounderOffer(offer, { loading: false, kind: "subscription" })).toBe(false);
    expect(showFounderOffer(offer, { loading: false, kind: "founder" })).toBe(false);
    expect(showFounderOffer(offer, { loading: true })).toBe(false);
    expect(showFounderOffer({ ...offer, counter: founderCounter({ sold: 50, held: 0, total: 50 }) }, null)).toBe(false);
    expect(showFounderOffer(null, null)).toBe(false);
  });
});

describe("Stripe objects", () => {
  const USER = "11111111-2222-3333-4444-555555555555";
  const paid = { id: "cs_test_A", mode: "payment", payment_status: "paid", metadata: { offer: "founder" }, client_reference_id: USER, payment_intent: "pi_A", amount_total: 2900, currency: "aud" };
  it("reads a paid founding session", () => {
    expect(founderPurchaseOf(paid)).toEqual({ userId: USER, sessionId: "cs_test_A", paymentIntentId: "pi_A", amountTotal: 2900, currency: "aud" });
    expect(founderPurchaseOf({ ...paid, payment_intent: { id: "pi_A" } })?.paymentIntentId).toBe("pi_A");
  });
  it("refuses anything else", () => {
    expect(founderPurchaseOf({ ...paid, payment_status: "unpaid" })).toBeNull();
    expect(founderPurchaseOf({ ...paid, mode: "subscription" })).toBeNull();
    expect(founderPurchaseOf({ ...paid, metadata: { offer: "other" } })).toBeNull();
    expect(founderPurchaseOf({ ...paid, client_reference_id: "x" })).toBeNull();
    expect(founderPurchaseOf({ ...paid, payment_intent: null })).toBeNull();
  });
  it("only a full refund counts", () => {
    expect(fullyRefundedPayment({ refunded: true, payment_intent: "pi_A" })).toBe("pi_A");
    expect(fullyRefundedPayment({ refunded: false, payment_intent: "pi_A" })).toBeNull();
    expect(fullyRefundedPayment({ refunded: true, payment_intent: null })).toBeNull();
  });
});

describe("entitlement with a founding seat", () => {
  const founder = { purchasedAt: "2026-10-05T00:00:00Z" };
  it("is lifetime Pro", () => {
    expect(hasPro([], null, new Date("2040-01-01T00:00:00Z"), founder)).toBe(true);
    expect(hasPro([], null, NOW)).toBe(false);
    expect(proStatus([], null, NOW, founder)).toEqual({ kind: "founder", purchasedAt: founder.purchasedAt });
    expect(proIntervals([], null, founder)).toEqual([{ start: Date.parse(founder.purchasedAt), end: null }]);
    expect(proLine({ kind: "founder", purchasedAt: founder.purchasedAt })).toBe("Founding Member: lifetime Pro, for as long as CyberNet Training runs.");
  });
  it("stamps the cosmetic frame a week ahead (renewed on visits, so a refunded seat's fades)", () => {
    expect(proCosmeticUntil([], null, NOW, founder)).toBe("2026-10-14T00:00:00.000Z");
    expect(proCosmeticUntil([], null, NOW)).toBeNull();
  });
});

describe("the steps after the click", () => {
  it("sends a guest to sign in and back to /pro, one tap from checkout", () => {
    const next = new URL(`https://x.example${FOUNDER_SIGN_IN_PATH}`).searchParams.get("next");
    expect(next).toBe("/pro?buy=founder");
    expect(isFounderContinue("?buy=founder")).toBe(true);
    expect(isFounderContinue("?from=nav")).toBe(false);
  });

  it("checkout errors carry only the screen and a known reason", () => {
    expect(founderErrorData("pro_page", "stripe")).toEqual({ source: "pro_page", reason: "stripe" });
    expect(founderErrorData("continue", "age")).toEqual({ source: "continue", reason: "age" });
    expect(founderErrorData("somewhere", "a@b.example")).toEqual({});
  });

  it("every reason has friendly words, and only some can be retried", () => {
    for (const code of FOUNDER_ERRORS) expect(FOUNDER_ERROR_TEXT[code].length).toBeGreaterThan(10);
    expect([...FOUNDER_RETRYABLE].sort()).toEqual(["all_held", "network", "stripe"]);
  });
});
