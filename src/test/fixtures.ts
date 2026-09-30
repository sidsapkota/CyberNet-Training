import type { BinaryToggleCard } from "@/cards/binary-toggle/schema";
import type { DragToOrderCard } from "@/cards/drag-to-order/schema";
import type { ExplainerCard } from "@/cards/explainer/schema";
import type { MultipleChoiceCard } from "@/cards/multiple-choice/schema";
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
