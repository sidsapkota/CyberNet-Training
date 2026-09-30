import { describe, expect, it } from "vitest";
import { numericInput } from "@/test/fixtures";
import {
  describeNumericAnswer,
  describeNumericCorrect,
  formatInBase,
  gradeNumericInput,
  isNumericAnswerReady,
  parseNumericInput,
} from "./grade";
import { NumericInputCardSchema } from "./schema";

describe("parseNumericInput: decimal", () => {
  it.each([
    ["42", 42],
    ["  42 ", 42],
    ["-7", -7],
    ["+7", 7],
    ["3.5", 3.5],
    [".5", 0.5],
    ["1,024", 1024],
    ["1 000", 1000],
    ["0", 0],
  ])("parses %j as %d", (raw, value) => {
    expect(parseNumericInput(raw, "decimal")).toEqual({ status: "ok", value });
  });

  it("treats blank input as empty, not invalid", () => {
    expect(parseNumericInput("", "decimal")).toEqual({ status: "empty" });
    expect(parseNumericInput("   ", "decimal")).toEqual({ status: "empty" });
  });

  it.each(["12a", "abc", "1.2.3", "--4", "4-"])("rejects %j with a message", (raw) => {
    const result = parseNumericInput(raw, "decimal");
    expect(result.status).toBe("invalid");
  });

  it("names the offending character", () => {
    expect(parseNumericInput("12a", "decimal")).toMatchObject({ message: expect.stringContaining('"a"') });
  });
});

describe("parseNumericInput: binary", () => {
  it.each([
    ["1101", 13],
    ["0b1101", 13],
    ["0B1101", 13],
    ["1010 1010", 170],
    ["1111_1111", 255],
    ["0", 0],
    ["00000101", 5],
  ])("parses %j as %d", (raw, value) => {
    expect(parseNumericInput(raw, "binary")).toEqual({ status: "ok", value });
  });

  it("explains a non-binary digit instead of grading it", () => {
    expect(parseNumericInput("1021", "binary")).toEqual({
      status: "invalid",
      message: `"2" isn't a binary digit: binary only uses 0 and 1.`,
    });
  });

  it("asks for digits after a bare prefix", () => {
    expect(parseNumericInput("0b", "binary")).toMatchObject({ status: "invalid" });
  });

  it("rejects numbers too long to represent exactly", () => {
    expect(parseNumericInput("1".repeat(60), "binary")).toMatchObject({ status: "invalid" });
  });
});

describe("parseNumericInput: hex", () => {
  it.each([
    ["FF", 255],
    ["ff", 255],
    ["0xFF", 255],
    ["0x1a", 26],
    ["C0 A8", 49320],
  ])("parses %j as %d", (raw, value) => {
    expect(parseNumericInput(raw, "hex")).toEqual({ status: "ok", value });
  });

  it("explains a non-hex digit", () => {
    expect(parseNumericInput("FG", "hex")).toMatchObject({ status: "invalid", message: expect.stringContaining('"g"') });
  });
});

describe("gradeNumericInput", () => {
  it("accepts the right value in any valid spelling", () => {
    const card = numericInput({ base: "binary", answer: 13 });
    for (const raw of ["1101", "0b1101", "0000 1101"]) expect(gradeNumericInput(card, raw)).toEqual({ correct: true });
  });

  it("rejects a wrong value", () => {
    expect(gradeNumericInput(numericInput({ answer: 13 }), "1100")).toEqual({ correct: false });
  });

  it("never marks invalid or empty input correct", () => {
    const card = numericInput({ base: "binary", answer: 2 });
    expect(gradeNumericInput(card, "2")).toEqual({ correct: false });
    expect(gradeNumericInput(card, "")).toEqual({ correct: false });
  });

  it("supports several accepted answers", () => {
    const card = numericInput({ base: "decimal", answer: [255, 256] });
    expect(gradeNumericInput(card, "255").correct).toBe(true);
    expect(gradeNumericInput(card, "256").correct).toBe(true);
    expect(gradeNumericInput(card, "254").correct).toBe(false);
  });

  it("compares decimals without float noise", () => {
    expect(gradeNumericInput(numericInput({ base: "decimal", answer: 0.3 }), "0.3").correct).toBe(true);
  });
});

describe("isNumericAnswerReady", () => {
  it("only allows Check for a well-formed number", () => {
    const card = numericInput({ base: "binary" });
    expect(isNumericAnswerReady("101", card)).toBe(true);
    expect(isNumericAnswerReady("102", card)).toBe(false);
    expect(isNumericAnswerReady("", card)).toBe(false);
  });
});

describe("describe*", () => {
  it("shows binary and hex with their decimal value", () => {
    expect(describeNumericAnswer(numericInput({ base: "binary" }), "0b1100")).toBe("1100 (12)");
    expect(describeNumericCorrect(numericInput({ base: "binary", answer: 13 }))).toBe("1101 (13)");
    expect(describeNumericCorrect(numericInput({ base: "hex", answer: 255 }))).toBe("FF (255)");
  });

  it("adds the unit and lists alternatives", () => {
    const card = numericInput({ base: "decimal", answer: [1000, 1024], unit: "bytes" });
    expect(describeNumericCorrect(card)).toBe("1,000 bytes or 1,024 bytes");
    expect(describeNumericAnswer(card, "1024")).toBe("1,024 bytes");
  });

  it("handles empty and invalid answers", () => {
    const card = numericInput({ base: "binary" });
    expect(describeNumericAnswer(card, "")).toBe("No answer");
    expect(describeNumericAnswer(card, "12")).toBe("12");
  });

  it("formats values in each base", () => {
    expect(formatInBase(10, "binary")).toBe("1010");
    expect(formatInBase(171, "hex")).toBe("AB");
    expect(formatInBase(1234.5, "decimal")).toBe("1,234.5");
  });
});

describe("NumericInputCardSchema", () => {
  it("defaults the base to decimal", () => {
    const rest: Record<string, unknown> = { ...numericInput() };
    delete rest.base;
    expect(NumericInputCardSchema.parse(rest).base).toBe("decimal");
  });

  it("requires whole, non-negative answers for binary and hex", () => {
    expect(NumericInputCardSchema.safeParse(numericInput({ base: "binary", answer: 2.5 })).success).toBe(false);
    expect(NumericInputCardSchema.safeParse(numericInput({ base: "hex", answer: -1 })).success).toBe(false);
    expect(NumericInputCardSchema.safeParse(numericInput({ base: "decimal", answer: -1.5 })).success).toBe(true);
  });

  it("rejects an empty list of answers", () => {
    expect(NumericInputCardSchema.safeParse(numericInput({ answer: [] })).success).toBe(false);
  });
});
