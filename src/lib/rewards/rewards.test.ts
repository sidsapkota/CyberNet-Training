import { describe, expect, it } from "vitest";
import { DRAWN_ITEM_IDS } from "@/components/mascot/outfit/accessories";
import { loadContent } from "@/lib/content/load";
import { AVATAR_ITEMS, FREE_IDS, itemById, PRO_IDS, SLOTS, SPIN_POOL, unlockLabel } from "./items";
import { earnedSpins, effectiveOutfit, milestoneItems, milestonesFrom, NO_MILESTONES, ownedItems, pickReward, spinCounts, STREAK_SPINS, validOutfit, wearItem } from "./rules";

const { courses } = loadContent();

describe("the item list", () => {
  it("has the 12 items from the art sheet, with database-safe ids, each drawn", () => {
    const ids = AVATAR_ITEMS.map((i) => i.id);
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,40}$/);
    expect(new Set(DRAWN_ITEM_IDS)).toEqual(new Set(ids));
    for (const item of AVATAR_ITEMS) expect(SLOTS).toContain(item.slot);
  });

  it("follows the approved unlock table", () => {
    const how = Object.fromEntries(AVATAR_ITEMS.map((i) => [i.id, unlockLabel(i)]));
    expect(how).toEqual({
      cap: "Free",
      glasses: "Free",
      hoodie: "Free",
      beanie: "From a spin",
      headband: "From a spin",
      headset: "From a spin",
      visor: "From a spin",
      scarf: "7-day streak",
      "grad-cap": "Finish a course",
      jetpack: "30-day streak",
      crown: "Pro",
      cape: "Pro",
    });
    expect(FREE_IDS).toEqual(["cap", "glasses", "hoodie"]);
    expect(PRO_IDS).toEqual(["crown", "cape"]);
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

describe("what you own", () => {
  it("new accounts start with the 3 free items, and nothing else", () => {
    expect([...ownedItems([], false)].sort()).toEqual(["cap", "glasses", "hoodie"]);
  });

  it("milestones unlock for good: scarf at 7 days, jetpack at 30, grad cap for a finished course", () => {
    expect(milestoneItems({ longestStreak: 6, finishedCourse: false })).toEqual([]);
    expect(milestoneItems({ longestStreak: 7, finishedCourse: false })).toEqual(["scarf"]);
    expect(milestoneItems({ longestStreak: 30, finishedCourse: true }).sort()).toEqual(["grad-cap", "jetpack", "scarf"]);
    const course = courses[0]!;
    const final = course.modules.at(-1)!.lessons.find((l) => l.kind === "quiz")!.id;
    expect(milestonesFrom({ passedQuizIds: new Set([final]), courses, longestStreak: 2 })).toEqual({ longestStreak: 2, finishedCourse: true });
  });

  it("Pro items only while Pro; won ids only count if they're spin items", () => {
    expect(ownedItems([], false).has("crown")).toBe(false);
    expect(ownedItems([], true).has("cape")).toBe(true);
    expect(ownedItems(["crown", "jetpack", "badge-rocket"], false)).toEqual(ownedItems([], false));
    expect(ownedItems(["beanie"], false).has("beanie")).toBe(true);
  });
});

describe("spinning", () => {
  it("always gives an unowned spin item, never a Pro, free or milestone item", () => {
    let owned = ownedItems([], true, { longestStreak: 100, finishedCourse: true });
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

  it("only offers a spin while there's something to win; the rest are saved for new items", () => {
    const none = ownedItems([], false);
    expect(spinCounts(0, none)).toEqual({ ready: 0, saved: 0 });
    expect(spinCounts(2, none)).toEqual({ ready: 2, saved: 0 });
    expect(spinCounts(6, none)).toEqual({ ready: 4, saved: 2 });
    const all = ownedItems(SPIN_POOL.map((i) => i.id), false);
    expect(spinCounts(3, all)).toEqual({ ready: 0, saved: 3 });
  });
});

describe("wearing", () => {
  it("stacks across slots: glasses + beanie + scarf + cape all together", () => {
    let outfit: string[] = [];
    for (const id of ["cape", "scarf", "beanie", "glasses"]) outfit = wearItem(outfit, id);
    expect(outfit).toEqual(["beanie", "glasses", "scarf", "cape"]);
  });

  it("head items replace each other, and tapping a worn item takes it off", () => {
    let outfit = wearItem(["cap", "glasses"], "crown");
    expect(outfit).toEqual(["crown", "glasses"]);
    outfit = wearItem(outfit, "grad-cap");
    expect(outfit).toEqual(["grad-cap", "glasses"]);
    expect(wearItem(outfit, "glasses")).toEqual(["grad-cap"]);
    expect(wearItem(["jetpack"], "cape")).toEqual(["cape"]);
  });

  it("draws Pro items only while Pro; unknown ids and slot clashes are dropped", () => {
    expect(effectiveOutfit(["crown", "glasses", "cape"], true)).toEqual(["crown", "glasses", "cape"]);
    expect(effectiveOutfit(["crown", "glasses", "cape"], false)).toEqual(["glasses"]);
    expect(effectiveOutfit(["not-real", "cap", "beanie"], false)).toEqual(["cap"]);
    expect(effectiveOutfit(null, false)).toEqual([]);
  });

  it("the server only saves owned items, one per slot", () => {
    const owned = ownedItems([], false, NO_MILESTONES);
    expect(validOutfit(["cap", "glasses", "hoodie"], owned)).toBe(true);
    expect(validOutfit([], owned)).toBe(true);
    expect(validOutfit(["crown"], owned)).toBe(false);
    expect(validOutfit(["beanie"], owned)).toBe(false);
    expect(validOutfit(["cap", "cap"], owned)).toBe(false);
    expect(validOutfit(["cap", "grad-cap"], ownedItems([], false, { longestStreak: 0, finishedCourse: true }))).toBe(false);
  });
});
