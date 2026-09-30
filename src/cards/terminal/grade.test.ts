import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { terminal } from "@/test/fixtures";
import {
  describeTerminalAnswer,
  describeTerminalCorrect,
  findCommand,
  gradeTerminal,
  helpText,
  isTerminalReady,
  normaliseAnswer,
  runCommand,
  transcript,
} from "./grade";
import { TerminalCardSchema } from "./schema";

const card = terminal();
const answer = (history: string[], response = "") => ({ history, response });
const answerCard = terminal({
  success: { type: "answer", question: "Which IP?", accepted: ["203.0.113.10"] },
});

describe("runCommand", () => {
  it("prints the scripted output for a known command, ignoring case and extra spaces", () => {
    expect(runCommand(card, "  NSLOOKUP   example.com ")).toEqual({
      kind: "output",
      text: "Name:\texample.com\nAddress: 203.0.113.10",
    });
  });

  it("accepts aliases", () => {
    expect(runCommand(card, "nslookup www.example.com").kind).toBe("output");
  });

  it("respects caseSensitive when set", () => {
    const strict = terminal({ caseSensitive: true });
    expect(runCommand(strict, "NSLOOKUP example.com").kind).toBe("unknown");
    expect(runCommand(strict, "nslookup example.com").kind).toBe("output");
  });

  it("gives a friendly message for unknown commands", () => {
    expect(runCommand(card, "rm -rf /")).toEqual({
      kind: "unknown",
      text: "rm: command not found. Type help to see the commands you can use here.",
    });
  });

  it("has help, clear and cls built in, and ignores blank lines", () => {
    expect(runCommand(card, "help")).toEqual({ kind: "help", text: helpText(card) });
    expect(runCommand(card, "clear")).toEqual({ kind: "clear" });
    expect(runCommand(card, "CLS")).toEqual({ kind: "clear" });
    expect(runCommand(card, "   ")).toEqual({ kind: "empty" });
  });

  it("lists every card command in help", () => {
    const text = helpText(card);
    expect(text).toContain("nslookup example.com");
    expect(text).toContain("Look up example.com");
    expect(text).toContain("hostname");
    expect(text).toContain("help");
  });
});

describe("transcript", () => {
  it("rebuilds the screen from history and starts fresh after clear", () => {
    const entries = transcript(card, ["hostname", "clear", "whoami", "hostname"]);
    expect(entries.map((e) => e.input)).toEqual(["whoami", "hostname"]);
    expect(entries[0]?.result.kind).toBe("unknown");
  });
});

describe("gradeTerminal: ran_command", () => {
  it("passes once the success command (or an alias) has been run", () => {
    expect(gradeTerminal(card, answer(["hostname", "nslookup example.com"])).correct).toBe(true);
    expect(gradeTerminal(card, answer(["nslookup www.example.com"])).correct).toBe(true);
  });

  it("fails if only other or unknown commands were run", () => {
    expect(gradeTerminal(card, answer(["hostname", "nslookup example.org"])).correct).toBe(false);
    expect(gradeTerminal(card, answer([])).correct).toBe(false);
  });

  it("is ready once any command has been run", () => {
    expect(isTerminalReady(answer([]), card)).toBe(false);
    expect(isTerminalReady(answer(["  "]), card)).toBe(false);
    expect(isTerminalReady(answer(["hostname"]), card)).toBe(true);
  });
});

describe("gradeTerminal: answer", () => {
  it("compares the typed answer loosely", () => {
    expect(gradeTerminal(answerCard, answer([], " 203.0.113.10. ")).correct).toBe(true);
    expect(gradeTerminal(answerCard, answer([], "203.0.113.1")).correct).toBe(false);
  });

  it("is ready once something is typed", () => {
    expect(isTerminalReady(answer(["nslookup example.com"], ""), answerCard)).toBe(false);
    expect(isTerminalReady(answer([], "x"), answerCard)).toBe(true);
  });

  it("normalises answers", () => {
    expect(normaliseAnswer("  Example.COM.  ")).toBe("example.com");
  });
});

describe("describe*", () => {
  it("summarises commands run, most recent last", () => {
    expect(describeTerminalAnswer(card, answer([]))).toBe("No commands run");
    expect(describeTerminalAnswer(card, answer(["a", "", "b"]))).toBe("Ran: a; b");
    expect(describeTerminalAnswer(card, answer(["a", "b", "c", "d"]))).toBe("Ran: … b; c; d");
    expect(describeTerminalCorrect(card)).toBe("Run: nslookup example.com");
  });

  it("shows the typed answer in answer mode", () => {
    expect(describeTerminalAnswer(answerCard, answer([], "203.0.113.10"))).toBe("203.0.113.10");
    expect(describeTerminalCorrect(answerCard)).toBe("203.0.113.10");
  });
});

describe("findCommand", () => {
  it("returns undefined for unknown input", () => {
    expect(findCommand(card, "ls")).toBeUndefined();
  });
});

describe("TerminalCardSchema", () => {
  const messages = (c: unknown) => TerminalCardSchema.safeParse(c).error?.issues.map((i) => i.message) ?? [];

  it("applies defaults", () => {
    const rest: Record<string, unknown> = { ...card };
    delete rest.promptLabel;
    delete rest.caseSensitive;
    const parsed = TerminalCardSchema.parse(rest);
    expect(parsed.promptLabel).toBe("learner@cybernet:~$");
    expect(parsed.caseSensitive).toBe(false);
  });

  it("requires the success command to be defined", () => {
    expect(messages(terminal({ success: { type: "ran_command", command: "ping example.com" } }))).toContain(
      "success.command must be one of the card's commands or aliases",
    );
  });

  it("rejects duplicate spellings and built-in names", () => {
    expect(messages(terminal({ commands: [...card.commands, { command: "HOSTNAME", output: "" }] }))).toContain(
      '"HOSTNAME" is defined twice',
    );
    expect(messages(terminal({ commands: [...card.commands, { command: "help", output: "" }] }))).toContain(
      '"help" is a built-in command',
    );
  });

  it("requires accepted answers in answer mode", () => {
    expect(
      TerminalCardSchema.safeParse(terminal({ success: { type: "answer", question: "Q", accepted: [] } })).success,
    ).toBe(false);
  });
});

describe("safety", () => {
  it("terminal code never executes, evaluates or fetches anything", () => {
    const dir = path.join(import.meta.dirname);
    const source = fs
      .readdirSync(dir)
      .filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".test.ts"))
      .map((f) => fs.readFileSync(path.join(dir, f), "utf8"))
      .join("\n");
    expect(source).not.toMatch(/\beval\s*\(|new Function|\bfetch\s*\(|XMLHttpRequest|child_process|WebSocket|import\(/);
  });
});
