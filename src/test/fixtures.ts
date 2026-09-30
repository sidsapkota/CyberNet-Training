import type { BinaryToggleCard } from "@/cards/binary-toggle/schema";
import type { DragToOrderCard } from "@/cards/drag-to-order/schema";
import type { ExplainerCard } from "@/cards/explainer/schema";
import type { MatchPairsCard } from "@/cards/match-pairs/schema";
import type { MultipleChoiceCard } from "@/cards/multiple-choice/schema";
import type { NumericInputCard } from "@/cards/numeric-input/schema";
import type { PacketPathCard } from "@/cards/packet-path/schema";
import type { HotspotCard } from "@/cards/hotspot/schema";
import type { ScenarioCard } from "@/cards/scenario/schema";
import type { SimulatorCard } from "@/cards/simulator/schema";
import type { SortBinsCard } from "@/cards/sort-bins/schema";
import type { TeardownCard } from "@/cards/teardown/schema";
import type { TerminalCard } from "@/cards/terminal/schema";
import type { CourseOutline, LessonOutline, ModuleOutline } from "@/lib/content/schema";

export const explainer = (over: Partial<ExplainerCard> = {}): ExplainerCard => ({
  id: "intro",
  type: "explainer",
  difficulty: "core",
  title: "Hello",
  body: "Some **markdown**.",
  ...over,
});

export const multipleChoice = (over: Partial<MultipleChoiceCard> = {}): MultipleChoiceCard => ({
  id: "mc",
  type: "multiple_choice",
  difficulty: "core",
  prompt: "How many values can a bit hold?",
  options: [
    { id: "one", text: "1" },
    { id: "two", text: "2" },
    { id: "ten", text: "10" },
  ],
  correctOptionId: "two",
  explanation: "0 or 1.",
  ...over,
});

export const dragToOrder = (over: Partial<DragToOrderCard> = {}): DragToOrderCard => ({
  id: "order",
  type: "drag_to_order",
  difficulty: "core",
  prompt: "Smallest to largest",
  items: [
    { id: "a", label: "00000001" },
    { id: "b", label: "00000010" },
    { id: "c", label: "00000100" },
  ],
  explanation: "Place values double.",
  ...over,
});

export const binaryToggle = (over: Partial<BinaryToggleCard> = {}): BinaryToggleCard => ({
  id: "bits",
  type: "binary_toggle",
  difficulty: "core",
  prompt: "Make 42",
  target: 42,
  explanation: "32 + 8 + 2",
  ...over,
});

export const numericInput = (over: Partial<NumericInputCard> = {}): NumericInputCard => ({
  id: "num",
  type: "numeric_input",
  difficulty: "core",
  prompt: "Write 13 in binary",
  base: "binary",
  answer: 13,
  explanation: "8 + 4 + 1",
  ...over,
});

export const matchPairs = (over: Partial<MatchPairsCard> = {}): MatchPairsCard => ({
  id: "pairs",
  type: "match_pairs",
  difficulty: "core",
  prompt: "Match the ports",
  pairs: [
    { id: "http", left: "HTTP", right: "`80`" },
    { id: "https", left: "HTTPS", right: "`443`" },
    { id: "dns", left: "DNS", right: "`53`" },
  ],
  explanation: "Well-known ports.",
  ...over,
});

/** laptop - home - (a | b) - server, plus a dead-end printer off home. */
export const packetPath = (over: Partial<PacketPathCard> = {}): PacketPathCard => ({
  id: "path",
  type: "packet_path",
  difficulty: "core",
  prompt: "Route the packet",
  nodes: [
    { id: "laptop", kind: "device", label: "Laptop", address: "192.168.1.20", col: 0, row: 0 },
    { id: "home", kind: "router", label: "Home router", col: 1, row: 0 },
    { id: "printer", kind: "device", label: "Printer", col: 1, row: 1 },
    { id: "a", kind: "router", label: "Router A", col: 2, row: 0 },
    { id: "b", kind: "router", label: "Router B", col: 2, row: 1 },
    { id: "server", kind: "server", label: "Server", address: "198.51.100.7", col: 3, row: 0 },
  ],
  links: [
    { from: "laptop", to: "home" },
    { from: "home", to: "printer" },
    { from: "home", to: "a" },
    { from: "home", to: "b" },
    { from: "a", to: "server" },
    { from: "b", to: "server" },
  ],
  source: "laptop",
  destination: "server",
  validPaths: [
    ["laptop", "home", "a", "server"],
    ["laptop", "home", "b", "server"],
  ],
  explanation: "Either router works.",
  ...over,
});

export const terminal = (over: Partial<TerminalCard> = {}): TerminalCard => ({
  id: "term",
  type: "terminal",
  difficulty: "core",
  prompt: "Look up example.com",
  promptLabel: "learner@cybernet:~$",
  caseSensitive: false,
  commands: [
    {
      command: "nslookup example.com",
      aliases: ["nslookup www.example.com"],
      description: "Look up example.com",
      output: "Name:\texample.com\nAddress: 203.0.113.10",
    },
    { command: "hostname", output: "learner-laptop" },
  ],
  success: { type: "ran_command", command: "nslookup example.com" },
  explanation: "nslookup asks DNS.",
  ...over,
});

export const hotspot = (over: Partial<HotspotCard> = {}): HotspotCard => ({
  id: "spot",
  type: "hotspot",
  difficulty: "core",
  prompt: "Tap the storage drive",
  scene: "laptop",
  view: "open",
  mode: "tap",
  targets: ["storage"],
  explanation: "Storage keeps files.",
  ...over,
});

export const teardown = (over: Partial<TeardownCard> = {}): TeardownCard => ({
  id: "apart",
  type: "teardown",
  difficulty: "core",
  prompt: "Open it",
  scene: "phone",
  actions: [
    { id: "s1", part: "screw-1", verb: "unscrew", nudge: "Unscrew it." },
    { id: "s2", part: "screw-2", verb: "unscrew", nudge: "Unscrew it." },
    { id: "cover", part: "back-cover", verb: "lift", after: ["s1", "s2"], nudge: "Screws out first." },
    { id: "unplug", part: "battery-connector", verb: "unplug", after: ["cover"], nudge: "Cover off first." },
  ],
  explanation: "Screws, cover, then battery.",
  ...over,
});

export const simulator = (over: Partial<SimulatorCard> = {}): SimulatorCard => ({
  id: "sim",
  type: "simulator",
  difficulty: "core",
  prompt: "Make it smooth with music on",
  model: "memory",
  params: {
    ramGb: 4,
    systemGb: 1,
    apps: [
      { id: "music", label: "Music", gb: 0.5 },
      { id: "game", label: "Game", gb: 3 },
    ],
  },
  controls: [
    { id: "music", kind: "toggle", label: "Music", initial: true },
    { id: "game", kind: "toggle", label: "Game", initial: true },
  ],
  outputs: [{ id: "smooth", kind: "device", label: "Phone" }],
  goal: {
    all: [
      { target: "control", id: "music", op: "==", value: true },
      { target: "output", id: "smooth", op: ">=", value: 0.9 },
    ],
  },
  explanation: "Close the game.",
  ...over,
});

export const scenario = (over: Partial<ScenarioCard> = {}): ScenarioCard => ({
  id: "story",
  type: "scenario",
  difficulty: "core",
  prompt: "Your phone won't charge.",
  start: "first",
  steps: [
    {
      id: "first",
      text: "What do you try first?",
      choices: [
        { id: "pin", text: "Poke the port with a pin", consequence: "Metal can damage the port.", outcome: "fail" },
        { id: "cable", text: "Try another cable", consequence: "Still nothing.", next: "second" },
      ],
    },
    {
      id: "second",
      text: "Now what?",
      choices: [
        { id: "plug", text: "Try another plug", consequence: "It charges!", outcome: "success" },
        { id: "give-up", text: "Throw it away", consequence: "It was only the plug.", outcome: "fail" },
      ],
    },
  ],
  explanation: "Change one thing at a time.",
  ...over,
});

export const sortBins = (over: Partial<SortBinsCard> = {}): SortBinsCard => ({
  id: "bins",
  type: "sort_bins",
  difficulty: "core",
  prompt: "RAM or storage?",
  bins: [
    { id: "ram", label: "RAM" },
    { id: "storage", label: "Storage" },
  ],
  items: [
    { id: "a", label: "Open game", bin: "ram" },
    { id: "b", label: "Saved photos", bin: "storage" },
    { id: "c", label: "Unsaved essay", bin: "ram" },
    { id: "d", label: "Installed apps", bin: "storage" },
  ],
  explanation: "RAM is now; storage is kept.",
  ...over,
});

export const lessonOutline = (over: Partial<LessonOutline> = {}): LessonOutline => ({
  id: "lesson",
  kind: "lesson",
  title: "Lesson",
  order: 1,
  access: "free",
  courseId: "course",
  moduleId: "module",
  cardCount: 3,
  coreCardIds: ["c1", "c2"],
  ...over,
});

export function moduleOutline(
  id: string,
  order: number,
  lessonIds: string[],
  quizId: string,
  access: ModuleOutline["access"] = "free",
): ModuleOutline {
  return {
    id,
    title: id,
    description: `${id} description`,
    order,
    access,
    courseId: "course",
    lessons: [
      ...lessonIds.map((lessonId, i) =>
        lessonOutline({ id: lessonId, order: i + 1, moduleId: id, access }),
      ),
      lessonOutline({
        id: quizId,
        kind: "quiz",
        order: 99,
        moduleId: id,
        access,
        coreCardIds: ["q1", "q2"],
        cardCount: 2,
        passThreshold: 0.7,
      }),
    ],
  };
}

/** Course with two modules: m1 = [l1, l2, quiz1], m2 = [l3, quiz2]. */
export function twoModuleCourse(): CourseOutline {
  return {
    id: "course",
    title: "Course",
    description: "A course",
    order: 1,
    modules: [moduleOutline("m1", 1, ["l1", "l2"], "quiz1"), moduleOutline("m2", 2, ["l3"], "quiz2")],
  };
}

/** The same course with m2 as a Pro module: m1 = [l1, l2, quiz1] free, m2 = [l3, quiz2] Pro. */
export function proCourse(): CourseOutline {
  return { ...twoModuleCourse(), modules: [moduleOutline("m1", 1, ["l1", "l2"], "quiz1"), moduleOutline("m2", 2, ["l3"], "quiz2", "pro")] };
}
