import { describe, expect, it } from "vitest";
import { hotspot } from "@/test/fixtures";
import {
  describeHotspotAnswer,
  describeHotspotCorrect,
  gradeHotspot,
  isExploreComplete,
  isHotspotReady,
  markSeen,
  placeLabel,
  removeLabel,
  tappableParts,
  toggleTap,
} from "./grade";
import { HotspotCardSchema } from "./schema";

const empty = { selected: [], placed: {} };
const tap = hotspot({ targets: ["storage", "ram"] });
const label = hotspot({
  mode: "label",
  targets: undefined,
  labels: [
    { part: "cpu", label: "CPU" },
    { part: "ram", label: "RAM" },
  ],
});

describe("hotspot tap mode", () => {
  it("selects up to the number of targets, and unselects on a second tap", () => {
    let a = toggleTap(tap, empty, "storage");
    a = toggleTap(tap, a, "cpu");
    expect(a.selected).toEqual(["storage", "cpu"]);
    expect(toggleTap(tap, a, "fan").selected).toEqual(["storage", "cpu"]); // full
    expect(toggleTap(tap, a, "cpu").selected).toEqual(["storage"]);
  });

  it("is correct only for exactly the targets", () => {
    expect(gradeHotspot(tap, { ...empty, selected: ["ram", "storage"] }).correct).toBe(true);
    expect(gradeHotspot(tap, { ...empty, selected: ["ram", "cpu"] }).correct).toBe(false);
    expect(isHotspotReady({ ...empty, selected: ["ram"] }, tap)).toBe(false);
    expect(gradeHotspot(tap, null as never).correct).toBe(false);
  });

  it("only offers parts that can be seen", () => {
    const open = tappableParts(tap).map((p) => p.id);
    expect(open).toContain("cpu");
    expect(open).not.toContain("panel");
    const closed = tappableParts(hotspot({ view: undefined, targets: ["panel"] })).map((p) => p.id);
    expect(closed).toContain("panel");
    expect(closed).not.toContain("cpu"); // under the panel
  });
});

describe("hotspot label mode", () => {
  it("places each label once, moving it if placed again", () => {
    let a = placeLabel(empty, "ram", 0);
    a = placeLabel(a, "cpu", 0);
    expect(a.placed).toEqual({ cpu: 0 });
    a = placeLabel(a, "ram", 1);
    expect(isHotspotReady(a, label)).toBe(true);
    expect(gradeHotspot(label, a).correct).toBe(true);
    expect(removeLabel(a, "ram").placed).toEqual({ cpu: 0 });
  });

  it("is wrong when labels are swapped", () => {
    expect(gradeHotspot(label, { ...empty, placed: { cpu: 1, ram: 0 } }).correct).toBe(false);
  });

  it("offers only the labelled parts as spots", () => {
    expect(tappableParts(label).map((p) => p.id).sort()).toEqual(["cpu", "ram"]);
  });

  it("describes answers with part names", () => {
    expect(describeHotspotCorrect(label)).toBe("CPU → CPU (processor); RAM → RAM (memory)");
    expect(describeHotspotAnswer(tap, { ...empty, selected: ["fan"] })).toBe("Cooling fan");
  });
});

const explore = hotspot({
  mode: "explore",
  targets: undefined,
  parts: [
    { part: "cpu", job: "Follows the instructions." },
    { part: "ram", job: "Holds what's in use right now." },
  ],
});

describe("hotspot explore mode", () => {
  it("unlocks once every listed part has been tapped, in any order and any number of times", () => {
    let state = { seen: [] as string[] };
    expect(isExploreComplete(state, explore)).toBe(false);
    state = markSeen(markSeen(state, "ram"), "ram");
    expect(state.seen).toEqual(["ram"]);
    expect(isExploreComplete(state, explore)).toBe(false);
    expect(isExploreComplete(markSeen(state, "cpu"), explore)).toBe(true);
  });

  it("offers only the listed parts, and survives junk state", () => {
    expect(tappableParts(explore).map((p) => p.id).sort()).toEqual(["cpu", "ram"]);
    expect(isExploreComplete(null as never, explore)).toBe(false);
    expect(markSeen({ seen: [1, "cpu"] } as never, "ram").seen).toEqual(["cpu", "ram"]);
  });

  it("is never graded correct", () => {
    expect(gradeHotspot(explore, empty).correct).toBe(false);
  });
});

describe("HotspotCardSchema", () => {
  const messages = (c: unknown) => HotspotCardSchema.safeParse(c).error?.issues.map((i) => i.message) ?? [];

  it("checks parts, views and visibility", () => {
    expect(messages(hotspot({ targets: ["toaster"] }))).toContain('"toaster" isn\'t a part of scene "laptop"');
    expect(messages(hotspot({ view: "sideways" }))).toContain('scene "laptop" has no view "sideways"');
    expect(messages(hotspot({ view: undefined, targets: ["cpu"] }))).toContain('"cpu" can\'t be seen in view "default"');
  });

  it("needs the right fields for each mode", () => {
    expect(messages(hotspot({ targets: undefined }))).toContain("tap mode needs `targets`");
    expect(messages({ ...label, labels: undefined })).toContain("label mode needs `labels`");
    expect(
      messages({ ...label, labels: [{ part: "cpu", label: "A" }, { part: "cpu", label: "B" }] }),
    ).toContain("each part can only have one label");
    expect(messages({ ...explore, parts: undefined })).toContain("explore mode needs `parts`");
    expect(messages({ ...explore, targets: ["cpu"] })).toContain("explore mode doesn't use `targets`");
    expect(messages({ ...tap, parts: explore.parts })).toContain("tap mode doesn't use `parts`");
  });

  it("keeps explore cards core, with visible, unique parts", () => {
    expect(HotspotCardSchema.safeParse(explore).success).toBe(true);
    expect(messages({ ...explore, difficulty: "challenge" })).toContain("explore cards teach, so they must be core");
    expect(messages({ ...explore, parts: [{ part: "cpu", job: "a" }, { part: "cpu", job: "b" }] })).toContain(
      "each part can only be listed once",
    );
    expect(messages({ ...explore, view: "closed" })).toContain(`"cpu" can't be seen in view "closed"`);
  });
});
