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

  it("orders How the Internet Works modules and lessons, each module ending in its quiz", () => {
    const { courses } = loadContent();
    const course = courses.find((c) => c.id === "how-the-internet-works");
    expect(course?.modules.map((m) => m.id)).toEqual([
      "binary-and-data",
      "ip-addresses",
      "packets-and-routing",
      "dns",
      "ports-and-protocols",
      "the-web",
    ]);
    expect(course?.modules.map((m) => m.lessons.map((l) => l.id))).toEqual([
      ["bits-and-binary", "bytes-file-sizes-and-hex", "binary-and-data-quiz"],
      ["what-is-an-ip-address", "public-and-private-addresses", "meet-ipv6", "ip-addresses-quiz"],
      [
        "why-data-travels-in-packets",
        "routers-and-hops",
        "different-roads-same-destination",
        "packets-and-routing-quiz",
      ],
      ["names-and-numbers", "the-lookup-journey", "dns-records-and-tools", "dns-quiz"],
      ["ports", "tcp-and-udp", "protocols-as-shared-rules", "ports-and-protocols-quiz"],
      [
        "http-requests-and-responses",
        "https-and-the-padlock",
        "what-happens-when-you-type-a-url",
        "the-web-quiz",
      ],
    ]);
  });

  it("every lesson follows the lesson rules: 8-12 cards, hook and recap, ≤3 multiple choice, 2 challenges", () => {
    for (const lesson of loadContent().lessons.values()) {
      if (lesson.kind !== "lesson") continue;
      const { cards } = lesson;
      const where = `lesson ${lesson.id}`;
      expect(cards.length, where).toBeGreaterThanOrEqual(8);
      expect(cards.length, where).toBeLessThanOrEqual(12);
      expect(cards[0]?.type, `${where} opens with a hook explainer`).toBe("explainer");
      expect(cards.at(-1)?.type, `${where} ends with a recap explainer`).toBe("explainer");
      expect(cards.filter((c) => c.type === "multiple_choice").length, where).toBeLessThanOrEqual(3);
      expect(cards.filter((c) => c.difficulty === "challenge").length, where).toBe(2);
    }
  });

  it("quizzes have 5-8 core, interactive questions", () => {
    for (const lesson of loadContent().lessons.values()) {
      if (lesson.kind !== "quiz") continue;
      expect(lesson.cards.length, lesson.id).toBeGreaterThanOrEqual(5);
      expect(lesson.cards.length, lesson.id).toBeLessThanOrEqual(8);
      for (const card of lesson.cards) {
        expect(card.type, `${lesson.id}/${card.id}`).not.toBe("explainer");
        expect(card.difficulty, `${lesson.id}/${card.id}`).toBe("core");
      }
    }
  });

  it("only uses documentation, private or special-purpose IPv4 addresses", () => {
    // Deliberately invalid examples (an octet above 255) are allowed: they can't be anyone's address.
    const allowed = (ip: string) => {
      const [a, b, c, d] = ip.split(".").map(Number) as [number, number, number, number];
      if ([a, b, c, d].some((n) => n > 255)) return true;
      return (
        a === 10 ||
        a === 127 ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 192 && b === 0 && c === 2) ||
        (a === 198 && b === 51 && c === 100) ||
        (a === 203 && b === 0 && c === 113) ||
        ip === "255.255.255.0"
      );
    };
    const text = JSON.stringify([...loadContent().lessons.values()]);
    const unsafe = [...text.matchAll(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g)]
      .map((m) => m[0])
      .filter((ip) => !allowed(ip));
    expect(unsafe).toEqual([]);
  });

  it("Module 1 quiz covers both lessons with seven questions", () => {
    expect(loadContent().lessons.get("binary-and-data-quiz")?.cards).toHaveLength(7);
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
