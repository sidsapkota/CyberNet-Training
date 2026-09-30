import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SITE_URL, isIndexable, siteUrl } from "./site";

vi.mock("server-only", () => ({}));

describe("site URL", () => {
  it("uses cybernettraining.com unless a valid https origin is configured", () => {
    expect(siteUrl(undefined).toString()).toBe(`${DEFAULT_SITE_URL}/`);
    expect(siteUrl("not a url").origin).toBe(DEFAULT_SITE_URL);
    expect(siteUrl("http://evil.example").origin).toBe(DEFAULT_SITE_URL);
    expect(siteUrl("https://staging.cybernettraining.com/some/path").toString()).toBe("https://staging.cybernettraining.com/");
  });

  it("is only indexable in production", () => {
    expect(isIndexable("production")).toBe(true);
    expect(isIndexable("preview")).toBe(false);
    expect(isIndexable(undefined)).toBe(false);
  });
});

describe("sitemap.xml and robots.txt", () => {
  it("lists the public pages on the production domain, and never /dev or private pages", async () => {
    const { default: sitemap } = await import("@/app/sitemap");
    const urls = sitemap().map((e) => e.url);
    expect(urls).toContain("https://cybernettraining.com/");
    expect(urls).toContain("https://cybernettraining.com/lesson/whats-in-the-box");
    expect(urls).toContain("https://cybernettraining.com/course/inside-your-devices");
    expect(urls).toContain("https://cybernettraining.com/privacy");
    for (const url of urls) expect(url).not.toMatch(/\/(dev|account|auth|login|feedback|from)(\/|$)/);
  });

  it("blocks everything outside production, and private pages in production", async () => {
    const { default: robots } = await import("@/app/robots");
    const prev = process.env.VERCEL_ENV;
    try {
      process.env.VERCEL_ENV = "preview";
      expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" });
      process.env.VERCEL_ENV = "production";
      const prod = robots();
      expect(JSON.stringify(prod.rules)).toContain("/dev/");
      expect(prod.sitemap).toBe("https://cybernettraining.com/sitemap.xml");
    } finally {
      process.env.VERCEL_ENV = prev;
    }
  });
});
