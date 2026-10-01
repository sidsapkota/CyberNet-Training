import { describe, expect, it } from "vitest";
import {
  binaryToggle,
  dragToOrder,
  hotspot,
  matchPairs,
  multipleChoice,
  nextWord,
  numericInput,
  packetPath,
  scenario,
  simulator,
  sortBins,
  teardown,
  terminal,
  trainModel,
} from "@/test/fixtures";
import { decimalToBits } from "./binary-toggle/binary";
import { getCardDefinition } from "./registry";
import { canCheckAgain, retryAnswer, sameAnswer } from "./retry";
import type { InteractiveCard } from "./schema";

/** Try again on `card` after `answer` was marked wrong, through the real definition. */
function retry(card: InteractiveCard, answer: unknown) {
  const definition = getCardDefinition(card);
  if (!definition.interactive) throw new Error("not interactive");
  expect(definition.grade(card, answer).correct, "the test answer must be wrong").toBe(false);
  const next = retryAnswer(card, answer, definition.initialAnswer(card));
  return { next, ready: definition.isAnswerReady(next, card), checkable: definition.isAnswerReady(next, card) && canCheckAgain(next, answer) };
}

describe("Try again clears what's wrong and keeps what's right", () => {
  it("multiple choice: the wrong pick is cleared", () => {
    const r = retry(multipleChoice(), "one");
    expect(r.next).toBeNull();
    expect(r.checkable).toBe(false);
  });

  it("binary: wrong bits go off, right ones stay on", () => {
    const card = binaryToggle({ target: 42 }); // 00101010
    const wrong = decimalToBits(42 + 1 + 64); // two extra bits on
    const { next } = retry(card, wrong);
    expect(next).toEqual(decimalToBits(42));
  });

  it("binary: a wrong answer with missing bits keeps the right ones and isn't checkable unchanged", () => {
    const card = binaryToggle({ target: 42 });
    const wrong = decimalToBits(32); // one right bit, two missing
    const r = retry(card, wrong);
    expect(r.next).toEqual(decimalToBits(32));
    expect(r.checkable).toBe(false); // same answer as the wrong one: change something first
  });

  it("numeric: the wrong number is cleared", () => {
    const r = retry(numericInput(), "1100");
    expect(r.next).toBe("");
    expect(r.ready).toBe(false);
  });

  it("match pairs: right pairs stay, wrong ones come apart", () => {
    const r = retry(matchPairs(), { http: "http", https: "dns", dns: "https" });
    expect(r.next).toEqual({ http: "http" });
    expect(r.ready).toBe(false);
  });

  it("packet path: the route is kept up to the first wrong hop", () => {
    const r = retry(packetPath(), ["laptop", "home", "printer"]);
    expect(r.next).toEqual(["laptop", "home"]);
    expect(r.ready).toBe(false);
  });

  it("hotspot tap: right parts stay selected", () => {
    const card = hotspot({ mode: "tap", targets: ["storage", "ram"] });
    const r = retry(card, { selected: ["storage", "battery"], placed: {} });
    expect(r.next).toEqual({ selected: ["storage"], placed: {} });
    expect(r.ready).toBe(false);
  });

  it("hotspot label: right labels stay placed", () => {
    const card = hotspot({ mode: "label", targets: undefined, labels: [{ part: "battery", label: "Battery" }, { part: "ram", label: "RAM" }] } as never);
    const r = retry(card, { selected: [], placed: { battery: 0, storage: 1 } });
    expect(r.next).toEqual({ selected: [], placed: { battery: 0 } });
    expect(r.ready).toBe(false);
  });

  it("teardown: too many early taps start it again (no dead end)", () => {
    const card = teardown({ maxNudges: 1 });
    const wrong = { done: ["cover", "s1", "s2", "unplug"], nudges: 3 };
    const r = retry(card, wrong);
    expect(r.next).toEqual({ done: [], nudges: 0 });
  });

  it("simulator: the learner's moves stay, and Check waits for a change", () => {
    const card = simulator();
    const r = retry(card, { music: false, game: false });
    expect(r.next).toEqual({ music: false, game: false });
    expect(r.checkable).toBe(false);
  });

  it("scenario: the failed ending comes off, so the learner picks again at that step", () => {
    const card = scenario();
    const r = retry(card, ["cable", "give-up"]);
    expect(r.next).toEqual(["cable"]);
    expect(r.ready).toBe(false);
  });

  it("sort bins: wrong items go back to the tray", () => {
    const r = retry(sortBins(), { a: "ram", b: "ram", c: "ram", d: "storage" });
    expect(r.next).toEqual({ a: "ram", c: "ram", d: "storage" });
    expect(r.ready).toBe(false);
  });

  it("train model (label goal): wrong labels are cleared", () => {
    const card = trainModel();
    const definition = getCardDefinition(card);
    if (!definition.interactive) throw new Error();
    const wrong = { ...(definition.initialAnswer(card) as object), labels: Object.fromEntries(card.examples.filter((e) => !e.given).map((e) => [e.id, e.label === card.labels[0]!.id ? card.labels[1]!.id : card.labels[0]!.id])) };
    const r = retry(card, wrong);
    expect((r.next as { labels: object }).labels).toEqual({});
    expect(r.ready).toBe(false);
  });

  it("next word (pick goal): the pick is cleared", () => {
    const card = nextWord();
    const likeliest = [...card.candidates].sort((a, b) => b.p - a.p)[0]!.word;
    const wrongWord = card.candidates.find((c) => c.word !== likeliest)!.word;
    const r = retry(card, { temperature: card.temperature.start, pick: wrongWord });
    expect((r.next as { pick: string | null }).pick).toBeNull();
    expect(r.ready).toBe(false);
  });

  it("drag to order and terminal: what can't be cleared stays, and Check waits for a change", () => {
    const order = dragToOrder();
    const wrong = ["c", "b", "a"];
    const r = retry(order, wrong);
    expect(r.next).toEqual(wrong);
    expect(r.checkable).toBe(false);
    expect(canCheckAgain(["b", "c", "a"], wrong)).toBe(true);

    const term = terminal();
    const termDef = getCardDefinition(term);
    if (!termDef.interactive) throw new Error();
    const answer = { history: ["help"], response: "nope" };
    if (!termDef.grade(term, answer).correct) {
      const t = retryAnswer(term, answer, termDef.initialAnswer(term));
      expect(t).toEqual({ history: ["help"], response: "" });
    }
  });
});

describe("re-checking the same wrong answer is never possible", () => {
  it("compares answers whatever their key order", () => {
    expect(sameAnswer({ a: "x", b: "y" }, { b: "y", a: "x" })).toBe(true);
    expect(sameAnswer(["a", "b"], ["b", "a"])).toBe(false);
    expect(canCheckAgain("x", undefined)).toBe(true);
    expect(canCheckAgain("x", "x")).toBe(false);
  });

  it("a malformed answer starts the card again instead of throwing", () => {
    const card = packetPath();
    expect(retryAnswer(card, null, [])).toEqual([]);
  });
});
