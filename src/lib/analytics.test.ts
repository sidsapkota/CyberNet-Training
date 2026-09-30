import { describe, expect, it } from "vitest";
import { cleanSource, redactUrl, sourceFromUrl } from "./analytics";

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
    expect(redactUrl("https://cybernettrainer.com/account?welcome=1&email=a%40b.c#x")).toBe("https://cybernettrainer.com/account");
    expect(redactUrl("https://cybernettrainer.com/lesson/x?utm_source=tiktok&code=secret")).toBe(
      "https://cybernettrainer.com/lesson/x?utm_source=tiktok",
    );
  });

  it("never tracks dev pages", () => {
    expect(redactUrl("https://cybernettrainer.com/dev/cards")).toBeNull();
  });
});
