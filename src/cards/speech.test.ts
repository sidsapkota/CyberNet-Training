import { describe, expect, it } from "vitest";
import { loadContent } from "@/lib/content/load";
import { explainer, multipleChoice } from "@/test/fixtures";
import { isInteractiveCard } from "./schema";
import { speakable, speakTechnical, speechText } from "./speech";

describe("speakTechnical", () => {
  it("reads addresses, bits, hex, IPv6 and ports clearly", () => {
    expect(speakTechnical("192.0.2.1")).toBe("192 dot 0 dot 2 dot 1");
    expect(speakTechnical("example.com")).toBe("example dot com");
    expect(speakTechnical("0101")).toBe("0 1 0 1");
    expect(speakTechnical("1100 0011")).toBe("1 1 0 0 0 0 1 1");
    expect(speakTechnical("0x2A")).toBe("hex 2 A");
    expect(speakTechnical("0b101")).toBe("binary 1 0 1");
    expect(speakTechnical("2001:db8::1")).toBe("2001 colon db8 colon colon 1");
    expect(speakTechnical(":443")).toBe("port 443");
    expect(speakTechnical("443")).toBe("443");
  });
});

describe("speakable", () => {
  it("drops markdown and reads glossary marks as their word", () => {
    expect(speakable("A **[[routers|router]]** sends `198.51.100.7` on.")).toBe("A routers sends 198 dot 51 dot 100 dot 7 on.");
    expect(speakable("- one\n- two")).toBe("one two");
    expect(speakable("See [eSafety](https://www.esafety.gov.au).")).toBe("See eSafety.");
  });
});

describe("speechText", () => {
  it("reads an explainer's title and body", () => {
    const card = explainer({ title: "Bits", body: "A **bit** is a switch." });
    expect(speechText(card)).toBe("Bits. A bit is a switch.");
  });

  it("reads the prompt and options, and the explanation only after Check", () => {
    const card = multipleChoice({ prompt: "Which one?", explanation: "Because B." });
    const before = speechText(card, "answering");
    expect(before).toContain("Which one?");
    expect(before).toContain("The options are");
    expect(before).not.toContain("Because B");
    expect(speechText(card, "incorrect")).toContain("Explanation. Because B.");
    expect(speechText(card, "correct")).toContain("Explanation. Because B.");
  });

  it("never reads an explanation before Check, for every card in every course", () => {
    const { lessons } = loadContent();
    for (const lesson of lessons.values()) {
      for (const card of lesson.cards) {
        const text = speechText(card);
        expect(text.length, `${lesson.id}/${card.id}`).toBeGreaterThan(0);
        expect(text, `${lesson.id}/${card.id}`).not.toMatch(/\[\[|\*\*|`/);
        if (isInteractiveCard(card)) expect(text, `${lesson.id}/${card.id}`).not.toContain("Explanation.");
      }
    }
  });
});
