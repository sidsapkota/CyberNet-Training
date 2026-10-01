import { z } from "zod";
import { CardId, nonEmpty } from "@/cards/base";
import { type Card, CardSchema, isInteractiveCard } from "@/cards/schema";
import { LESSON_ICONS, type LessonIconName } from "./lessonIcons";

/** Shared id format for courses, modules and lessons (lesson ids appear in URLs). */
export const ContentId = CardId;

const orderedMeta = {
  id: ContentId,
  title: nonEmpty,
  description: nonEmpty,
  order: z.number().int().nonnegative(),
};

/** content/courses/<course>/course.json */
export const CourseFileSchema = z.object(orderedMeta);
export type CourseFile = z.infer<typeof CourseFileSchema>;

/**
 * Who can open a module's lessons: "free" for everyone (no account needed), "pro" for CyberNet Pro.
 * Every course's first module must be free (the loader checks). See src/lib/pro/access.ts.
 */
export const ModuleAccessSchema = z.enum(["free", "pro"]);
export type ModuleAccess = z.infer<typeof ModuleAccessSchema>;

/** content/courses/<course>/modules/<module>/module.json */
export const ModuleFileSchema = z.object({
  ...orderedMeta,
  access: ModuleAccessSchema,
  /** Pro modules: the one playable card shown on the "What's next" screen (see content/teaser.ts). */
  teaserCard: z.object({ lesson: ContentId, card: CardId }).optional(),
});
export type ModuleFile = z.infer<typeof ModuleFileSchema>;

const lessonBase = {
  id: ContentId,
  title: nonEmpty,
  order: z.number().int().nonnegative(),
  cards: z.array(CardSchema).min(1, "needs at least one card"),
};

const uniqueCardIds = (l: { cards: { id: string }[] }) =>
  new Set(l.cards.map((c) => c.id)).size === l.cards.length;

export const DEFAULT_PASS_THRESHOLD = 0.7;

export const RegularLessonSchema = z
  .object({
    ...lessonBase,
    kind: z.literal("lesson"),
    /** The icon on its course path node (from the allow-list). Quizzes keep the network hub. */
    icon: z.enum(LESSON_ICONS, { error: "must be an icon from LESSON_ICONS (src/lib/content/lessonIcons.ts)" }),
  })
  .refine(uniqueCardIds, { message: "card ids must be unique within a lesson", path: ["cards"] })
  .refine((l) => l.cards.some((c) => c.difficulty === "core"), {
    message: "a lesson needs at least one core card",
    path: ["cards"],
  });

export const QuizSchema = z
  .object({
    ...lessonBase,
    kind: z.literal("quiz"),
    /** Fraction of questions needed to pass, 0 to 1. */
    passThreshold: z.number().min(0).max(1).default(DEFAULT_PASS_THRESHOLD),
  })
  .refine(uniqueCardIds, { message: "card ids must be unique within a quiz", path: ["cards"] })
  .refine((q) => q.cards.every(isInteractiveCard), {
    message: "quiz cards must all be interactive (no explainers)",
    path: ["cards"],
  })
  .refine((q) => q.cards.every((c) => c.difficulty === "core"), {
    message: "quiz cards must all be core difficulty",
    path: ["cards"],
  });

/** content/courses/<course>/modules/<module>/lessons/<lesson>.json */
export const LessonFileSchema = z.discriminatedUnion("kind", [RegularLessonSchema, QuizSchema]);
export type LessonFile = z.infer<typeof LessonFileSchema>;
export type LessonKind = LessonFile["kind"];

/** A validated lesson plus where it lives in the hierarchy (derived from its folder), and its module's access. */
export type Lesson = LessonFile & { courseId: string; moduleId: string; access: ModuleAccess };
export type RegularLesson = Extract<Lesson, { kind: "lesson" }>;
export type Quiz = Extract<Lesson, { kind: "quiz" }>;

/** Lightweight lesson info for navigation and progress; no card content. */
export interface LessonOutline {
  id: string;
  kind: LessonKind;
  title: string;
  order: number;
  /** From the lesson's module. */
  access: ModuleAccess;
  courseId: string;
  moduleId: string;
  cardCount: number;
  coreCardIds: string[];
  /** Only set for regular lessons (quizzes use the network hub). */
  icon?: LessonIconName;
  /** Only set for quizzes. */
  passThreshold?: number;
}

export interface ModuleOutline extends ModuleFile {
  courseId: string;
  /** Pro modules: the teaser card itself (deliberately public; the rest of the module isn't). */
  teaser?: Card;
  /** Sorted by order. Regular lessons first, the module quiz last. */
  lessons: LessonOutline[];
}

export interface CourseOutline extends CourseFile {
  /** Sorted by order. */
  modules: ModuleOutline[];
}

export function toLessonOutline(lesson: Lesson): LessonOutline {
  return {
    id: lesson.id,
    kind: lesson.kind,
    title: lesson.title,
    order: lesson.order,
    access: lesson.access,
    courseId: lesson.courseId,
    moduleId: lesson.moduleId,
    cardCount: lesson.cards.length,
    coreCardIds: lesson.cards.filter((c) => c.difficulty === "core").map((c) => c.id),
    ...(lesson.kind === "quiz" ? { passThreshold: lesson.passThreshold } : { icon: lesson.icon }),
  };
}
