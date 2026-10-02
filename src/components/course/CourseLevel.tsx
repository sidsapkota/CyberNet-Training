import { ACCENT_CLASSES, courseAccent } from "@/lib/content/courseTheme";
import type { CourseLevel as Level } from "@/lib/content/schema";

const LEVELS: Record<Level, { dots: 1 | 2 | 3; word: string }> = {
  easy: { dots: 1, word: "Easy" },
  medium: { dots: 2, word: "Medium" },
  hard: { dots: 3, word: "Hard" },
};

/**
 * A course's level: 1–3 filled dots (small nodes, in the network's style) and the word, so it's
 * never shape or colour alone. Not cyan: a level isn't something to tap. With `courseId`, the filled
 * dots take the course's identity colour (src/lib/content/courseTheme.ts).
 */
export function CourseLevel({ level, courseId, className = "" }: { level: Level; courseId?: string; className?: string }) {
  const { dots, word } = LEVELS[level];
  const filled = courseId ? ACCENT_CLASSES[courseAccent(courseId)].dot : "border-ink bg-ink";
  return (
    <span className={`inline-flex items-center gap-1.5 text-small text-ink-muted ${className}`}>
      <span aria-hidden="true" className="inline-flex items-center gap-1">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`size-2 rounded-node border ${n <= dots ? filled : "border-line-strong bg-transparent"}`} />
        ))}
      </span>
      <span>
        <span className="sr-only">Level: </span>
        {word}
      </span>
    </span>
  );
}
