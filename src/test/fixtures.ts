import type { BinaryToggleCard } from "@/cards/binary-toggle/schema";
import type { DragToOrderCard } from "@/cards/drag-to-order/schema";
import type { ExplainerCard } from "@/cards/explainer/schema";
import type { PhotoCard } from "@/cards/photo/schema";
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
import type { NextWordCard } from "@/cards/next-word/schema";
import type { TrainModelCard } from "@/cards/train-model/schema";
import type { CourseOutline, LessonOutline, ModuleOutline } from "@/lib/content/schema";

export const explainer = (over: Partial<ExplainerCard> = {}): ExplainerCard => ({
  id: "intro",
  type: "explainer",
  difficulty: "core",
  title: "Hello",
  body: "Some **markdown**.",
  ...over,
});

export const photo = (over: Partial<PhotoCard> = {}): PhotoCard => ({
  id: "photo",
  type: "photo",
  difficulty: "core",
  title: "A real laptop",
  photo: { src: "/photos/laptop.jpg", alt: "A laptop with its cover off.", width: 1200, height: 800 },
  caption: "Inside a laptop.",
  credit: {
    author: "A. Photographer",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Laptop.jpg",
  },
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
    { id: "cover", part: "back-cover", verb: "lift", nudge: "Lift it." },
    { id: "s1", part: "screw-1", verb: "unscrew", after: ["cover"], nudge: "Cover off first." },
    { id: "s2", part: "screw-2", verb: "unscrew", after: ["cover"], nudge: "Cover off first." },
    { id: "unplug", part: "battery-connector", verb: "unplug", after: ["s1", "s2"], nudge: "Screws out first." },
  ],
  explanation: "Cover, screws, then battery.",
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

/**
 * Fruit on a chart (roundness across, yellowness up). Every training apple is red, so the model
 * calls a yellow apple a banana: the mistake the card is there to show.
 */
export const trainModel = (over: Partial<TrainModelCard> = {}): TrainModelCard => ({
  id: "fruit",
  type: "train_model",
  difficulty: "core",
  prompt: "Label each fruit, then see what the model guesses.",
  model: {
    kind: "nearest",
    k: 1,
    x: { label: "Shape", low: "Long", high: "Round" },
    y: { label: "Colour", low: "Red", high: "Yellow" },
  },
  labels: [
    { id: "apple", text: "Apple" },
    { id: "banana", text: "Banana" },
  ],
  examples: [
    { id: "a1", text: "Red apple", x: 9, y: 1, label: "apple", given: false },
    { id: "a2", text: "Small red apple", x: 8, y: 2, label: "apple", given: false },
    { id: "a3", text: "Big red apple", x: 9, y: 3, label: "apple", given: true },
    { id: "b1", text: "Banana", x: 1, y: 9, label: "banana", given: false },
    { id: "b2", text: "Long banana", x: 2, y: 8, label: "banana", given: true },
    { id: "b3", text: "Spotty banana", x: 2, y: 7, label: "banana", given: false },
  ],
  tests: [
    { id: "t1", text: "Shiny red apple", x: 8, y: 1, truth: "apple" },
    { id: "t2", text: "Ripe banana", x: 1, y: 8, truth: "banana" },
    { id: "t3", text: "Yellow apple", x: 6, y: 8, truth: "apple" },
  ],
  task: { goal: "label" },
  explanation: "The model only saw red apples, so a yellow apple looked more like a banana.",
  ...over,
});

/** Messages: "free" only ever appears in spam, so a friendly message with "free" is called spam. */
export const trainModelWords = (over: Partial<TrainModelCard> = {}): TrainModelCard => ({
  id: "spam",
  type: "train_model",
  difficulty: "core",
  prompt: "Label each message as spam or not spam.",
  model: { kind: "word-vote" },
  labels: [
    { id: "spam", text: "Spam" },
    { id: "ok", text: "Not spam" },
  ],
  examples: [
    { id: "m1", text: "Win a free phone now", label: "spam", given: false },
    { id: "m2", text: "Free prize, click this link", label: "spam", given: false },
    { id: "m3", text: "Claim your free gift card", label: "spam", given: true },
    { id: "m4", text: "See you at training tonight", label: "ok", given: false },
    { id: "m5", text: "Pizza for dinner tonight?", label: "ok", given: false },
    { id: "m6", text: "Can you send me the homework", label: "ok", given: true },
  ],
  tests: [
    { id: "t1", text: "Click to claim a free prize", truth: "spam" },
    { id: "t2", text: "Free pizza at footy training", truth: "ok" },
  ],
  task: { goal: "label" },
  explanation: "Every message with \"free\" in it was spam, so the model learned that \"free\" means spam.",
  ...over,
});

export const nextWord = (over: Partial<NextWordCard> = {}): NextWordCard => ({
  id: "cat",
  type: "next_word",
  difficulty: "core",
  prompt: "Which word is the model most likely to choose next?",
  context: "The cat sat on the",
  candidates: [
    { word: "mat", p: 0.6 },
    { word: "sofa", p: 0.2 },
    { word: "floor", p: 0.15 },
    { word: "moon", p: 0.05 },
  ],
  temperature: { min: 0.2, max: 2, start: 1, step: 0.1 },
  goal: { type: "pick", word: "mat" },
  explanation: "\"mat\" has the biggest chance, because it follows \"The cat sat on the\" most often in the text the model learned from.",
  ...over,
});

export const lessonOutline = (over: Partial<LessonOutline> = {}): LessonOutline => ({
  id: "lesson",
  kind: "lesson",
  title: "Lesson",
  order: 1,
  access: "free",
  guests: true,
  courseId: "course",
  moduleId: "module",
  cardCount: 3,
  coreCardIds: ["c1", "c2"],
  photoCount: 0,
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
    level: "easy",
    order: 1,
    modules: [moduleOutline("m1", 1, ["l1", "l2"], "quiz1"), moduleOutline("m2", 2, ["l3"], "quiz2")],
  };
}

/** The same course with m2 as a Pro module: m1 = [l1, l2, quiz1] free, m2 = [l3, quiz2] Pro. */
export function proCourse(): CourseOutline {
  return { ...twoModuleCourse(), modules: [moduleOutline("m1", 1, ["l1", "l2"], "quiz1"), moduleOutline("m2", 2, ["l3"], "quiz2", "pro")] };
}
