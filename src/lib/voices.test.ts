import { describe, expect, it } from "vitest";
import { isNoveltyVoice, pickVoice, type VoiceLike } from "./voices";

const v = (name: string, lang: string, localService = true): VoiceLike => ({ name, lang, localService });

/** Roughly what Safari on macOS lists, novelty voices first. */
const MAC = [
  v("Albert", "en-US"),
  v("Bad News", "en-US"),
  v("Zarvox", "en-US"),
  v("Fred", "en-US"),
  v("Samantha", "en-US"),
  v("Daniel", "en-GB"),
  v("Karen", "en-AU"),
  v("Karen (Enhanced)", "en-AU"),
  v("Amélie", "fr-CA"),
];

describe("Listen voice choice", () => {
  it("never picks a novelty voice", () => {
    for (const name of ["Albert", "Bad News", "Zarvox", "Whisper", "Good News", "Kathy", "Fred", "Junior", "Ralph", "Bahh", "Trinoids", "Grandma (English (US))"]) {
      expect(isNoveltyVoice(name), name).toBe(true);
    }
    expect(isNoveltyVoice("Karen")).toBe(false);
    expect(isNoveltyVoice("Daniel")).toBe(false);
  });

  it("prefers the learner's locale and a better-quality voice", () => {
    expect(pickVoice(MAC, "en-AU")?.name).toBe("Karen (Enhanced)");
    expect(pickVoice(MAC, "en-GB")?.name).toBe("Daniel");
    expect(pickVoice(MAC.filter((x) => !x.name.startsWith("Karen")), "en-AU")?.name).toBe("Daniel");
  });

  it("falls back to the browser's default when only novelty voices exist", () => {
    expect(pickVoice([v("Albert", "en-US"), v("Zarvox", "en-US")], "en-AU")).toBeNull();
    expect(pickVoice([], "en-AU")).toBeNull();
  });

  it("prefers Google and Microsoft voices over plain ones, and device voices on a tie", () => {
    const chrome = [v("English United States", "en-US"), v("Google UK English Female", "en-GB", false)];
    expect(pickVoice(chrome, "en-AU")?.name).toBe("Google UK English Female");
    expect(pickVoice([v("A", "en-AU", false), v("B", "en-AU", true)], "en-AU")?.name).toBe("B");
  });
});
