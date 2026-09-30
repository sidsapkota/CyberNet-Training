/**
 * Showing Stripe's prices honestly. The amounts come from Stripe (never written in code); this
 * only formats them and works out the annual saving from the real numbers.
 */

export interface StripePrice {
  /** In cents. */
  unitAmount: number;
  currency: string;
  interval: "month" | "year";
}

/** "A$7.99" for Australian dollars (so it's never mistaken for US dollars); other currencies by code. */
export function formatPrice(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(2);
  return currency.toLowerCase() === "aud" ? `A$${amount}` : `${amount} ${currency.toUpperCase()}`;
}

export interface AnnualSaving {
  /** The annual price spread over 12 months, rounded to the cent. */
  perMonth: string;
  /** Twelve monthly payments minus one annual payment. */
  saving: string;
  /** Whole percent saved. */
  percent: number;
}

/** The annual plan against 12 months of the monthly plan. Null if it doesn't actually save anything. */
export function annualSaving(monthly: StripePrice, annual: StripePrice): AnnualSaving | null {
  if (monthly.currency.toLowerCase() !== annual.currency.toLowerCase()) return null;
  if (monthly.interval !== "month" || annual.interval !== "year") return null;
  const twelve = monthly.unitAmount * 12;
  const saved = twelve - annual.unitAmount;
  if (saved <= 0) return null;
  return {
    perMonth: formatPrice(Math.round(annual.unitAmount / 12), annual.currency),
    saving: formatPrice(saved, annual.currency),
    percent: Math.floor((saved / twelve) * 100),
  };
}
