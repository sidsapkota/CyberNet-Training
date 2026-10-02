import { describe, expect, it } from "vitest";
import { loadContent } from "@/lib/content/load";
import { DEFAULT_AVATAR, itemById, PRO_IDS, REWARD_ITEMS, SPIN_POOL, STARTER_IDS } from "./items";
import { earnedSpins, effectiveAvatar, maxEarnableSpins, ownedItems, pickReward, STREAK_SPINS } from "./rules";

const { courses } = loadContent();

describe("the item list", () => {
  it("has unique, database-safe ids and a default", () => {
    const ids = REWARD_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,40}$/);
    expect(itemById(DEFAULT_AVATAR)?.source).toBe("starter");
    expect(PRO_IDS).toHaveLength(3);
    expect(STARTER_IDS.length).toBeGreaterThan(0);
  });

  it("every spin wins: there are at least as many spin items as spins the courses can earn", () => {
    expect(SPIN_POOL.length).toBeGreaterThanOrEqual(maxEarnableSpins(courses));
  });
});

describe("earning spins (only by learning)", () => {
  const course = courses[0]!;
  const quizOf = (i: number) => course.modules[i]!.lessons.find((l) => l.kind === "quiz")!.id;

  it("one per finished module, one per finished course, one at each streak milestone", () => {
    expect(earnedSpins({ passedQuizIds: new Set(), courses, longestStreak: 0 })).toEqual([]);
    expect(earnedSpins({ passedQuizIds: new Set([quizOf(0)]), courses, longestStreak: 0 })).toEqual([`module:${course.modules[0]!.id}`]);
    const all = new Set(course.modules.map((_, i) => quizOf(i)));
    const keys = earnedSpins({ passedQuizIds: all, courses, longestStreak: 30 });
    expect(keys).toContain(`course:${course.id}`);
    expect(keys.filter((k) => k.startsWith("module:"))).toHaveLength(course.modules.length);
    expect(keys.filter((k) => k.startsWith("streak:"))).toEqual(["streak:7", "streak:30"]);
    expect(STREAK_SPINS).toEqual([7, 30, 100]);
  });

  it("keys match the database check", () => {
    const all = new Set(courses.flatMap((c) => c.modules.flatMap((m) => m.lessons.filter((l) => l.kind === "quiz").map((l) => l.id))));
    for (const key of earnedSpins({ passedQuizIds: all, courses, longestStreak: 100 })) expect(key).toMatch(/^(module|course|streak):[a-z0-9-]{1,80}$/);
  });
});

describe("spinning", () => {
  it("always gives an unowned spin item, never a Pro or starter item", () => {
    let owned = ownedItems([], true);
    for (let i = 0; i < SPIN_POOL.length; i++) {
      const prize = pickReward(owned, () => (i * 0.37) % 1);
      expect(prize).not.toBeNull();
      expect(owned.has(prize!)).toBe(false);
      expect(itemById(prize)?.source).toBe("spin");
      owned = new Set([...owned, prize!]);
    }
    expect(pickReward(owned)).toBeNull();
  });

  it("is equally likely across what's left", () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < SPIN_POOL.length; i++) {
      const prize = pickReward(new Set(), () => (i + 0.5) / SPIN_POOL.length)!;
      counts.set(prize, (counts.get(prize) ?? 0) + 1);
    }
    expect(counts.size).toBe(SPIN_POOL.length);
  });
});

describe("wearing", () => {
  it("Pro items only while Pro; anything unknown falls back to the mascot", () => {
    expect(ownedItems([], false).has("pro-crown")).toBe(false);
    expect(ownedItems([], true).has("pro-crown")).toBe(true);
    expect(effectiveAvatar("pro-crown", true)).toBe("pro-crown");
    expect(effectiveAvatar("pro-crown", false)).toBe(DEFAULT_AVATAR);
    expect(effectiveAvatar("not-real", true)).toBe(DEFAULT_AVATAR);
    expect(effectiveAvatar("badge-rocket", false)).toBe("badge-rocket");
  });
});
