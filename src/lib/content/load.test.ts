import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { binaryToggle, explainer, multipleChoice } from "@/test/fixtures";
import { ContentValidationError, loadContent } from "./load";

describe("real content in /content", () => {
  it("loads and validates", () => {
    const { courses, lessons } = loadContent();
    expect(courses.length).toBeGreaterThan(0);
    expect(lessons.has("bits-and-binary")).toBe(true);
    expect(lessons.has("binary-and-data-quiz")).toBe(true);
  });

  it("places the sample lesson and quiz in Module 1 of How the Internet Works", () => {
    const { courses } = loadContent();
    const course = courses.find((c) => c.id === "how-the-internet-works");
    const firstModule = course?.modules[0];
    expect(firstModule?.title).toBe("Binary and Data");
    expect(firstModule?.lessons.map((l) => l.id)).toEqual(["bits-and-binary", "binary-and-data-quiz"]);
  });

  it("sample lesson uses all four card types and exactly two challenge cards", () => {
    const lesson = loadContent().lessons.get("bits-and-binary");
    expect(new Set(lesson?.cards.map((c) => c.type))).toEqual(
      new Set(["explainer", "multiple_choice", "drag_to_order", "binary_toggle"]),
    );
    expect(lesson?.cards.filter((c) => c.difficulty === "challenge")).toHaveLength(2);
  });

  it("sample quiz has five questions", () => {
    expect(loadContent().lessons.get("binary-and-data-quiz")?.cards).toHaveLength(5);
  });
});

describe("loadContent validation", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
  });

  type Files = Record<string, unknown>;
  function makeContent(files: Files): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cybernet-content-"));
    roots.push(root);
    for (const [file, data] of Object.entries(files)) {
      const full = path.join(root, file);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, typeof data === "string" ? data : JSON.stringify(data));
    }
    return root;
  }

  const M = "courses/c1/modules/m1";
  const course = { id: "c1", title: "Course", description: "D", order: 1 };
  const mod = { id: "m1", title: "Module", description: "D", order: 1 };
  const lesson = (id: string, order: number) => ({
    id,
    kind: "lesson",
    title: id,
    order,
    isFree: true,
    cards: [explainer()],
  });
  const quiz = (id: string, order: number) => ({
    id,
    kind: "quiz",
    title: id,
    order,
    isFree: true,
    cards: [multipleChoice(), binaryToggle()],
  });

  function validFiles(): Files {
    return {
      "courses/c1/course.json": course,
      [`${M}/module.json`]: mod,
      [`${M}/lessons/01.json`]: lesson("l1", 1),
      [`${M}/lessons/02.json`]: lesson("l2", 2),
      [`${M}/lessons/99.json`]: quiz("q1", 99),
    };
  }

  function problemsFor(files: Files): string[] {
    try {
      loadContent(makeContent(files));
      return [];
    } catch (error) {
      if (error instanceof ContentValidationError) return error.problems;
      throw error;
    }
  }

  it("builds a sorted outline with parent ids derived from folders", () => {
    const files = validFiles();
    // Write lesson 2 before lesson 1 on disk; `order` must win.
    files[`${M}/lessons/00.json`] = files[`${M}/lessons/02.json`];
    delete files[`${M}/lessons/02.json`];

    const { courses, lessons } = loadContent(makeContent(files));
    expect(courses[0]?.modules[0]?.lessons.map((l) => l.id)).toEqual(["l1", "l2", "q1"]);
    expect(lessons.get("l2")).toMatchObject({ courseId: "c1", moduleId: "m1" });
  });

  it("accepts valid content", () => {
    expect(problemsFor(validFiles())).toEqual([]);
  });

  it("reports schema errors with file and field path", () => {
    const files = validFiles();
    files[`${M}/lessons/01.json`] = { ...lesson("l1", 1), cards: [explainer({ title: "" })] };
    const problems = problemsFor(files);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("courses/c1/modules/m1/lessons/01.json");
    expect(problems[0]).toContain("cards[0].title");
  });

  it("reports invalid JSON", () => {
    const files = validFiles();
    files[`${M}/lessons/01.json`] = "{ not json";
    expect(problemsFor(files)[0]).toMatch(/not valid JSON/);
  });

  it("reports a missing module.json", () => {
    const files = validFiles();
    delete files[`${M}/module.json`];
    expect(problemsFor(files)[0]).toMatch(/module\.json: file is missing/);
  });

  it("reports duplicate lesson ids across the module", () => {
    const files = validFiles();
    files[`${M}/lessons/02.json`] = lesson("l1", 2);
    expect(problemsFor(files).join("\n")).toMatch(/duplicate lesson id "l1"/);
  });

  it("reports clashing order values", () => {
    const files = validFiles();
    files[`${M}/lessons/02.json`] = lesson("l2", 1);
    expect(problemsFor(files).join("\n")).toMatch(/share order 1/);
  });

  it("requires exactly one quiz per module", () => {
    const none = validFiles();
    delete none[`${M}/lessons/99.json`];
    expect(problemsFor(none).join("\n")).toMatch(/exactly one quiz, found 0/);

    const two = validFiles();
    two[`${M}/lessons/98.json`] = quiz("q2", 98);
    expect(problemsFor(two).join("\n")).toMatch(/exactly one quiz, found 2/);
  });

  it("requires the quiz to come last", () => {
    const files = validFiles();
    files[`${M}/lessons/99.json`] = quiz("q1", 0);
    expect(problemsFor(files).join("\n")).toMatch(/quiz must have the highest order/);
  });

  it("collects every problem instead of stopping at the first", () => {
    const files = validFiles();
    files[`${M}/lessons/01.json`] = { ...lesson("l1", 1), isFree: "yes" };
    files[`${M}/lessons/02.json`] = { ...lesson("l2", 2), cards: [] };
    expect(problemsFor(files).length).toBeGreaterThanOrEqual(2);
  });
});
