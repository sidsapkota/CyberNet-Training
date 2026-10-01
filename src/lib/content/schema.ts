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
/** How hard a course is, shown as 1–3 filled dots and a word (`CourseLevel`). Required. */
export const CourseLevelSchema = z.enum(["easy", "medium", "hard"]);
export type CourseLevel = z.infer<typeof CourseLevelSchema>;

export const CourseFileSchema = z.object({ ...orderedMeta, level: CourseLevelSchema });
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
  /**
   * Free modules only: every lesson plays without an account (help and recovery modules, which
   * must never sit behind a sign-up). Otherwise guests only get each course's first lesson.
   */
  openToGuests: z.literal(true).optional(),
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
    /**
     * For lessons about fast-changing things (real products): when the facts were last checked
     * (YYYY-MM-DD). Shown to learners; validate-content warns when a recheck is due (lastChecked.ts).
     */
    lastChecked: z.iso.date().optional(),
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
export type Lesson = LessonFile & {
  courseId: string;
  moduleId: string;
  access: ModuleAccess;
  /** Playable without an account: the course's first lesson, or any lesson in an `openToGuests` module. */
  guests: boolean;
};
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
  /** Playable without an account (see `Lesson.guests`). */
  guests: boolean;
  courseId: string;
  moduleId: string;
  cardCount: number;
  coreCardIds: string[];
  /** Photo cards: a quick look, so the time estimate leaves them out. */
  photoCount: number;
  /** Only set for regular lessons (quizzes use the network hub). */
  icon?: LessonIconName;
  /** Only set for quizzes. */
  passThreshold?: number;
  /** Only set for lessons whose facts are dated (see `lastChecked` on the lesson). */
  lastChecked?: string;
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
    guests: lesson.guests,
    courseId: lesson.courseId,
    moduleId: lesson.moduleId,
    cardCount: lesson.cards.length,
    coreCardIds: lesson.cards.filter((c) => c.difficulty === "core").map((c) => c.id),
    photoCount: lesson.cards.filter((c) => c.type === "photo").length,
    ...(lesson.kind === "quiz" ? { passThreshold: lesson.passThreshold } : { icon: lesson.icon }),
    ...(lesson.kind === "lesson" && lesson.lastChecked ? { lastChecked: lesson.lastChecked } : {}),
  };
}
