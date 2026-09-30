import type { BinaryToggleCard } from "@/cards/binary-toggle/schema";
import type { DragToOrderCard } from "@/cards/drag-to-order/schema";
import type { ExplainerCard } from "@/cards/explainer/schema";
import type { MatchPairsCard } from "@/cards/match-pairs/schema";
import type { MultipleChoiceCard } from "@/cards/multiple-choice/schema";
import type { NumericInputCard } from "@/cards/numeric-input/schema";
import type { PacketPathCard } from "@/cards/packet-path/schema";
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

export const lessonOutline = (over: Partial<LessonOutline> = {}): LessonOutline => ({
  id: "lesson",
  kind: "lesson",
  title: "Lesson",
  order: 1,
  isFree: true,
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
): ModuleOutline {
  return {
    id,
    title: id,
    description: `${id} description`,
    order,
    courseId: "course",
    lessons: [
      ...lessonIds.map((lessonId, i) =>
        lessonOutline({ id: lessonId, order: i + 1, moduleId: id }),
      ),
      lessonOutline({
        id: quizId,
        kind: "quiz",
        order: 99,
        moduleId: id,
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
