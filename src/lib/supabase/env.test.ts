import { describe, expect, it } from "vitest";
import { isSecretKey, parseSupabaseEnv, SupabaseEnvError } from "./env";

/** Builds an unsigned JWT-shaped string with the given role (tests only). */
function fakeJwt(role: string): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ role, iss: "supabase" })}.signature`;
}

const URL_OK = "https://abcdefghijklmnop.supabase.co";

describe("parseSupabaseEnv", () => {
  it("accepts a publishable key and trims a trailing slash", () => {
    expect(parseSupabaseEnv({ url: `${URL_OK}/`, publishableKey: "sb_publishable_abc123" })).toEqual({
      url: URL_OK,
      publishableKey: "sb_publishable_abc123",
    });
  });

  it("accepts a legacy anon JWT", () => {
    expect(() => parseSupabaseEnv({ url: URL_OK, publishableKey: fakeJwt("anon") })).not.toThrow();
  });

  it("reports every missing value at once", () => {
    try {
      parseSupabaseEnv({});
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(SupabaseEnvError);
      const message = (error as Error).message;
      expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL is empty");
      expect(message).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is empty");
      expect(message).toContain(".env.local");
    }
  });

  it("treats whitespace-only values as missing", () => {
    expect(() => parseSupabaseEnv({ url: "  ", publishableKey: "  " })).toThrow(/is empty/);
  });

  it("rejects malformed and non-https URLs (localhost allowed)", () => {
    expect(() => parseSupabaseEnv({ url: "not a url", publishableKey: "sb_publishable_x" })).toThrow(/not a valid URL/);
    expect(() => parseSupabaseEnv({ url: "http://example.supabase.co", publishableKey: "sb_publishable_x" })).toThrow(
      /https/,
    );
    expect(() => parseSupabaseEnv({ url: "http://127.0.0.1:54321", publishableKey: "sb_publishable_x" })).not.toThrow();
  });

  it("refuses secret and service_role keys in the public variable", () => {
    expect(() => parseSupabaseEnv({ url: URL_OK, publishableKey: "sb_secret_abc" })).toThrow(/SECRET/);
    expect(() => parseSupabaseEnv({ url: URL_OK, publishableKey: fakeJwt("service_role") })).toThrow(/SECRET/);
  });
});

describe("isSecretKey", () => {
  it("recognises secret keys only", () => {
    expect(isSecretKey("sb_secret_abc")).toBe(true);
    expect(isSecretKey(fakeJwt("service_role"))).toBe(true);
    expect(isSecretKey(fakeJwt("anon"))).toBe(false);
    expect(isSecretKey("sb_publishable_abc")).toBe(false);
    expect(isSecretKey("eyJnot-a-jwt")).toBe(false);
  });
});
