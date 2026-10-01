import { describe, expect, it } from "vitest";
import { findGlossaryMarks, glossaryEntries, glossaryMarksToLinks, isOneSentence, markId, needsFullName, stripGlossaryMarks } from "./glossary";

describe("glossary marks", () => {
  it("reads [[term]] and [[label|id]], deriving kebab-case ids from labels", () => {
    expect(findGlossaryMarks("A [[router]] and two [[IP addresses|ip-address]] and [[Web server]].")).toEqual([
      { label: "router", id: "router" },
      { label: "IP addresses", id: "ip-address" },
      { label: "Web server", id: "web-server" },
    ]);
    expect(markId("  IP  address ")).toBe("ip-address");
    expect(findGlossaryMarks("no marks, [not one], [[]]")).toEqual([]);
  });

  it("turns marks into glossary links for the renderer, or plain text", () => {
    expect(glossaryMarksToLinks("Ask the [[routers|router]].")).toBe("Ask the [routers](glossary:router).");
    expect(stripGlossaryMarks("Ask the [[routers|router]].")).toBe("Ask the routers.");
  });

  it("ships a valid glossary with plain, short definitions", () => {
    const terms = glossaryEntries();
    expect(terms.length).toBeGreaterThan(0);
    for (const t of terms) {
      expect(t.definition.length, t.id).toBeLessThanOrEqual(220);
      expect(t.definition, t.id).not.toMatch(/\[\[/); // definitions don't nest marks
    }
  });
});

describe("glossary entries are quick to read", () => {
  it("knows one sentence from two", () => {
    expect(isOneSentence("A tiny switch that is on or off.")).toBe(true);
    expect(isOneSentence("A tiny switch. It is on or off.")).toBe(false);
    expect(isOneSentence("A part, e.g. the battery.")).toBe(true);
    expect(isOneSentence("No full stop")).toBe(false);
  });

  it("knows which terms are abbreviations still to spell out", () => {
    expect(needsFullName("CPU")).toBe(true);
    expect(needsFullName("IP address")).toBe(true);
    expect(needsFullName("random-access memory (RAM)")).toBe(false);
    expect(needsFullName("router")).toBe(false);
  });

  it.each(glossaryEntries().map((e) => [e.id, e] as const))("%s: one sentence, and a full name for abbreviations", (_id, entry) => {
    expect(isOneSentence(entry.definition)).toBe(true);
    if (needsFullName(entry.term)) expect(entry.full, `${entry.term} needs "full"`).toBeTruthy();
  });
});
