import { describe, expect, it } from "vitest";
import { binaryToggle, explainer, multipleChoice } from "@/test/fixtures";
import type { RegularLesson } from "./schema";
import { lessonShapeProblems, wordCount } from "./shape";

const lesson = (cards: RegularLesson["cards"]): RegularLesson =>
  ({ id: "l", kind: "lesson", title: "L", order: 1, icon: "cpu", cards, access: "free", guests: false, courseId: "c", moduleId: "m" }) as RegularLesson;
const mc = (id: string, difficulty: "core" | "challenge" = "core") => multipleChoice({ id, difficulty });
const ex = (id: string, body = "Short.") => explainer({ id, body });
const recap = ex("recap", "- one\n- two\n- three");

describe("wordCount", () => {
  it("counts what a reader reads", () => {
    expect(wordCount("A **[[routers|router]]** sends `192.0.2.1` on.")).toBe(5);
  });
});

describe("lessonShapeProblems", () => {
  it("accepts a short, hands-on lesson", () => {
    expect(lessonShapeProblems(lesson([mc("a"), ex("e"), mc("b"), mc("c", "challenge"), binaryToggle({ id: "d" }), recap]))).toEqual([]);
  });

  it("finds every problem at once", () => {
    const long = ex("long", Array.from({ length: 70 }, () => "word").join(" "));
    const problems = lessonShapeProblems(lesson([ex("hook"), long, mc("a"), recap]));
    expect(problems).toEqual([
      "has 4 core cards (needs 5–7)",
      "is 25% hands-on in its core cards (needs 60%)",
      "long: explainer is 70 words (at most 60)",
      "hook → long: two non-interactive cards in a row",
    ]);
  });

  it("allows longer help explainers, and limits the recap to 3 bullets", () => {
    const help = ex("help", Array.from({ length: 75 }, () => "word").join(" "));
    const cards = [mc("a"), help, mc("b"), mc("c"), ex("recap", "- 1\n- 2\n- 3\n- 4")];
    expect(lessonShapeProblems(lesson(cards), { helpModule: true })).toEqual(["recap: recap has 4 bullets (at most 3)"]);
  });
});
