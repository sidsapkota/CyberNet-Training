import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotSignedInError } from "@/lib/auth/verify";
import { SupabaseEnvError } from "@/lib/supabase/env";

vi.mock("server-only", () => ({}));
const auth = vi.hoisted(() => ({ requireUser: vi.fn() }));
const pro = vi.hoisted(() => ({ getEntitlement: vi.fn() }));
vi.mock("@/lib/auth/server", () => auth);
vi.mock("@/lib/pro/server", () => pro);

const { GET } = await import("./route");

async function get(id: string) {
  const response = await GET(new Request(`http://localhost/api/lessons/${id}`), { params: Promise.resolve({ id }) } as never);
  const body = (await response.json()) as { lesson?: { id: string; cards: unknown[] }; reason?: string };
  return { status: response.status, body, cache: response.headers.get("cache-control") };
}

const guest = () => auth.requireUser.mockRejectedValue(new NotSignedInError());
const signedIn = (hasPro = false) => {
  auth.requireUser.mockResolvedValue({ id: "u1", createdAt: null });
  pro.getEntitlement.mockResolvedValue({ hasPro });
};

describe("/api/lessons/[id]: who gets a lesson's cards", () => {
  beforeEach(() => vi.resetAllMocks());

  it("serves each course's first lesson to guests", async () => {
    guest();
    for (const id of ["whats-in-the-box", "bits-and-binary", "strong-passwords"]) {
      const { status, body, cache } = await get(id);
      expect(status, id).toBe(200);
      expect(body.lesson?.cards.length).toBeGreaterThan(0);
      expect(cache).toBe("private, no-store");
    }
  });

  it("serves every When Things Go Wrong lesson and quiz to guests", async () => {
    guest();
    for (const id of ["signs-of-a-hack", "getting-help", "stay-safe-online-final"]) expect((await get(id)).status, id).toBe(200);
  });

  it("asks guests to make a free account for the rest of a free module", async () => {
    guest();
    for (const id of ["memory-vs-storage", "binary-and-data-quiz", "two-step-sign-in"]) {
      const { status, body } = await get(id);
      expect(status, id).toBe(401);
      expect(body).toEqual({ reason: "account" });
    }
  });

  it("serves account lessons to anyone signed in, without checking Pro", async () => {
    signedIn(false);
    expect((await get("memory-vs-storage")).status).toBe(200);
    expect(pro.getEntitlement).not.toHaveBeenCalled();
  });

  it("keeps Pro lessons for Pro learners", async () => {
    guest();
    expect(await get("meet-the-os")).toMatchObject({ status: 401, body: { reason: "sign-in" } });
    signedIn(false);
    expect(await get("meet-the-os")).toMatchObject({ status: 403, body: { reason: "pro" } });
    signedIn(true);
    expect((await get("meet-the-os")).status).toBe(200);
  });

  it("without accounts set up, free lessons stay open (nobody could sign up) and Pro stays locked", async () => {
    auth.requireUser.mockRejectedValue(new SupabaseEnvError(["not configured"]));
    expect((await get("memory-vs-storage")).status).toBe(200);
    expect((await get("meet-the-os")).status).toBe(403);
  });

  it("404s unknown lessons", async () => {
    expect((await get("no-such-lesson")).status).toBe(404);
  });
});
