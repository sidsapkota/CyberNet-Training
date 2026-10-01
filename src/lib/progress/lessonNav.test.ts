import { describe, expect, it } from "vitest";
import { proCourse, twoModuleCourse } from "@/test/fixtures";
import { moduleNav, moduleNeighbours } from "./lessonNav";
import { emptySnapshot, type ProgressSnapshot } from "./types";

const done = (snapshot: ProgressSnapshot, ...ids: string[]): ProgressSnapshot => ({
  ...snapshot,
  lessons: { ...snapshot.lessons, ...Object.fromEntries(ids.map((id) => [id, { completedAt: "2026-10-01T00:00:00.000Z", xp: 20 }])) },
});
const signedIn = { guest: false, accounts: true, proOpen: true };

describe("moduleNeighbours (within a module only)", () => {
  it("gives the lessons either side, null at the ends", () => {
    const course = twoModuleCourse();
    expect(moduleNeighbours(course, "l1")).toMatchObject({ previous: null, next: { id: "l2" } });
    expect(moduleNeighbours(course, "l2")).toMatchObject({ previous: { id: "l1" }, next: { id: "quiz1" } });
    // Never across modules: the first lesson of module 2 has nothing before it.
    expect(moduleNeighbours(course, "l3").previous).toBeNull();
  });
});

describe("moduleNav (the header menu's rows)", () => {
  it("marks done, here, open and locked (Path mode)", () => {
    const course = twoModuleCourse();
    const nav = moduleNav(done(emptySnapshot(), "l1"), course, "l2", signedIn)!;
    expect(nav.module.id).toBe("m1");
    expect(nav.rows.map((r) => [r.lesson.id, r.state])).toEqual([
      ["l1", "done"],
      ["l2", "here"],
      ["quiz1", "locked"],
    ]);
    expect(nav.rows[2]!.blockedBy?.id).toBe("l2");
  });

  it("opens everything in Explore mode", () => {
    const snapshot = { ...emptySnapshot(), preferences: { ...emptySnapshot().preferences, mode: "explore" as const } };
    const nav = moduleNav(snapshot, twoModuleCourse(), "l1", signedIn)!;
    expect(nav.rows.map((r) => r.state)).toEqual(["here", "open", "open"]);
  });

  it("flags lessons a guest needs an account for (not the ones already done)", () => {
    const course = twoModuleCourse();
    course.modules[0]!.lessons[1] = { ...course.modules[0]!.lessons[1]!, guests: false };
    const nav = moduleNav(emptySnapshot(), course, "l1", { guest: true, accounts: true, proOpen: true })!;
    expect(nav.rows.find((r) => r.lesson.id === "l2")?.needsAccount).toBe(true);
    // Without accounts on this copy, nobody can sign up: no gate.
    expect(moduleNav(emptySnapshot(), course, "l1", { guest: true, accounts: false, proOpen: false })!.rows[1]!.needsAccount).toBe(false);
  });

  it("flags Pro lessons only where Pro can't be opened", () => {
    const course = proCourse();
    expect(moduleNav(emptySnapshot(), course, "l3", { guest: false, accounts: false, proOpen: false })!.rows[0]!.needsPro).toBe(true);
    expect(moduleNav(emptySnapshot(), course, "l3", signedIn)!.rows[0]!.needsPro).toBe(false);
  });
});
