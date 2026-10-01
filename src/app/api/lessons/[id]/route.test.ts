import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotSignedInError } from "@/lib/auth/verify";
import { SupabaseEnvError } from "@/lib/supabase/env";

vi.mock("server-only", () => ({}));
const auth = vi.hoisted(() => ({ requireUser: vi.fn() }));
const pro = vi.hoisted(() => ({ getEntitlement: vi.fn(), hasFinishedLesson: vi.fn(), openLessonToday: vi.fn() }));
vi.mock("@/lib/auth/server", () => auth);
vi.mock("@/lib/pro/server", () => pro);

const { GET } = await import("./route");

async function get(id: string, query = "") {
  const response = await GET(new Request(`http://localhost/api/lessons/${id}${query}`), { params: Promise.resolve({ id }) } as never);
  const body = (await response.json()) as { lesson?: { id: string; cards: unknown[] }; reason?: string; used?: number; limit?: number };
  return { status: response.status, body, cache: response.headers.get("cache-control") };
}

const guest = () => auth.requireUser.mockRejectedValue(new NotSignedInError());
const signedIn = (hasPro = false, { finished = false, room = true } = {}) => {
  auth.requireUser.mockResolvedValue({ id: "u1", createdAt: null });
  pro.getEntitlement.mockResolvedValue({ hasPro });
  pro.hasFinishedLesson.mockResolvedValue(finished);
  pro.openLessonToday.mockResolvedValue({ allowed: room, used: room ? 1 : 3, day: "2026-10-02" });
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

  it("asks guests to make a free account for Pro lessons too", async () => {
    guest();
    expect(await get("meet-the-os")).toMatchObject({ status: 401, body: { reason: "account" } });
  });

  it("lets free accounts open any lesson, Pro modules included, while there's room today", async () => {
    signedIn(false);
    for (const id of ["memory-vs-storage", "meet-the-os"]) expect((await get(id, "?tz=Australia%2FPerth")).status, id).toBe(200);
    expect(pro.openLessonToday).toHaveBeenCalledWith("u1", "meet-the-os", 3, "Australia/Perth");
  });

  it("refuses a new lesson once today's limit is used, with the reason", async () => {
    signedIn(false, { room: false });
    expect(await get("meet-the-os")).toEqual({ status: 403, body: { reason: "limit", used: 3, limit: 3 }, cache: "private, no-store" });
  });

  it("never counts replays, Pro learners or guest lessons", async () => {
    signedIn(false, { finished: true, room: false });
    expect((await get("meet-the-os")).status).toBe(200);
    vi.clearAllMocks();
    signedIn(true, { room: false });
    expect((await get("meet-the-os")).status).toBe(200);
    expect(pro.hasFinishedLesson).not.toHaveBeenCalled();
    vi.clearAllMocks();
    signedIn(false, { room: false });
    expect((await get("getting-help")).status).toBe(200);
    expect(pro.openLessonToday).not.toHaveBeenCalled();
  });

  it("ignores a time zone the runtime doesn't know", async () => {
    signedIn(false);
    await get("meet-the-os", "?tz=Mars%2FOlympus");
    expect(pro.openLessonToday).toHaveBeenCalledWith("u1", "meet-the-os", 3, null);
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
