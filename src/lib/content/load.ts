import fs from "node:fs";
import path from "node:path";
import type { z } from "zod";
import {
  CourseFileSchema,
  type CourseOutline,
  type Lesson,
  LessonFileSchema,
  ModuleFileSchema,
  type ModuleOutline,
  toLessonOutline,
} from "./schema";

/**
 * Filesystem content loader. Framework-agnostic (no `server-only`) so the
 * validate-content script and tests can use it; app code should import `./server`.
 *
 * Layout:
 *   content/courses/<course>/course.json
 *   content/courses/<course>/modules/<module>/module.json
 *   content/courses/<course>/modules/<module>/lessons/<lesson>.json
 */

export const DEFAULT_CONTENT_ROOT = path.join(process.cwd(), "content");

export class ContentValidationError extends Error {
  constructor(readonly problems: string[]) {
    super(
      `Invalid lesson content (${problems.length} problem${problems.length === 1 ? "" : "s"}):\n` +
        problems.map((p) => `  - ${p}`).join("\n"),
    );
    this.name = "ContentValidationError";
  }
}

export interface LoadedContent {
  courses: CourseOutline[];
  lessons: Map<string, Lesson>;
}

function listDirs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function listJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".json"))
    .map((d) => d.name)
    .sort();
}

function formatPath(issuePath: readonly PropertyKey[]): string {
  return issuePath.length === 0
    ? "(root)"
    : issuePath.map((p) => (typeof p === "number" ? `[${p}]` : `.${String(p)}`)).join("").replace(/^\./, "");
}

export function loadContent(root: string = DEFAULT_CONTENT_ROOT): LoadedContent {
  const problems: string[] = [];
  const rel = (file: string) => path.relative(root, file).split(path.sep).join("/");

  function readJson<S extends z.ZodType>(file: string, schema: S): z.infer<S> | null {
    if (!fs.existsSync(file)) {
      problems.push(`${rel(file)}: file is missing`);
      return null;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
      problems.push(`${rel(file)}: not valid JSON (${(error as Error).message})`);
      return null;
    }
    const result = schema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues) {
        problems.push(`${rel(file)} → ${formatPath(issue.path)}: ${issue.message}`);
      }
      return null;
    }
    return result.data;
  }

  const seenIds = new Map<string, string>();
  function claimId(kind: string, id: string, file: string) {
    const key = `${kind}:${id}`;
    const existing = seenIds.get(key);
    if (existing) problems.push(`${rel(file)}: duplicate ${kind} id "${id}" (also used in ${existing})`);
    else seenIds.set(key, rel(file));
  }

  function checkUniqueOrder(items: { order: number; id: string }[], where: string) {
    const byOrder = new Map<number, string>();
    for (const item of items) {
      const clash = byOrder.get(item.order);
      if (clash) problems.push(`${where}: "${item.id}" and "${clash}" share order ${item.order}`);
      byOrder.set(item.order, item.id);
    }
  }

  const coursesDir = path.join(root, "courses");
  if (!fs.existsSync(coursesDir)) {
    throw new ContentValidationError([`${coursesDir} does not exist`]);
  }

  const courses: CourseOutline[] = [];
  const lessons = new Map<string, Lesson>();

  for (const courseDir of listDirs(coursesDir)) {
    const coursePath = path.join(coursesDir, courseDir);
    const courseFile = path.join(coursePath, "course.json");
    const course = readJson(courseFile, CourseFileSchema);
    if (!course) continue;
    claimId("course", course.id, courseFile);

    const modules: ModuleOutline[] = [];
    for (const moduleDir of listDirs(path.join(coursePath, "modules"))) {
      const modulePath = path.join(coursePath, "modules", moduleDir);
      const moduleFile = path.join(modulePath, "module.json");
      const mod = readJson(moduleFile, ModuleFileSchema);
      if (!mod) continue;
      claimId("module", mod.id, moduleFile);

      const moduleLessons: Lesson[] = [];
      for (const lessonName of listJsonFiles(path.join(modulePath, "lessons"))) {
        const lessonFile = path.join(modulePath, "lessons", lessonName);
        const parsed = readJson(lessonFile, LessonFileSchema);
        if (!parsed) continue;
        claimId("lesson", parsed.id, lessonFile);
        moduleLessons.push({ ...parsed, courseId: course.id, moduleId: mod.id });
      }

      const where = rel(modulePath);
      moduleLessons.sort((a, b) => a.order - b.order);
      checkUniqueOrder(moduleLessons, where);

      const quizzes = moduleLessons.filter((l) => l.kind === "quiz");
      if (quizzes.length !== 1) {
        problems.push(`${where}: each module needs exactly one quiz, found ${quizzes.length}`);
      } else if (moduleLessons.at(-1)?.kind !== "quiz") {
        problems.push(`${where}: the quiz must have the highest order in its module`);
      }
      if (!moduleLessons.some((l) => l.kind === "lesson")) {
        problems.push(`${where}: a module needs at least one regular lesson`);
      }

      for (const lesson of moduleLessons) lessons.set(lesson.id, lesson);
      modules.push({ ...mod, courseId: course.id, lessons: moduleLessons.map(toLessonOutline) });
    }

    modules.sort((a, b) => a.order - b.order);
    checkUniqueOrder(modules, rel(coursePath));
    if (modules.length === 0) problems.push(`${rel(coursePath)}: a course needs at least one module`);
    courses.push({ ...course, modules });
  }

  courses.sort((a, b) => a.order - b.order);
  checkUniqueOrder(courses, "courses");

  if (problems.length > 0) throw new ContentValidationError(problems);
  return { courses, lessons };
}
