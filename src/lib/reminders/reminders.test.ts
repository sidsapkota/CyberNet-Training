import { describe, expect, it } from "vitest";
import { reminderEmail, SENDER } from "./email";
import { clockIn, isLeagueReminderHour, leagueReminder, pickReminder, streakReminder } from "./rules";

const links = { go: "https://cybernettraining.com/api/email/go?r=1", unsubscribe: "https://cybernettraining.com/api/email/unsubscribe?t=abc", open: "https://cybernettraining.com/api/email/open?r=1", site: "cybernettraining.com" };

describe("streak reminder", () => {
  it("goes at 7 pm local, with a streak and no XP today", () => {
    expect(streakReminder({ localHour: 19, streak: 3, freezes: 0, xpToday: 0 })).toEqual({ kind: "streak", days: 3, endsTonight: true });
  });
  it("only says 'ends tonight' when no freeze would save it", () => {
    expect(streakReminder({ localHour: 19, streak: 8, freezes: 1, xpToday: 0 })).toEqual({ kind: "streak", days: 8, endsTonight: false });
  });
  it("never goes with no streak, after any XP today, or at another hour", () => {
    expect(streakReminder({ localHour: 19, streak: 0, freezes: 0, xpToday: 0 })).toBeNull();
    expect(streakReminder({ localHour: 19, streak: 3, freezes: 0, xpToday: 5 })).toBeNull();
    expect(streakReminder({ localHour: 18, streak: 3, freezes: 0, xpToday: 0 })).toBeNull();
  });
});

describe("league reminder", () => {
  const base = { open: true, leagueHour: true, localHour: 18, rank: 4, weeklyXp: 120, hoursLeft: 6 };
  it("goes on Sunday at 6 pm Sydney to ranked learners with XP", () => {
    expect(leagueReminder(base)).toEqual({ kind: "league", rank: 4, hoursLeft: 6 });
  });
  it("never while leagues are closed, outside the hour, unranked, with no XP, or at night where they are", () => {
    expect(leagueReminder({ ...base, open: false })).toBeNull();
    expect(leagueReminder({ ...base, leagueHour: false })).toBeNull();
    expect(leagueReminder({ ...base, rank: null })).toBeNull();
    expect(leagueReminder({ ...base, weeklyXp: 0 })).toBeNull();
    expect(leagueReminder({ ...base, localHour: 3 })).toBeNull();
    expect(leagueReminder({ ...base, localHour: 22 })).toBeNull();
  });
  it("knows the hour: Sunday 6 pm in Sydney (daylight saving included)", () => {
    expect(isLeagueReminderHour(new Date("2026-10-11T07:30:00Z"))).toBe(true); // Sun 18:30 AEDT
    expect(isLeagueReminderHour(new Date("2026-10-11T08:30:00Z"))).toBe(false); // 19:30
    expect(isLeagueReminderHour(new Date("2026-07-12T08:30:00Z"))).toBe(true); // Sun 18:30 AEST
  });
});

describe("one a day", () => {
  it("the league reminder wins over the streak one", () => {
    const league = { kind: "league", rank: 2, hoursLeft: 6 } as const;
    const streak = { kind: "streak", days: 3, endsTonight: true } as const;
    expect(pickReminder(league, streak)).toBe(league);
    expect(pickReminder(null, streak)).toBe(streak);
    expect(pickReminder(null, null)).toBeNull();
  });
});

describe("clock", () => {
  it("reads the learner's own date, hour and weekday", () => {
    expect(clockIn(new Date("2026-10-07T09:00:00Z"), "Australia/Sydney")).toEqual({ day: "2026-10-07", hour: 20, weekday: 3 });
    expect(clockIn(new Date("2026-10-07T02:00:00Z"), "America/Los_Angeles")).toEqual({ day: "2026-10-06", hour: 19, weekday: 2 });
  });
});

describe("the email", () => {
  it("names the sender, says why, and carries a one-tap unsubscribe link in both parts", () => {
    const email = reminderEmail({ kind: "streak", days: 3, endsTonight: true }, "PacketPilot482", links);
    expect(SENDER).toContain("CyberNet Training");
    expect(email.subject).toBe("Your 3-day streak ends tonight");
    for (const part of [email.text, email.html]) {
      expect(part).toContain("turned on reminder emails");
      expect(part).toContain("hello@cybernettraining.com");
      expect(part).toContain(links.unsubscribe.replace(/&/g, part === email.html ? "&amp;" : "&"));
    }
    expect(email.html).toContain(links.open);
  });
  it("is honest when a freeze would save the streak, and says the rank for leagues", () => {
    expect(reminderEmail({ kind: "streak", days: 9, endsTonight: false }, null, links).subject).toBe("Keep your 9-day streak going");
    expect(reminderEmail({ kind: "league", rank: 4, hoursLeft: 6 }, "A", links).subject).toBe("Your league ends in 6 hours. You're #4");
  });
  it("never pitches Pro or offers anything", () => {
    const all = [reminderEmail({ kind: "streak", days: 1, endsTonight: true }, "A", links), reminderEmail({ kind: "league", rank: 1, hoursLeft: 6 }, "A", links)];
    for (const e of all) expect(`${e.subject} ${e.text}`).not.toMatch(/\bpro\b|trial|offer|discount|upgrade/i);
  });
  it("escapes the username in the HTML", () => {
    expect(reminderEmail({ kind: "streak", days: 1, endsTonight: true }, "<b>", links).html).not.toContain("<b>,");
  });
});
