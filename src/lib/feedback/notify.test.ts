import { describe, expect, it } from "vitest";
import { busyNote, cleanPage, FEEDBACK_EMAILS_PER_HOUR, feedbackEmail, feedbackEmailDecision } from "./notify";

describe("feedback emails", () => {
  it("emails up to the hourly cap, sends one busy note, then waits", () => {
    expect(feedbackEmailDecision(1)).toBe("send");
    expect(feedbackEmailDecision(FEEDBACK_EMAILS_PER_HOUR)).toBe("send");
    expect(feedbackEmailDecision(FEEDBACK_EMAILS_PER_HOUR + 1)).toBe("busy-note");
    expect(feedbackEmailDecision(FEEDBACK_EMAILS_PER_HOUR + 2)).toBe("skip");
    expect(feedbackEmailDecision(500)).toBe("skip");
  });

  it("keeps only a same-site path for the page", () => {
    const origin = "https://cybernettraining.com";
    expect(cleanPage("https://cybernettraining.com/lesson/meet-the-os?token=secret", origin)).toBe("/lesson/meet-the-os");
    expect(cleanPage("/course/stay-safe-online", origin)).toBe("/course/stay-safe-online");
    expect(cleanPage("https://evil.example/phish", origin)).toBeNull();
    expect(cleanPage(42, origin)).toBeNull();
  });

  it("writes the email with the message, page, time and signed-in status only", () => {
    const { subject, text } = feedbackEmail({
      message: "The router card confused me.\nCould it say more?",
      lessonId: "routers-and-hops",
      lessonTitle: "Routers and Hops",
      rating: 3,
      page: "/lesson/routers-and-hops",
      signedIn: true,
      at: new Date("2026-10-02T01:00:00Z"),
    });
    expect(subject).toBe("Feedback: The router card confused me.");
    expect(text).toContain("Could it say more?");
    expect(text).toContain("Lesson: Routers and Hops (routers-and-hops)");
    expect(text).toContain("Page: /lesson/routers-and-hops");
    expect(text).toContain("Signed in: yes");
    expect(text).toContain("2026-10-02T01:00:00.000Z");
    expect(text).not.toMatch(/user id|@example/i);
    expect(busyNote().subject).toMatch(/waiting/);
  });
});
