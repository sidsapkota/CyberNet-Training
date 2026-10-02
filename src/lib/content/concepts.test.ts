import { describe, expect, it } from "vitest";
import { loadContent } from "./load";
import { cardsWithoutUses, conceptProblems } from "./concepts";
import { twoModuleCourse } from "@/test/fixtures";
import type { LoadedContent } from "./load";
import type { Lesson } from "./schema";

const content = loadContent();

describe("prior knowledge: every question uses only what came before it", () => {
  it("every graded card says what it relies on (its `uses` tags)", () => {
    expect(cardsWithoutUses(content)).toEqual([]);
  });

  it("no card uses a concept before an earlier core card (or the card itself) teaches it", () => {
    const problems = conceptProblems(content).map((p) => `${p.lessonId}/${p.cardId} uses "${p.concept}" (${p.kind}${p.taughtAt ? `, taught at ${p.taughtAt}` : ""})`);
    expect(problems).toEqual([]);
  });
});

describe("conceptProblems", () => {
  // A tiny course: l1 (an explainer, then a question), l2 (a bonus, then a question).
  const course = twoModuleCourse();
  const lesson = (id: string, cards: Lesson["cards"]): Lesson => ({ id, kind: "lesson", title: id, order: 1, icon: "binary", about: "A lesson about things.", courseId: course.id, moduleId: "m1", access: "free", guests: true, cards }) as Lesson;
  const explainer = (id: string, teaches: string[], difficulty: "core" | "challenge" = "core") => ({ id, type: "explainer" as const, difficulty, title: "T", body: "B", teaches });
  const question = (id: string, uses: string[], teaches?: string[], difficulty: "core" | "challenge" = "core") => ({ id, type: "true_false" as const, difficulty, prompt: "P", explanation: "E", answer: true, uses, ...(teaches ? { teaches } : {}) });
  const build = (l1: Lesson["cards"], l2: Lesson["cards"]): LoadedContent => {
    const lessons = new Map<string, Lesson>([
      ["l1", lesson("l1", l1)],
      ["l2", lesson("l2", l2)],
    ]);
    const mod = { ...course.modules[0]!, lessons: [course.modules[0]!.lessons[0]!, course.modules[0]!.lessons[1]!] };
    return { courses: [{ ...course, modules: [mod] }], lessons } as unknown as LoadedContent;
  };

  it("passes when the concept was taught earlier, or by the card itself", () => {
    expect(conceptProblems(build([explainer("e", ["bit"]), question("q", ["bit"])], [question("q2", ["byte"], ["byte"])]))).toEqual([]);
  });

  it("flags a concept taught only later", () => {
    const [p] = conceptProblems(build([question("q", ["bit"])], [explainer("e", ["bit"])]));
    expect(p).toMatchObject({ cardId: "q", concept: "bit", kind: "later", taughtAt: "l2/e" });
  });

  it("flags a concept never taught", () => {
    expect(conceptProblems(build([question("q", ["ipv4-address"])], []))[0]).toMatchObject({ kind: "never" });
  });

  it("core cards can't lean on a bonus card; bonus cards can", () => {
    const content = build([explainer("bonus", ["octet"], "challenge"), question("core-q", ["octet"]), question("bonus-q", ["octet"], undefined, "challenge")], []);
    const problems = conceptProblems(content);
    expect(problems.map((p) => p.cardId)).toEqual(["core-q"]);
    expect(problems[0]?.kind).toBe("bonus-only");
  });
});
