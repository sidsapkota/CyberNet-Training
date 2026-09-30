import { describe, expect, it } from "vitest";
import { checkGlossaryMarks } from "./glossaryCheck";

const known = new Set(["router", "packet"]);

describe("checkGlossaryMarks", () => {
  it("accepts known terms marked once in markdown fields", () => {
    const card = { prompt: "Which [[router]]?", explanation: "A [[packet]] goes to the router.", hint: "Think of [[packets|packet]]... no wait" };
    expect(checkGlossaryMarks({ prompt: card.prompt, explanation: card.explanation }, known)).toEqual([]);
  });

  it("fails on unknown terms and on a second mark of the same term in one card", () => {
    const problems = checkGlossaryMarks({ prompt: "A [[modem]] and a [[router]].", explanation: "The [[router]] again." }, known);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain('the glossary has no "modem"');
    expect(problems[1]).toContain('"router" is already marked in prompt');
  });

  it("never allows marks inside code", () => {
    expect(checkGlossaryMarks({ prompt: "Run `ping [[router]]`" }, known)[0]).toContain("can't go inside code");
    expect(checkGlossaryMarks({ prompt: "Output:\n\n```\nhop 1 [[router]]\n```" }, known)[0]).toContain("can't go inside code");
  });

  it("only allows marks in markdown text, never in button labels", () => {
    expect(checkGlossaryMarks({ options: [{ id: "a", text: "A [[router]]" }] }, known)[0]).toContain("only allowed in markdown text");
    expect(checkGlossaryMarks({ steps: [{ id: "s", text: "A [[router]] blinks.", choices: [] }] }, known)).toEqual([]);
    expect(
      checkGlossaryMarks({ steps: [{ id: "s", text: "Hi", choices: [{ id: "c", text: "Reset the [[router]]" }] }] }, known)[0],
    ).toContain("only allowed in markdown text");
  });
});
