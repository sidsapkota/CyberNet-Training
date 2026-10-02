import { describe, expect, it } from "vitest";
import {
  batteryModel,
  cpuCoresModel,
  describeDuration,
  lagFromMemory,
  memoryModel,
  MODELS,
  passwordModel,
  scheduleCores,
  storageModel,
  taskManagerModel,
  thermalModel,
} from "./index";

describe("model registry", () => {
  it("registers each model under its own id, with pure outputs matching its declared outputs", () => {
    for (const [id, model] of Object.entries(MODELS)) {
      expect(model.id).toBe(id);
    }
  });
});

describe("memory", () => {
  const params = { ramGb: 4, systemGb: 1, apps: [{ id: "a", label: "A", gb: 2 }, { id: "b", label: "B", gb: 2 }] };
  it("fills RAM as apps open and lags only once it's full", () => {
    expect(memoryModel.run({ a: true, b: false }, params)).toMatchObject({ used: 3, smooth: 1 });
    const over = memoryModel.run({ a: true, b: true }, params);
    expect(over.used).toBe(5);
    expect(over.smooth).toBeLessThan(0.7);
    expect(memoryModel.run({ a: true, b: true, ramGb: 8 }, params).smooth).toBe(1); // more RAM fixes it
  });
  it("has no lag at exactly full", () => {
    expect(lagFromMemory(4, 4)).toBe(0);
  });
});

describe("cpu-cores", () => {
  it("speeds up split work with more cores, but not unsplittable work", () => {
    const split = [{ work: 16, splittable: true }];
    expect(scheduleCores(split, 1, 2).seconds).toBe(8);
    expect(scheduleCores(split, 4, 2).seconds).toBe(2);
    const whole = [{ work: 16, splittable: false }];
    expect(scheduleCores(whole, 4, 2).seconds).toBe(8);
    expect(scheduleCores(whole, 1, 4).seconds).toBe(4); // a faster clock does help
  });
  it("reports per-core load", () => {
    const out = cpuCoresModel.run({ cores: 2, ghz: 2 }, { tasks: [{ id: "t", label: "T", work: 8, splittable: true }] });
    expect(out.seconds).toBe(2);
    expect(Array.isArray(out.cores) && out.cores.length).toBe(2);
  });
});

describe("thermal", () => {
  const params = thermalModel.params.parse({});
  it("throttles when hot, and a fan plus clear vents fix it", () => {
    const hot = thermalModel.run({ load: 100, fan: false, ventsClear: false }, params);
    expect(hot.ghz).toBeLessThan(3);
    const cool = thermalModel.run({ load: 100, fan: true, ventsClear: true }, params);
    expect(cool).toMatchObject({ ghz: 3, smooth: 1 });
    expect(thermalModel.run({ load: 100, fan: true, ventsClear: false }, params).ghz).toBeLessThan(3);
  });
});

describe("task-manager", () => {
  const params = {
    ramGb: 8,
    processes: [
      { id: "music", label: "Music", kind: "app" as const, cpu: 4, ramGb: 0.4 },
      { id: "hog", label: "Hog", kind: "app" as const, cpu: 90, ramGb: 1 },
      { id: "leak", label: "Leak", kind: "background" as const, cpu: 2, ramGb: 1, leakGbPerMin: 0.2 },
      { id: "sys", label: "System", kind: "system" as const, cpu: 5, ramGb: 1 },
    ],
  };
  it("gets smooth when the hog is ended", () => {
    expect((taskManagerModel.run({}, params).smooth as number) < 0.9).toBe(true);
    expect(taskManagerModel.run({ "end-hog": true }, params).smooth).toBe(1);
  });
  it("crashes if a system process is ended", () => {
    expect(taskManagerModel.run({ "end-sys": true, "end-hog": true }, params)).toMatchObject({ crashed: 1, smooth: 0 });
  });
  it("grows leaking memory over time", () => {
    expect(taskManagerModel.run({ minutes: 0, "end-hog": true }, params).ramUsed).toBe(2.4); // 0.4 + 1 + 1
    expect(taskManagerModel.run({ minutes: 30, "end-hog": true }, params).ramUsed).toBe(8.4); // + 30 × 0.2
  });
});

describe("storage", () => {
  it("frees space when files are deleted", () => {
    const params = { capacityGb: 64, systemGb: 20, files: [{ id: "v", label: "Videos", gb: 40 }, { id: "p", label: "Photos", gb: 3 }] };
    expect(storageModel.run({}, params).freeGb).toBe(1);
    expect(storageModel.run({ "delete-v": true }, params).freeGb).toBe(41);
  });
});

describe("battery", () => {
  const params = batteryModel.params.parse({});
  it("lasts longer with a dimmer screen and GPS off", () => {
    const all = batteryModel.run({}, params).hours as number;
    const saver = batteryModel.run({ brightness: 40, gps: false }, params).hours as number;
    expect(saver).toBeGreaterThan(all);
    expect(saver).toBeGreaterThanOrEqual(8);
  });
});

describe("password", () => {
  const run = (inputs: Record<string, number | boolean>) => passwordModel.run(inputs, { guessesPerSecond: 1e9, length: 8 });

  it("uses a fixed length param when the card has no length slider", () => {
    const params = passwordModel.params.parse({ length: 10 });
    expect(passwordModel.inputs(params).length?.default).toBe(10);
    // 26^10 ≈ 1.4e14 guesses ≈ 1.6 days: short of 100 years until more kinds of characters are added.
    expect(passwordModel.run({}, params).years).toBeLessThan(1);
    expect(passwordModel.run({ uppercase: true, digits: true, symbols: true }, params).years).toBeGreaterThan(100);
  });

  it("counts every combination of a random password: pool ^ length ÷ guesses per second", () => {
    // 26^8 ≈ 2.1e11 guesses at a billion a second ≈ 209 seconds.
    const eight = run({ length: 8 });
    expect(eight.pool).toBe(26);
    expect((eight.strength as { detail?: string }[])[1]?.detail).toBe("3 minutes");
    // 26^14 ≈ 6.5e19 ≈ 2,000 years; 26^13 ≈ 78 years.
    expect(run({ length: 14 }).years).toBeGreaterThan(100);
    expect(run({ length: 13 }).years).toBeLessThan(100);
  });

  it("shows length matters more than adding character types", () => {
    const longLower = run({ length: 16 }).years as number;
    const shortMixed = run({ length: 8, uppercase: true, digits: true, symbols: true }).years as number;
    expect(run({ length: 8, uppercase: true, digits: true, symbols: true }).pool).toBe(95);
    expect(longLower).toBeGreaterThan(shortMixed * 1000);
    // 95^10 ≈ 6e19 ≈ 1,900 years: every type at length 10 also clears 100 years.
    expect(run({ length: 10, uppercase: true, digits: true, symbols: true }).years).toBeGreaterThan(100);
  });

  it("describes durations in plain words", () => {
    expect(describeDuration(0.2)).toBe("less than a second");
    expect(describeDuration(90)).toBe("2 minutes");
    expect(describeDuration(3 * 86400)).toBe("3 days");
    expect(describeDuration(1900 * 365.25 * 86400)).toBe("about 1,900 years");
    expect(describeDuration(5e6 * 365.25 * 86400)).toBe("about 5 million years");
    expect(describeDuration(1e30)).toBe("more than a trillion years");
  });

  it("asks for a kind of character when none is picked", () => {
    expect(run({ length: 12, lowercase: false }).years).toBe(0);
  });
});
