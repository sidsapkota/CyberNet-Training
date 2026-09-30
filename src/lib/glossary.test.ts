import { describe, expect, it } from "vitest";
import { findGlossaryMarks, glossaryEntries, glossaryMarksToLinks, markId, stripGlossaryMarks } from "./glossary";

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
