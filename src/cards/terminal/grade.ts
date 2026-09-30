/**
 * Simulated terminal logic. Pure: every output comes from the card's data. Nothing is executed,
 * evaluated or sent over the network.
 */
import type { GradeResult } from "../types";
import type { TerminalAnswer, TerminalCard, TerminalCommand } from "./schema";

export function normaliseCommand(input: string, caseSensitive: boolean): string {
  const collapsed = input.trim().replace(/\s+/g, " ");
  return caseSensitive ? collapsed : collapsed.toLowerCase();
}

/** Loose comparison for typed answers: trim, collapse spaces, ignore case and a trailing full stop. */
export function normaliseAnswer(input: string): string {
  return input.trim().replace(/\s+/g, " ").replace(/\.$/, "").toLowerCase();
}

export function findCommand(card: TerminalCard, input: string): TerminalCommand | undefined {
  const key = normaliseCommand(input, card.caseSensitive);
  return card.commands.find((c) =>
    [c.command, ...(c.aliases ?? [])].some((s) => normaliseCommand(s, card.caseSensitive) === key),
  );
}

export type CommandResult =
  | { kind: "empty" }
  | { kind: "clear" }
  | { kind: "help"; text: string }
  | { kind: "output"; text: string }
  | { kind: "unknown"; text: string };

export function helpText(card: TerminalCard): string {
  const rows: [string, string][] = [
    ...card.commands.map((c): [string, string] => [c.command, c.description ?? ""]),
    ["help", "Show this list"],
    ["clear", "Clear the screen (cls also works)"],
  ];
  const width = Math.max(...rows.map(([cmd]) => cmd.length));
  return ["Commands you can use here:", ...rows.map(([cmd, desc]) => `  ${cmd.padEnd(width)}  ${desc}`.trimEnd())].join(
    "\n",
  );
}

export function runCommand(card: TerminalCard, input: string): CommandResult {
  const key = normaliseCommand(input, false);
  if (key === "") return { kind: "empty" };
  if (key === "help") return { kind: "help", text: helpText(card) };
  if (key === "clear" || key === "cls") return { kind: "clear" };
  const match = findCommand(card, input);
  if (match) return { kind: "output", text: match.output };
  const name = input.trim().split(/\s+/)[0] ?? input.trim();
  return { kind: "unknown", text: `${name}: command not found. Type help to see the commands you can use here.` };
}

export interface TranscriptEntry {
  input: string;
  result: CommandResult;
}

/** The visible screen, rebuilt from history: everything after the most recent `clear`. */
export function transcript(card: TerminalCard, history: readonly string[]): TranscriptEntry[] {
  const entries = history.map((input) => ({ input, result: runCommand(card, input) }));
  const lastClear = entries.findLastIndex((e) => e.result.kind === "clear");
  return entries.slice(lastClear + 1);
}

export function isTerminalReady(answer: TerminalAnswer, card: TerminalCard): boolean {
  return card.success.type === "answer"
    ? answer.response.trim() !== ""
    : answer.history.some((h) => h.trim() !== "");
}

export function gradeTerminal(card: TerminalCard, answer: TerminalAnswer): GradeResult {
  const success = card.success;
  if (success.type === "answer") {
    const given = normaliseAnswer(answer.response);
    return { correct: success.accepted.some((a) => normaliseAnswer(a) === given) };
  }
  const target = findCommand(card, success.command);
  return { correct: target !== undefined && answer.history.some((h) => findCommand(card, h) === target) };
}

export function describeTerminalAnswer(card: TerminalCard, answer: TerminalAnswer): string {
  if (card.success.type === "answer") return answer.response.trim() || "No answer";
  const ran = answer.history.map((h) => h.trim()).filter(Boolean);
  if (ran.length === 0) return "No commands run";
  const shown = ran.slice(-3);
  return `Ran: ${ran.length > 3 ? "… " : ""}${shown.join("; ")}`;
}

export function describeTerminalCorrect(card: TerminalCard): string {
  return card.success.type === "answer" ? (card.success.accepted[0] ?? "") : `Run: ${card.success.command}`;
}
