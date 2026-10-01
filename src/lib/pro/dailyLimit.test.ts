import { describe, expect, it } from "vitest";
import { countsTowardLimit, DAILY_LESSON_LIMIT, lessonsLeft, lessonsLeftLine, limitDay } from "./dailyLimit";
import { shouldRemindTrial, trialReminderEmail } from "./trialReminder";
import type { StripeSubscriptionLike } from "./webhook";

describe("daily lesson limit", () => {
  it("is 3 new lessons a day", () => {
    expect(DAILY_LESSON_LIMIT).toBe(3);
  });

  it("only counts new lessons for free accounts", () => {
    expect(countsTowardLimit({ guestOpen: false, hasPro: false, finished: false })).toBe(true);
    expect(countsTowardLimit({ guestOpen: true, hasPro: false, finished: false })).toBe(false); // first lessons, help modules
    expect(countsTowardLimit({ guestOpen: false, hasPro: true, finished: false })).toBe(false);
    expect(countsTowardLimit({ guestOpen: false, hasPro: false, finished: true })).toBe(false); // replays
  });

  it("dates the day in the learner's time zone, falling back to Sydney", () => {
    const now = new Date("2026-10-01T15:30:00Z"); // 1:30 am on the 2nd in Sydney (AEST, +10)
    expect(limitDay("Australia/Sydney", now)).toBe("2026-10-02");
    expect(limitDay("America/Los_Angeles", now)).toBe("2026-10-01");
    expect(limitDay(null, now)).toBe("2026-10-02");
    expect(limitDay("Not/AZone", now)).toBe("2026-10-02");
  });

  it("says how many are left, without counting down for Pro", () => {
    expect(lessonsLeft({ limited: true, used: 1, limit: 3 })).toBe(2);
    expect(lessonsLeft({ limited: true, used: 5, limit: 3 })).toBe(0);
    expect(lessonsLeft({ limited: false, used: 9, limit: 3 })).toBe(Infinity);
    expect(lessonsLeftLine({ limited: true, used: 0, limit: 3 })).toBe("3 new lessons left today");
    expect(lessonsLeftLine({ limited: true, used: 2, limit: 3 })).toBe("1 new lesson left today");
    expect(lessonsLeftLine({ limited: true, used: 3, limit: 3 })).toBe("No new lessons left today. Replays are free.");
    expect(lessonsLeftLine({ limited: false, used: 0, limit: 3 })).toBeNull();
  });
});

const unix = (iso: string) => Math.floor(Date.parse(iso) / 1000);
const sub = (over: Partial<StripeSubscriptionLike> = {}): StripeSubscriptionLike => ({
  id: "sub_A",
  customer: "cus_A",
  status: "trialing",
  cancel_at_period_end: false,
  cancel_at: null,
  trial_end: unix("2026-10-08T22:00:00Z"),
  start_date: unix("2026-10-01T22:00:00Z"),
  ended_at: null,
  items: { data: [{ price: { id: "price_Y", recurring: { interval: "year" }, unit_amount: 5999, currency: "aud" } }] },
  ...over,
});

describe("trial reminder", () => {
  const now = new Date("2026-10-05T22:00:00Z");

  it("goes only to trials that will become paid", () => {
    expect(shouldRemindTrial(sub(), now)).toBe(true);
    expect(shouldRemindTrial(sub({ cancel_at_period_end: true }), now)).toBe(false);
    expect(shouldRemindTrial(sub({ cancel_at: unix("2026-10-08T22:00:00Z") }), now)).toBe(false);
    expect(shouldRemindTrial(sub({ status: "active" }), now)).toBe(false);
    expect(shouldRemindTrial(sub({ trial_end: unix("2026-10-04T00:00:00Z") }), now)).toBe(false);
  });

  it("says when it ends (in the learner's time zone), what's charged and how to cancel", () => {
    const email = trialReminderEmail({ sub: sub(), name: "Sky", timeZone: "Australia/Sydney", accountUrl: "https://cybernettraining.com/account" });
    expect(email.subject).toBe("Your CyberNet Pro trial ends on Friday 9 October");
    expect(email.text).toContain("Hi Sky,");
    expect(email.text).toContain("your annual plan starts then and A$59.99 is charged");
    expect(email.text).toContain("https://cybernettraining.com/account");
    expect(email.text).toContain("You won't be charged");
    expect(email.text).not.toMatch(/hurry|last chance|don't miss/i);
  });

  it("escapes the nickname in the HTML", () => {
    const email = trialReminderEmail({ sub: sub(), name: "<b>x</b>", timeZone: null, accountUrl: "https://cybernettraining.com/account" });
    expect(email.html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(email.html).not.toContain("<b>x</b>");
  });
});
