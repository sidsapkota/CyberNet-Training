import { describe, expect, it } from "vitest";
import { cleanSource, eventData, redactUrl, sourceFromUrl } from "./analytics";

describe("analytics: where visitors came from", () => {
  it("takes utm_source first, then a /from/<platform> path", () => {
    expect(sourceFromUrl("/lesson/x", "?utm_source=TikTok")).toBe("tiktok");
    expect(sourceFromUrl("/from/youtube", "")).toBe("youtube");
    expect(sourceFromUrl("/from/youtube/whats-in-the-box", "?utm_source=insta")).toBe("insta");
    expect(sourceFromUrl("/", "")).toBeNull();
  });

  it("only keeps short, plain labels, so nothing personal can ride along", () => {
    expect(cleanSource("youtube_shorts")).toBe("youtube_shorts");
    expect(cleanSource("me@example.com")).toBeNull();
    expect(cleanSource("a".repeat(31))).toBeNull();
    expect(cleanSource("")).toBeNull();
  });
});

describe("analytics: URLs sent to Vercel", () => {
  it("drops every query parameter except utm_*, and the hash", () => {
    expect(redactUrl("https://cybernettraining.com/account?welcome=1&email=a%40b.c#x")).toBe("https://cybernettraining.com/account");
    expect(redactUrl("https://cybernettraining.com/lesson/x?utm_source=tiktok&code=secret")).toBe(
      "https://cybernettraining.com/lesson/x?utm_source=tiktok",
    );
  });

  it("never tracks dev pages", () => {
    expect(redactUrl("https://cybernettraining.com/dev/cards")).toBeNull();
  });
});

describe("eventData (funnel events)", () => {
  it("sends a lesson or a course id, plus the source, and nothing else", () => {
    expect(eventData("meet-the-os", "tiktok")).toEqual({ lesson: "meet-the-os", source: "tiktok" });
    expect(eventData({ course: "stay-safe-online" }, null)).toEqual({ course: "stay-safe-online" });
    expect(eventData(undefined, "youtube")).toEqual({ source: "youtube" });
  });

  it("drops anything that isn't a content id (so nothing personal is sent)", () => {
    expect(eventData("sam@example.com", null)).toEqual({});
    expect(eventData({ course: "Sam Smith" }, null)).toEqual({});
    expect(eventData("a".repeat(81), null)).toEqual({});
  });
});
