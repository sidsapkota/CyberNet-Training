import { describe, expect, it } from "vitest";
import { sceneHasArt } from "./art";
import { getScene, SCENE_IDS, SCENES, visibleParts } from "./manifests";

describe("scenes", () => {
  it("draws every part of every scene", () => {
    for (const id of SCENE_IDS) {
      expect(sceneHasArt(id, SCENES[id].parts.map((p) => p.id)), id).toBe(true);
    }
  });

  it("keeps parts, views and covers consistent", () => {
    for (const id of SCENE_IDS) {
      const scene = getScene(id)!;
      const ids = scene.parts.map((p) => p.id);
      expect(new Set(ids).size, `${id}: unique part ids`).toBe(ids.length);
      for (const part of scene.parts) {
        const { x, y, w, h } = part.box;
        expect(x >= 0 && y >= 0 && x + w <= scene.width && y + h <= scene.height, `${id}/${part.id} fits the scene`).toBe(true);
        if (part.coveredBy) expect(ids, `${id}/${part.id} cover exists`).toContain(part.coveredBy);
      }
      for (const [view, hidden] of Object.entries(scene.views)) {
        for (const p of hidden) expect(ids, `${id} view ${view}`).toContain(p);
      }
    }
  });

  it("hides the insides until the cover is off", () => {
    const closed = visibleParts("phone", new Set()).map((p) => p.id);
    expect(closed).toContain("back-cover");
    expect(closed).toContain("charging-port"); // on the outside edge
    expect(closed).not.toContain("battery");
    const open = visibleParts("phone", new Set(["back-cover", "screw-1", "screw-2"])).map((p) => p.id);
    expect(open).toContain("battery");
  });

  it("uses only generic devices (no brand names in part names or descriptions)", () => {
    const text = JSON.stringify(SCENES).toLowerCase();
    for (const brand of ["apple", "iphone", "macbook", "samsung", "galaxy", "pixel", "dell", "lenovo", "microsoft", "surface"]) {
      expect(text).not.toContain(brand);
    }
  });
});
