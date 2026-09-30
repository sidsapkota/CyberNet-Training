import { describe, expect, it } from "vitest";
import { multipleChoice, sortBins } from "@/test/fixtures";
import { nudgeFor } from "./nudge";

describe("nudgeFor", () => {
  const mc = multipleChoice({
    nudge: "Think about what the router needs.",
    options: [
      { id: "a", text: "Right" },
      { id: "b", text: "Wrong", nudge: "Names are for people, not routers." },
      { id: "c", text: "Also wrong" },
    ],
    correctOptionId: "a",
  });

  it("uses the picked option's nudge, then the card's, then nothing", () => {
    expect(nudgeFor(mc, "b")).toBe("Names are for people, not routers.");
    expect(nudgeFor(mc, "c")).toBe("Think about what the router needs.");
    expect(nudgeFor({ ...mc, nudge: undefined }, "c")).toBeUndefined();
    expect(nudgeFor(sortBins({ nudge: "Which one forgets when the power's off?" }), {})).toBe(
      "Which one forgets when the power's off?",
    );
  });
});
