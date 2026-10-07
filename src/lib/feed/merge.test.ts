import { describe, expect, it } from "vitest";
import { buildContentIndex, canCompleteLesson, cardXpFor } from "@/lib/progress/authority";
import { priceEvent, recomputeXp, withFeedLimit } from "@/lib/progress/merge";
import { emptySnapshot, type ProgressSnapshot, type XpEvent } from "@/lib/progress/types";
import { FEED_LESSON_ID } from "./rules";

const index = buildContentIndex([]);
const feed = new Map([
  ["a", 5],
  ["rare", 15],
]);
const at = (n: number) => new Date(Date.UTC(2026, 9, 7, 1, n)).toISOString();
const event = (cardId: string, xp: number, n = 0): XpEvent => ({ at: at(n), day: "2026-10-07", tz: "Australia/Sydney", kind: "card", lessonId: FEED_LESSON_ID, cardId, xp });

describe("Feed bytes in the guest merge", () => {
  it("are priced from the content, never above the byte's price, and unknown bytes are dropped", () => {
    const snap = { ...emptySnapshot(), cards: { "feed/a": { completedAt: at(0), xp: 50 }, "feed/rare": { completedAt: at(1), xp: 10 }, "feed/made-up": { completedAt: at(2), xp: 5 } } };
    const out = recomputeXp(snap, index, feed);
    expect(out.cards["feed/a"]?.xp).toBe(5);
    expect(out.cards["feed/rare"]?.xp).toBe(10); // capped lower that day: kept lower
    expect(out.cards["feed/made-up"]).toBeUndefined();
    expect(priceEvent(index, event("rare", 99), new Set(), feed)).toBe(15);
    expect(priceEvent(index, event("made-up", 5), new Set(), feed)).toBeNull();
    expect(priceEvent(index, { ...event("a", 5), kind: "practice" }, new Set(), feed)).toBeNull();
  });

  it("keep only the first 5 new bytes (what a guest can play), with their events", () => {
    const cards: ProgressSnapshot["cards"] = {};
    const xpEvents: XpEvent[] = [];
    for (let i = 0; i < 8; i++) {
      cards[`feed/b${i}`] = { completedAt: at(i), xp: 5 };
      xpEvents.push(event(`b${i}`, 5, i));
    }
    const local = { ...emptySnapshot(), cards, xpEvents };
    const account = { cards: { "feed/b0": { completedAt: at(0), xp: 5 } } };
    const out = withFeedLimit(local, account);
    expect(Object.keys(out.cards).sort()).toEqual(["feed/b1", "feed/b2", "feed/b3", "feed/b4", "feed/b5"]);
    expect(out.xpEvents.map((e) => e.cardId)).toEqual(["b1", "b2", "b3", "b4", "b5"]);
  });

  it("can't be paid through the lesson actions (the Feed isn't in the content index)", () => {
    expect(cardXpFor(index, FEED_LESSON_ID, "a", 10)).toBeNull();
    expect(canCompleteLesson(index, FEED_LESSON_ID, ["a"])).toBe(false);
  });
});
