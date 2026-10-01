import { describe, expect, it } from "vitest";
import { explainer, hotspot, multipleChoice, simulator } from "@/test/fixtures";
import { loadContent } from "./load";
import { teaserCardOf, teaserProblem } from "./teaser";

const lessons = [
  { id: "first", kind: "lesson" as const, order: 1, cards: [explainer({ id: "intro" }), simulator({ id: "sim" }), multipleChoice({ id: "hard", difficulty: "challenge" }), hotspot({ id: "spot" })] },
  { id: "second", kind: "lesson" as const, order: 2, cards: [multipleChoice({ id: "later" })] },
  { id: "quiz", kind: "quiz" as const, order: 99, cards: [multipleChoice({ id: "q1" })] },
];
const pro = (lesson: string, card: string) => ({ access: "pro" as const, teaserCard: { lesson, card } });

describe("teaser cards", () => {
  it("accepts an interactive core card from the module's first lesson", () => {
    expect(teaserProblem(pro("first", "sim"), lessons)).toBeNull();
    expect(teaserCardOf(pro("first", "sim"), lessons)?.id).toBe("sim");
  });

  it("is required on Pro modules and not allowed on free ones", () => {
    expect(teaserProblem({ access: "pro" }, lessons)).toMatch(/needs a teaserCard/);
    expect(teaserProblem({ access: "free", teaserCard: { lesson: "first", card: "sim" } }, lessons)).toMatch(/free module/);
    expect(teaserProblem({ access: "free" }, lessons)).toBeNull();
  });

  it("must come from the first lesson, and exist", () => {
    expect(teaserProblem(pro("second", "later"), lessons)).toMatch(/first lesson/);
    expect(teaserProblem(pro("first", "missing"), lessons)).toMatch(/isn't in first/);
  });

  it("must be interactive, core, and not a scene card", () => {
    expect(teaserProblem(pro("first", "intro"), lessons)).toMatch(/interactive/);
    expect(teaserProblem(pro("first", "hard"), lessons)).toMatch(/core/);
    expect(teaserProblem(pro("first", "spot"), lessons)).toMatch(/scene card/);
  });

  it("every Pro module in the real content has a valid teaser in its outline", () => {
    const { courses } = loadContent();
    const proModules = courses.flatMap((c) => c.modules).filter((m) => m.access === "pro");
    expect(proModules.length).toBeGreaterThan(0);
    for (const mod of proModules) expect(mod.teaser?.id, mod.id).toBe(mod.teaserCard?.card);
    for (const mod of courses.flatMap((c) => c.modules).filter((m) => m.access === "free")) expect(mod.teaser, mod.id).toBeUndefined();
  });
});
