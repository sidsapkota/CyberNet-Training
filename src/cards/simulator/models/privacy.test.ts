import { describe, expect, it } from "vitest";
import { hasSimulatorPicture } from "../pictures";
import { MODELS } from "./index";
import { appPermissionsModel, postSpreadModel, privacySwitchesModel } from "./privacy";
import type { ListItem } from "./types";

const rows = (out: Record<string, unknown>, id: string) => Object.fromEntries((out[id] as ListItem[]).map((r) => [r.id, r]));

describe("picture models", () => {
  it("every model with a picture has a drawing, and only those", () => {
    for (const [id, model] of Object.entries(MODELS)) {
      expect(hasSimulatorPicture(id), id).toBe(Boolean(model.picture));
    }
  });
});

describe("post-spread", () => {
  const p = postSpreadModel.params.parse({});
  it("reaches nobody until it's posted, even if share or screenshot is pressed", () => {
    const out = postSpreadModel.run({ post: false, share: true, screenshot: true }, p);
    expect(out.people).toBe(0);
    expect(rows(out, "phones").shared?.state).toBe("off");
    expect(rows(out, "phones").saved?.state).toBe("off");
  });
  it("reaches the friends when posted, and more people when a friend shares it", () => {
    expect(postSpreadModel.run({ post: true }, p).people).toBe(4);
    const shared = postSpreadModel.run({ post: true, share: true }, p);
    expect(shared.people).toBe(7);
    expect(rows(shared, "phones").friends?.detail).toBe("7 people");
    expect(rows(postSpreadModel.run({ post: true, screenshot: true }, p), "phones").saved?.detail).toBe("Saved");
  });
});

describe("privacy-switches", () => {
  const p = privacySwitchesModel.params.parse({});
  it("starts with everything showing to strangers", () => {
    const out = privacySwitchesModel.run(Object.fromEntries(Object.entries(privacySwitchesModel.inputs(p)).map(([k, s]) => [k, s.default])), p);
    expect(out.seen).toBe(3);
    expect(rows(out, "strangerView").location?.detail).toBe("Near Fern Park");
  });
  it("each switch hides one thing", () => {
    const base = { privateAccount: false, shareLocation: true, reviewTags: false };
    expect(rows(privacySwitchesModel.run({ ...base, privateAccount: true }, p), "strangerView").posts?.detail).toBe("Followers only");
    expect(rows(privacySwitchesModel.run({ ...base, shareLocation: false }, p), "strangerView").location?.detail).toBe("Hidden");
    expect(rows(privacySwitchesModel.run({ ...base, reviewTags: true }, p), "strangerView").tags?.detail).toBe("Waiting for your OK");
    expect(privacySwitchesModel.run({ privateAccount: true, shareLocation: false, reviewTags: true }, p).seen).toBe(0);
  });
});

describe("app-permissions", () => {
  const p = appPermissionsModel.params.parse({});
  it("reaches nothing until a permission is allowed, then only that one", () => {
    expect(appPermissionsModel.run({}, p).allowed).toBe(0);
    const out = appPermissionsModel.run({ contacts: true }, p);
    expect(out.allowed).toBe(1);
    expect(rows(out, "reach").contacts?.detail).toBe("Sees 214 contacts");
    expect(rows(out, "reach").camera?.detail).toBe("Off");
  });
});
