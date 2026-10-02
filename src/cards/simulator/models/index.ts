/**
 * Simulator models, by id. Each is a pure, unit-tested function (see types.ts). Deliberately
 * simple, illustrative numbers: they show the right relationships (more apps → more RAM → lag),
 * not exact real-world figures. Every simplification is listed in content/REVIEW.md.
 */
import { z } from "zod";
import { bool, clamp, type InputSpec, type ListItem, num, type OutputSpec, round, type SimulatorModel } from "./types";

const Id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const Label = z.string().trim().min(1).max(24);

/** RAM pressure → lag: fine until full, then slower the further over (data is swapped to storage). */
export function lagFromMemory(usedGb: number, ramGb: number): number {
  const over = usedGb - ramGb;
  return over <= 0 ? 0 : clamp(0.35 + over / ramGb);
}

/* ── memory: open apps fill RAM ─────────────────────────────────────────────────────────── */

const MemoryParams = z.object({
  ramGb: z.number().min(1).max(64),
  systemGb: z.number().min(0).max(16),
  apps: z.array(z.object({ id: Id, label: Label, gb: z.number().min(0.1).max(16) })).min(1).max(8),
});

export const memoryModel: SimulatorModel<z.infer<typeof MemoryParams>> = {
  id: "memory",
  summary: "Toggle apps open; they fill RAM. Over capacity, the device lags. Optional `ramGb` slider.",
  params: MemoryParams,
  inputs: (p) => ({
    ramGb: { type: "number", default: p.ramGb, min: 1, max: 32 },
    ...Object.fromEntries(p.apps.map((a) => [a.id, { type: "boolean", default: false } satisfies InputSpec])),
  }),
  outputs: () => ({ used: { type: "number" }, usedPct: { type: "number" }, smooth: { type: "number" }, apps: { type: "list" } }),
  run(inputs, p) {
    const ram = num(inputs.ramGb, p.ramGb);
    const open = p.apps.filter((a) => bool(inputs[a.id], false));
    const used = p.systemGb + open.reduce((sum, a) => sum + a.gb, 0);
    return {
      used: round(used),
      usedPct: clamp(used / ram),
      smooth: round(1 - lagFromMemory(used, ram), 2),
      apps: [
        { id: "system", label: "System", value: clamp(p.systemGb / ram), detail: `${p.systemGb} GB`, state: "system" },
        // Closed apps stay listed (crossed out), so each app keeps its row.
        ...p.apps.map((a): ListItem => (open.includes(a) ? { id: a.id, label: a.label, value: clamp(a.gb / ram), detail: `${a.gb} GB` } : { id: a.id, label: a.label, value: 0, detail: "closed", state: "off" })),
      ],
    };
  },
};

/* ── cpu-cores: split work across cores ─────────────────────────────────────────────────── */

const CoresParams = z.object({
  tasks: z
    .array(z.object({ id: Id, label: Label, work: z.number().min(0.5).max(200), splittable: z.boolean() }))
    .min(1)
    .max(8),
});

/** Seconds to finish every task: split tasks are shared evenly, others run whole on one core. */
export function scheduleCores(tasks: { work: number; splittable: boolean }[], cores: number, ghz: number) {
  const loads = Array.from({ length: cores }, () => 0);
  const pieces = tasks.flatMap((t) => (t.splittable ? Array.from({ length: cores }, () => t.work / cores) : [t.work]));
  for (const piece of pieces.sort((a, b) => b - a)) {
    const i = loads.indexOf(Math.min(...loads));
    loads[i]! += piece;
  }
  // `work` is in billions of instructions; one instruction per tick keeps the maths simple.
  const seconds = Math.max(...loads) / ghz;
  return { loads, seconds };
}

export const cpuCoresModel: SimulatorModel<z.infer<typeof CoresParams>> = {
  id: "cpu-cores",
  summary: "Sliders `cores` (1–8) and `ghz` (1–5). Splittable tasks share cores; others don't.",
  params: CoresParams,
  inputs: () => ({
    cores: { type: "number", default: 1, min: 1, max: 8 },
    ghz: { type: "number", default: 2, min: 1, max: 5 },
  }),
  outputs: () => ({ seconds: { type: "number" }, cores: { type: "list" } }),
  run(inputs, p) {
    const cores = Math.round(clamp(num(inputs.cores, 1), 1, 8));
    const ghz = clamp(num(inputs.ghz, 2), 1, 5);
    const { loads, seconds } = scheduleCores(p.tasks, cores, ghz);
    const busiest = Math.max(...loads) || 1;
    return {
      seconds: round(seconds),
      cores: loads.map((load, i) => ({
        id: `core-${i + 1}`,
        label: `Core ${i + 1}`,
        value: clamp(load / busiest),
        detail: `${round(load / ghz)} s`,
        state: load === 0 ? "off" : "normal",
      })),
    };
  },
};

/* ── thermal: heat makes the CPU slow down ──────────────────────────────────────────────── */

const ThermalParams = z.object({
  baseGhz: z.number().min(1).max(6).default(3),
  ambientC: z.number().min(0).max(45).default(25),
  /** Above this, the CPU protects itself by slowing down. */
  throttleC: z.number().min(60).max(110).default(90),
});

export const thermalModel: SimulatorModel<z.infer<typeof ThermalParams>> = {
  id: "thermal",
  summary: "Slider `load` (0–100%), toggles `fan` and `ventsClear`. Too hot → the clock speed drops.",
  params: ThermalParams,
  inputs: () => ({
    load: { type: "number", default: 100, min: 0, max: 100 },
    fan: { type: "boolean", default: false },
    ventsClear: { type: "boolean", default: false },
  }),
  outputs: () => ({ temp: { type: "number" }, ghz: { type: "number" }, smooth: { type: "number" } }),
  run(inputs, p) {
    const load = clamp(num(inputs.load, 100), 0, 100) / 100;
    const cooling = (bool(inputs.fan, false) ? 0.55 : 1) * (bool(inputs.ventsClear, false) ? 1 : 1.5);
    const raw = p.ambientC + load * 90 * cooling;
    // Throttling keeps the chip from getting much hotter than its limit.
    const temp = raw > p.throttleC ? p.throttleC + (raw - p.throttleC) * 0.15 : raw;
    const ghz = raw > p.throttleC ? p.baseGhz * clamp(1 - (raw - p.throttleC) / 60, 0.4, 1) : p.baseGhz;
    return { temp: Math.round(temp), ghz: round(ghz), smooth: round(ghz / p.baseGhz, 2) };
  },
};

/* ── task-manager: find and end the process hogging resources ───────────────────────────── */

const TaskParams = z.object({
  ramGb: z.number().min(1).max(64),
  processes: z
    .array(
      z.object({
        id: Id,
        label: Label,
        kind: z.enum(["app", "background", "system"]),
        cpu: z.number().min(0).max(100),
        ramGb: z.number().min(0).max(32),
        /** Memory leak: extra GB per minute of the `minutes` slider. */
        leakGbPerMin: z.number().min(0).max(1).optional(),
      }),
    )
    .min(2)
    .max(8),
});

export const taskManagerModel: SimulatorModel<z.infer<typeof TaskParams>> = {
  id: "task-manager",
  summary: "Buttons `end-<process id>`; optional `minutes` slider for leaks. Ending a system process crashes it.",
  params: TaskParams,
  inputs: (p) => ({
    minutes: { type: "number", default: 0, min: 0, max: 60 },
    ...Object.fromEntries(p.processes.map((proc) => [`end-${proc.id}`, { type: "boolean", default: false } satisfies InputSpec])),
  }),
  outputs: () => ({
    cpu: { type: "number" },
    ramUsed: { type: "number" },
    smooth: { type: "number" },
    crashed: { type: "number" },
    processes: { type: "list" },
  }),
  run(inputs, p) {
    const minutes = clamp(num(inputs.minutes, 0), 0, 60);
    const running = p.processes.filter((proc) => !bool(inputs[`end-${proc.id}`], false));
    const crashed = p.processes.some((proc) => proc.kind === "system" && bool(inputs[`end-${proc.id}`], false));
    const ramOf = (proc: (typeof p.processes)[number]) => proc.ramGb + (proc.leakGbPerMin ?? 0) * minutes;
    const cpu = clamp(running.reduce((s, proc) => s + proc.cpu, 0) / 100);
    const ramUsed = running.reduce((s, proc) => s + ramOf(proc), 0);
    const cpuLag = cpu > 0.85 ? clamp(((cpu - 0.85) / 0.15) * 0.8) : 0;
    const smooth = crashed ? 0 : 1 - Math.max(cpuLag, lagFromMemory(ramUsed, p.ramGb));
    return {
      cpu: round(cpu, 2),
      ramUsed: round(ramUsed),
      smooth: round(smooth, 2),
      crashed: crashed ? 1 : 0,
      processes: p.processes.map((proc) => {
        const ended = bool(inputs[`end-${proc.id}`], false);
        const ram = round(ramOf(proc));
        return {
          id: proc.id,
          label: proc.label,
          value: ended ? 0 : clamp(proc.cpu / 100),
          detail: ended ? "ended" : `${proc.cpu}% CPU · ${ram} GB`,
          state: ended ? "off" : proc.kind === "system" ? "system" : proc.cpu >= 50 || ram >= p.ramGb / 2 ? "high" : "normal",
        } satisfies ListItem;
      }),
    };
  },
};

/* ── storage: free up space ─────────────────────────────────────────────────────────────── */

const StorageParams = z.object({
  capacityGb: z.number().min(1).max(2048),
  systemGb: z.number().min(0).max(512),
  files: z.array(z.object({ id: Id, label: Label, gb: z.number().min(0.01).max(512) })).min(2).max(8),
});

export const storageModel: SimulatorModel<z.infer<typeof StorageParams>> = {
  id: "storage",
  summary: "Toggles `delete-<file id>`. Outputs free space.",
  params: StorageParams,
  inputs: (p) => Object.fromEntries(p.files.map((f) => [`delete-${f.id}`, { type: "boolean", default: false } satisfies InputSpec])),
  outputs: () => ({ freeGb: { type: "number" }, usedPct: { type: "number" }, files: { type: "list" } }),
  run(inputs, p) {
    const kept = p.files.filter((f) => !bool(inputs[`delete-${f.id}`], false));
    const used = p.systemGb + kept.reduce((s, f) => s + f.gb, 0);
    return {
      freeGb: round(Math.max(0, p.capacityGb - used)),
      usedPct: clamp(used / p.capacityGb),
      files: p.files.map((f) => {
        const deleted = bool(inputs[`delete-${f.id}`], false);
        return { id: f.id, label: f.label, value: deleted ? 0 : clamp(f.gb / p.capacityGb), detail: deleted ? "deleted" : `${f.gb} GB`, state: deleted ? "off" : "normal" };
      }),
    };
  },
};

/* ── battery: what drains it ────────────────────────────────────────────────────────────── */

const BatteryParams = z.object({
  /** Energy left in the battery, in watt-hours. */
  wattHours: z.number().min(1).max(100).default(15),
});

export const batteryModel: SimulatorModel<z.infer<typeof BatteryParams>> = {
  id: "battery",
  summary: "Slider `brightness` (0–100); toggles `music`, `gps`, `backgroundApps`, `lowPower`. Outputs hours left.",
  params: BatteryParams,
  inputs: () => ({
    brightness: { type: "number", default: 100, min: 0, max: 100 },
    music: { type: "boolean", default: true },
    gps: { type: "boolean", default: true },
    backgroundApps: { type: "boolean", default: true },
    lowPower: { type: "boolean", default: false },
  }),
  outputs: () => ({ hours: { type: "number" }, watts: { type: "number" } }),
  run(inputs, p) {
    const lowPower = bool(inputs.lowPower, false);
    let watts =
      0.3 +
      (bool(inputs.music, true) ? 0.2 : 0) +
      (clamp(num(inputs.brightness, 100), 0, 100) / 100) * 1.2 +
      (bool(inputs.gps, true) ? 0.5 : 0) +
      (bool(inputs.backgroundApps, true) && !lowPower ? 0.6 : 0);
    if (lowPower) watts *= 0.85;
    return { hours: round(p.wattHours / watts), watts: round(watts, 2) };
  },
};


/* ── password: how long it takes to try every combination ─────────────────────────────── */

const SECONDS_PER_YEAR = 365.25 * 24 * 3600;
/** Lowercase, uppercase, digits and the 33 printable symbols on a keyboard. */
export const CHARACTER_SETS = { lowercase: 26, uppercase: 26, digits: 10, symbols: 33 } as const;

/** Plain words for a length of time: "21 seconds", "3 days", "about 1,900 years". */
export function describeDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds > SECONDS_PER_YEAR * 1e12) return "more than a trillion years";
  if (seconds < 1) return "less than a second";
  const units: [number, string][] = [
    [SECONDS_PER_YEAR, "year"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
    [1, "second"],
  ];
  const [size, name] = units.find(([u]) => seconds >= u)!;
  const n = seconds / size;
  if (name === "year" && n >= 1e9) return `about ${Math.round(n / 1e9).toLocaleString("en-AU")} billion years`;
  if (name === "year" && n >= 1e6) return `about ${Math.round(n / 1e6).toLocaleString("en-AU")} million years`;
  const whole = Math.round(n);
  return `${name === "year" && whole >= 10 ? "about " : ""}${whole.toLocaleString("en-AU")} ${name}${whole === 1 ? "" : "s"}`;
}

const PasswordParams = z.object({
  /** How fast the guessing computer is. Illustrative: real speeds vary enormously. */
  guessesPerSecond: z.number().min(1).max(1e12).default(1e9),
  /** The starting length (fixed, if the card has no `length` slider). */
  length: z.number().int().min(4).max(24).default(8),
});

/**
 * A random password's strength as the time a computer would need to try every possible
 * combination: (characters to choose from) ^ (length) ÷ guesses per second. Only true for
 * RANDOM passwords: real guessers try common passwords, words and patterns first, so
 * "Password123!" falls instantly however long it is. Teaches that length matters most.
 */
export const passwordModel: SimulatorModel<z.infer<typeof PasswordParams>> = {
  id: "password",
  summary: "Slider `length` (or a fixed `length` param); toggles `lowercase`, `uppercase`, `digits`, `symbols`. Outputs the time to try every combination.",
  params: PasswordParams,
  inputs: (p) => ({
    length: { type: "number", default: p.length, min: 4, max: 24 },
    lowercase: { type: "boolean", default: true },
    uppercase: { type: "boolean", default: false },
    digits: { type: "boolean", default: false },
    symbols: { type: "boolean", default: false },
  }),
  outputs: () => ({ years: { type: "number" }, pool: { type: "number" }, strength: { type: "list" } }),
  run(inputs, p) {
    const length = Math.round(clamp(num(inputs.length, p.length), 1, 64));
    const pool = (Object.keys(CHARACTER_SETS) as (keyof typeof CHARACTER_SETS)[])
      .filter((set) => bool(inputs[set], set === "lowercase"))
      .reduce((sum, set) => sum + CHARACTER_SETS[set], 0);
    if (pool === 0) {
      return { years: 0, pool: 0, strength: [{ id: "time", label: "Time to try every one", value: 0, detail: "pick a kind of character" }] };
    }
    const seconds = pool ** length / p.guessesPerSecond;
    const years = seconds / SECONDS_PER_YEAR;
    // Bar: 0 at "under a second", full at a million years (log scale).
    const bar = clamp(Math.log10(Math.max(seconds, 1)) / Math.log10(SECONDS_PER_YEAR * 1e6));
    return {
      years: years >= 1e15 ? 1e15 : round(years, 2),
      pool,
      strength: [
        { id: "pool", label: "Characters to choose from", value: pool / 95, detail: String(pool) },
        { id: "time", label: "Time to try every one", value: bar, detail: describeDuration(seconds) },
      ],
    };
  },
};

/* ── Registry ───────────────────────────────────────────────────────────────────────────── */

// Each model has its own params type; the registry erases it (params are validated on load).
export const MODELS: Record<string, SimulatorModel<unknown>> = {
  memory: memoryModel as SimulatorModel<unknown>,
  "cpu-cores": cpuCoresModel as SimulatorModel<unknown>,
  thermal: thermalModel as SimulatorModel<unknown>,
  "task-manager": taskManagerModel as SimulatorModel<unknown>,
  storage: storageModel as SimulatorModel<unknown>,
  battery: batteryModel as SimulatorModel<unknown>,
  password: passwordModel as SimulatorModel<unknown>,
};
export const MODEL_IDS = Object.keys(MODELS) as [string, ...string[]];

export type { OutputSpec };
