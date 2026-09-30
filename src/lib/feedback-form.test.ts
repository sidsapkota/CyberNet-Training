import { describe, expect, it } from "vitest";
import { FEEDBACK_MAX, feedbackLesson, friendlyFeedbackError } from "./feedback-form";

describe("feedback form rules", () => {
  it("matches the database's 1,000-character cap", () => {
    expect(FEEDBACK_MAX).toBe(1000);
  });

  it("only fills in a real lesson from the URL", () => {
    expect(feedbackLesson("whats-in-the-box", ["whats-in-the-box"])).toBe("whats-in-the-box");
    expect(feedbackLesson("nope", ["whats-in-the-box"])).toBeNull();
    expect(feedbackLesson(undefined, ["whats-in-the-box"])).toBeNull();
    expect(feedbackLesson(["whats-in-the-box", "x"], ["whats-in-the-box"])).toBe("whats-in-the-box");
  });

  it("passes the database's friendly rate-limit messages through, and hides everything else", () => {
    expect(friendlyFeedbackError("Too much feedback from this session. Please try again later.")).toContain("Too much feedback");
    expect(friendlyFeedbackError('new row violates row-level security policy for table "feedback"')).toBe(
      "Couldn't send that. Check your connection and try again.",
    );
  });
});
