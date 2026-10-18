import { describe, expect, it } from "vitest";
import { loadContent } from "@/lib/content/load";
import { loadBytes } from "./bytes";
import { BYTE_XP, byteXp, courseWeights, DAILY_BYTES, FEED_DAILY_CAP, feedOrder, feedXpOn, RARE_BYTE_XP, seedFrom, sessionBucket } from "./rules";
import { byteXpToday, bytesLeft, feedBytesOn, pickToday } from "./today";

describe("feed bytes", () => {
  const { lessons, courses } = loadContent();
  const bytes = loadBytes(lessons);

  it("all load: real cards of a supported type, hooks of 12 words or fewer", () => {
    expect(bytes.length).toBeGreaterThanOrEqual(30);
  });

  it("mix every course", () => {
    for (const course of courses) expect(bytes.filter((b) => b.courseId === course.id).length, course.id).toBeGreaterThanOrEqual(5);
  });
});

describe("feed XP", () => {
  it("pays 5 (rare 15) until the daily cap", () => {
    expect(byteXp(false, 0)).toBe(BYTE_XP);
    expect(byteXp(true, 0)).toBe(RARE_BYTE_XP);
    expect(byteXp(true, FEED_DAILY_CAP - 5)).toBe(5);
    expect(byteXp(false, FEED_DAILY_CAP)).toBe(0);
  });
  it("counts today's feed XP from the ledger", () => {
    const events = [
      { day: "2026-10-07", lessonId: "feed", xp: 5 },
      { day: "2026-10-07", lessonId: "feed", xp: 15 },
      { day: "2026-10-07", lessonId: "strong-passwords", xp: 10 },
      { day: "2026-10-06", lessonId: "feed", xp: 5 },
    ];
    expect(feedXpOn(events, "2026-10-07")).toBe(20);
  });
});

describe("feed order", () => {
  const bytes = Array.from({ length: 12 }, (_, i) => ({ id: `b${i}`, courseId: ["a", "b", "c"][i % 3]! }));

  it("is the same for the same seed and different for another", () => {
    const one = feedOrder(bytes, seedFrom("me|2026-10-07")).map((b) => b.id);
    expect(feedOrder(bytes, seedFrom("me|2026-10-07")).map((b) => b.id)).toEqual(one);
    expect(feedOrder(bytes, seedFrom("me|2026-10-08")).map((b) => b.id)).not.toEqual(one);
  });

  it("never puts the same course twice in a row while another is waiting", () => {
    const order = feedOrder(bytes, 7);
    for (let i = 1; i < order.length; i++) expect(order[i]!.courseId).not.toBe(order[i - 1]!.courseId);
  });

  it("puts bytes already answered at the end", () => {
    const order = feedOrder(bytes, 3, undefined, new Set(["b0", "b1"]));
    expect(order.slice(-2).map((b) => b.id).sort()).toEqual(["b0", "b1"]);
  });

  it("leans toward liked courses without crowding others out", () => {
    let early = 0;
    for (let seed = 0; seed < 200; seed++) early += feedOrder(bytes, seed, (c) => (c === "a" ? 2 : 1)).slice(0, 3).filter((b) => b.courseId === "a").length;
    expect(early / 200).toBeGreaterThan(1); // more than the even share of 1 in the first 3
    expect(early / 200).toBeLessThan(2);
    expect(courseWeights({ a: 6 }, {})("a")).toBe(2);
    expect(courseWeights({}, {})("a")).toBe(1);
  });
});

describe("today's bytes (3 a day)", () => {
  const day = "2026-10-20";
  const paid = (ids: string[], on = day) => ids.map((cardId) => ({ day: on, lessonId: "feed", cardId, xp: 5 }));
  const ordered = ["b1", "b2", "b3", "b4", "b5"].map((id) => ({ id }));

  it("pays nothing once today's 3 bytes are paid, even under the XP cap", () => {
    expect(DAILY_BYTES).toBe(3);
    expect(byteXpToday(false, paid(["a", "b"]), day)).toBe(BYTE_XP);
    expect(byteXpToday(true, paid(["a", "b", "c"]), day)).toBe(0);
    expect(byteXpToday(false, paid(["a", "b", "c"], "2026-10-19"), day)).toBe(BYTE_XP);
    expect(feedBytesOn([...paid(["a"]), { day, lessonId: "strong-passwords", cardId: "x", xp: 10 }], day)).toEqual(["a"]);
  });

  it("are the first 3 of the order, then the same 3 all day for the same learner", () => {
    const first = pickToday(ordered, null, day, "guest");
    expect(first.bytes.map((b) => b.id)).toEqual(["b1", "b2", "b3"]);
    const saved = { ...first.record, ids: ["b5", "b4", "b1"], answered: ["b5"] };
    expect(pickToday(ordered, saved, day, "guest").bytes.map((b) => b.id)).toEqual(["b5", "b4", "b1"]);
    expect(pickToday(ordered, saved, "2026-10-21", "guest").bytes.map((b) => b.id)).toEqual(["b1", "b2", "b3"]);
    expect(pickToday(ordered, saved, day, "user-2").record.answered).toEqual([]);
    expect(pickToday(ordered, { ...saved, ids: ["gone"] }, day, "guest").bytes.map((b) => b.id)).toEqual(["b1", "b2", "b3"]);
  });

  it("keep a byte already finished today (the landing page's) as one of the 3", () => {
    expect(pickToday(ordered, null, day, "guest", ["b4"]).bytes.map((b) => b.id)).toEqual(["b4", "b1", "b2"]);
  });

  it("counts what's left from answers on this device and bytes paid on any device", () => {
    const saved = { day, who: "u1", ids: ["b1", "b2", "b3"], answered: ["b1"] };
    expect(bytesLeft(null, [], day, "u1")).toBe(3);
    expect(bytesLeft(saved, [], day, "u1")).toBe(2);
    expect(bytesLeft(saved, ["b1", "b2"], day, "u1")).toBe(1);
    expect(bytesLeft(saved, ["b2", "b3", "b4"], day, "u1")).toBe(0);
    expect(bytesLeft(saved, [], "2026-10-21", "u1")).toBe(3);
  });
});

describe("session buckets", () => {
  it("are words, not numbers", () => {
    expect(sessionBucket(30_000)).toBe("under-1m");
    expect(sessionBucket(16 * 60_000)).toBe("15m-plus");
  });
});

describe("the video view's right answers", () => {
  it("grade as correct for every byte (with the card's own grader)", async () => {
    const { rightAnswer } = await import("./solve");
    const { getCardDefinition } = await import("@/cards/registry");
    for (const byte of loadBytes(loadContent().lessons)) {
      const definition = getCardDefinition(byte.card);
      if (!definition.interactive) continue;
      expect(definition.grade(byte.card, rightAnswer(byte.card)).correct, byte.id).toBe(true);
    }
  });
});
