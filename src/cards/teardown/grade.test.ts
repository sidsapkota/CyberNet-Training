import { describe, expect, it } from "vitest";
import { teardown } from "@/test/fixtures";
import { canDo, describeAction, describeTeardownAnswer, gradeTeardown, isTeardownReady, isValidOrder, partStates, tryPart } from "./grade";
import { TeardownCardSchema } from "./schema";

const card = teardown();
const start = { done: [], nudges: 0 };

describe("teardown actions", () => {
  it("does an action when everything it needs is done", () => {
    const r = tryPart(card, start, "back-cover");
    expect(r.kind).toBe("done");
    expect(r.kind === "done" && r.answer.done).toEqual(["cover"]);
  });

  it("nudges (and counts it) when something is tried too early", () => {
    const r = tryPart(card, { done: ["cover", "s1"], nudges: 0 }, "battery-connector");
    expect(r).toMatchObject({ kind: "nudge", action: { id: "unplug" }, answer: { done: ["cover", "s1"], nudges: 1 } });
  });

  it("does nothing for parts with nothing left to do", () => {
    expect(tryPart(card, start, "camera")).toEqual({ kind: "nothing" });
    expect(tryPart(card, { done: ["cover", "s1"], nudges: 0 }, "screw-1")).toEqual({ kind: "nothing" });
  });

  it("tracks each part's state", () => {
    const states = partStates(card, { done: ["cover", "s1", "s2", "unplug"], nudges: 0 });
    expect(states.get("screw-1")).toBe("out");
    expect(states.get("battery-connector")).toBe("unplugged");
    expect(canDo(card, start, card.actions[2]!)).toBe(false);
  });

  it("heats a part in place: it's marked warm, stays put, and unlocks what needs it", () => {
    const glued = teardown({
      actions: [
        { id: "heat", part: "back-cover", verb: "heat", nudge: "Soften the glue first." },
        { id: "cover", part: "back-cover", verb: "lift", after: ["heat"], nudge: "The glue is still hard." },
      ],
    });
    const early = tryPart(glued, start, "back-cover");
    expect(early).toMatchObject({ kind: "done", action: { id: "heat" } });
    const warmed = { done: ["heat"], nudges: 0 };
    expect(partStates(glued, warmed).get("back-cover")).toBe("heated");
    expect(tryPart(glued, warmed, "back-cover")).toMatchObject({ kind: "done", action: { id: "cover" } });
    expect(partStates(glued, { done: ["heat", "cover"], nudges: 0 }).get("back-cover")).toBe("out");
    expect(isValidOrder(glued, ["cover", "heat"])).toBe(false);
    expect(describeAction(glued.actions[0]!, "Back cover")).toBe("Soften the glue on the back cover");
  });
});

describe("teardown grading", () => {
  const full = ["cover", "s2", "s1", "unplug"];

  it("accepts any order that respects the steps each action needs", () => {
    expect(gradeTeardown(card, { done: full, nudges: 3 }).correct).toBe(true);
    expect(isTeardownReady({ done: full, nudges: 0 }, card)).toBe(true);
    expect(isTeardownReady({ done: ["s1"], nudges: 0 }, card)).toBe(false);
  });

  it("rejects wrong orders, repeats, unknown actions and missing steps (e.g. tampered quiz answers)", () => {
    expect(isValidOrder(card, ["s1", "cover", "s2", "unplug"])).toBe(false);
    expect(isValidOrder(card, ["cover", "s1", "s1", "s2", "unplug"])).toBe(false);
    expect(isValidOrder(card, ["cover", "s1", "s2", "unplug", "hack"])).toBe(false);
    expect(isValidOrder(card, ["cover", "s1", "s2"])).toBe(false);
    expect(gradeTeardown(card, null as never).correct).toBe(false);
  });

  it("can limit nudges", () => {
    const strict = teardown({ maxNudges: 1 });
    expect(gradeTeardown(strict, { done: full, nudges: 1 }).correct).toBe(true);
    expect(gradeTeardown(strict, { done: full, nudges: 2 }).correct).toBe(false);
  });

  it("names actions, keeping acronyms", () => {
    expect(describeAction({ id: "a", part: "ram", verb: "slide-out", nudge: "?" }, "RAM (memory)")).toBe("Slide out the RAM (memory)");
    expect(describeAction({ id: "b", part: "panel", verb: "lift", nudge: "?" }, "Bottom panel")).toBe("Lift off the bottom panel");
  });

  it("describes progress", () => {
    expect(describeTeardownAnswer(card, { done: ["cover"], nudges: 2 })).toBe("1 of 4 steps done (2 nudges)");
  });
});

describe("TeardownCardSchema", () => {
  const messages = (c: unknown) => TeardownCardSchema.safeParse(c).error?.issues.map((i) => i.message) ?? [];

  it("checks parts, dependencies and cycles", () => {
    expect(messages(teardown({ actions: [{ id: "x", part: "toaster", verb: "lift", nudge: "?" }] }))).toContain(
      '"toaster" isn\'t a part of scene "phone"',
    );
    expect(messages(teardown({ actions: [{ id: "x", part: "camera", verb: "lift", after: ["nope"], nudge: "?" }] }))).toContain(
      '"nope" isn\'t an action',
    );
    expect(
      messages(
        teardown({
          actions: [
            { id: "a", part: "screw-1", verb: "unscrew", after: ["b"], nudge: "?" },
            { id: "b", part: "screw-2", verb: "unscrew", after: ["a"], nudge: "?" },
          ],
        }),
      ),
    ).toContain('"a" depends on itself');
  });

  it("won't refit a part before it was removed", () => {
    expect(messages(teardown({ actions: [{ id: "in", part: "camera", verb: "insert", nudge: "?" }] }))).toContain(
      '"in" puts back "camera" before it was taken off',
    );
  });

  it("won't act on a part that's already off in the starting view", () => {
    expect(messages(teardown({ view: "open", actions: [{ id: "x", part: "back-cover", verb: "lift", nudge: "?" }] }))).toContain(
      '"back-cover" is already off in view "open"',
    );
  });
});
