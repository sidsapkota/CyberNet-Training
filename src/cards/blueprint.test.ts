import { describe, expect, it } from "vitest";
import { hook, multipleChoice, simulator } from "@/test/fixtures";
import { lessonShapeProblems } from "@/lib/content/shape";
import type { RegularLesson } from "@/lib/content/schema";
import { describeMultipleChoiceAnswer, displayOptions } from "./multiple-choice/grade";
import { NOT_SURE } from "./multiple-choice/schema";
import { getCardDefinition, isGuidedDefinition } from "./registry";
import { CardSchema, isGuidedCard, isInteractiveCard, isSimulatorPlay } from "./schema";
import { speechText } from "./speech";

/** Lesson Blueprint v1.1: the card pieces the rebuilt lessons use. */
describe("Predict cards (not scored)", () => {
  const predict = multipleChoice({ predict: true });

  it('end with "Not sure", never shuffled in', () => {
    const shown = displayOptions(predict);
    expect(shown.at(-1)).toEqual({ id: NOT_SURE, text: "Not sure" });
    expect(shown).toHaveLength(predict.options.length + 1);
    expect(displayOptions(multipleChoice()).some((o) => o.id === NOT_SURE)).toBe(false);
  });

  it('describe "Not sure" as an answer, and read it out', () => {
    expect(describeMultipleChoiceAnswer(predict, NOT_SURE)).toBe("Not sure");
    expect(speechText(predict)).toContain("Not sure");
  });

  it("can't use the not-sure id themselves", () => {
    const bad = { ...predict, options: [...predict.options, { id: NOT_SURE, text: "Hmm" }] };
    expect(CardSchema.safeParse(bad).success).toBe(false);
  });
});

describe("answers on the picture", () => {
  const image = { src: "/x.svg", alt: "A picture.", width: 340, height: 200 };
  const area = { x: 0, y: 0, w: 30, h: 30 };

  it("need a picture, and an area on every option", () => {
    const options = multipleChoice().options;
    expect(CardSchema.safeParse(multipleChoice({ image, options: options.map((o) => ({ ...o, area })) })).success).toBe(true);
    expect(CardSchema.safeParse(multipleChoice({ options: options.map((o) => ({ ...o, area })) })).success).toBe(false);
    expect(CardSchema.safeParse(multipleChoice({ image, options: [{ ...options[0]!, area }, ...options.slice(1)] })).success).toBe(false);
  });
});

describe("simulator play mode", () => {
  const rest = { ...simulator(), goal: undefined };
  const play = { ...rest, mode: "play" as const };

  it("is a toy: no goal, never graded, guided", () => {
    expect(CardSchema.safeParse(play).success).toBe(true);
    expect(CardSchema.safeParse({ ...play, goal: simulator().goal }).success).toBe(false);
    expect(CardSchema.safeParse(rest).success).toBe(false);
    const card = CardSchema.parse(play);
    expect(isSimulatorPlay(card) && isGuidedCard(card) && !isInteractiveCard(card)).toBe(true);
  });

  it("unlocks Continue after the first change", () => {
    const definition = getCardDefinition(CardSchema.parse(play));
    expect(isGuidedDefinition(definition)).toBe(true);
    if (!isGuidedDefinition(definition)) return;
    const card = CardSchema.parse(play);
    expect(definition.isComplete(definition.initialState(card), card)).toBe(false);
    expect(definition.isComplete({ length: 9 }, card)).toBe(true);
  });
});

describe("Hook cards", () => {
  it("are a picture and one line, not graded", () => {
    const card = CardSchema.parse(hook());
    expect(isInteractiveCard(card)).toBe(false);
    expect(getCardDefinition(card).interactive).toBe(false);
    expect(speechText(card)).toContain("Mia is making a password");
  });
});

describe("blueprint lesson shape", () => {
  const lesson = (cards: RegularLesson["cards"]): RegularLesson =>
    ({ id: "l", kind: "lesson", title: "L", order: 1, icon: "cpu", cards, access: "free", guests: false, courseId: "c", moduleId: "lock-your-accounts", blueprint: "1.1" }) as RegularLesson;
  const wrap = { id: "wrap", type: "explainer" as const, difficulty: "core" as const, title: "Wrap", body: "Long beats short.\n\n**Try this:** make one up.\n\n**Next:** the second lock." };
  const name = { ...wrap, id: "name", body: "A passphrase is four random words." };
  const mc = (id: string) => multipleChoice({ id });

  it("accepts the 8 beats", () => {
    const cards = [hook(), mc("play"), multipleChoice({ id: "predict", predict: true }), name, mc("easy"), mc("twist"), mc("real"), wrap] as RegularLesson["cards"];
    expect(lessonShapeProblems(lesson(cards))).toEqual([]);
  });

  it("refuses 2-answer questions, a missing Try this or Next, and too few cards", () => {
    const two = multipleChoice({ id: "two", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }], correctOptionId: "a" });
    const problems = lessonShapeProblems(lesson([hook(), two, { ...wrap, body: "Done." }] as RegularLesson["cards"]));
    expect(problems).toEqual(
      expect.arrayContaining([
        "has 3 cards (Lesson Blueprint: 6–8)",
        "two: has 2 answers (at least 3, never 2)",
        'wrap: the Wrap needs a "Try this: …" line',
        'wrap: the Wrap needs a one-line "Next: …" tease',
      ]),
    );
  });
});
