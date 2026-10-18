import { describe, expect, it } from "vitest";
import { ALL_PARENT_COPY } from "./parentCopy";

// Words that push, rush or ask on the learner's behalf. The parent wording states facts only.
const PRESSURE = /\b(hurry|now|today|tonight|quick(ly)?|last chance|limited|only \d+|left|don'?t miss|before it'?s gone|asked you|ask(s|ed)? (you|a parent)|please|could you|get me|beg|deserve|gift|special|amazing|best value|save)\b|!/i;

describe("parent wording", () => {
  it("is neutral and factual: no urgency, scarcity or pester language", () => {
    for (const line of ALL_PARENT_COPY) expect(line, line).not.toMatch(PRESSURE);
  });

  it("states the price terms and where refund rights come from", () => {
    const all = ALL_PARENT_COPY.join(" ");
    expect(all).toMatch(/isn't a subscription/);
    expect(all).toMatch(/Australian Consumer Law/);
    expect(all).toMatch(/Cancel any time/);
  });
});
