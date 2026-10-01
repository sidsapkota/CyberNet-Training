import type { CourseLevel as Level } from "@/lib/content/schema";

const LEVELS: Record<Level, { dots: 1 | 2 | 3; word: string }> = {
  easy: { dots: 1, word: "Easy" },
  medium: { dots: 2, word: "Medium" },
  hard: { dots: 3, word: "Hard" },
};

/**
 * A course's level: 1–3 filled dots (small nodes, in the network's style) and the word, so it's
 * never shape or colour alone. Not cyan: a level isn't something to tap.
 */
export function CourseLevel({ level, className = "" }: { level: Level; className?: string }) {
  const { dots, word } = LEVELS[level];
  return (
    <span className={`inline-flex items-center gap-1.5 text-small text-ink-muted ${className}`}>
      <span aria-hidden="true" className="inline-flex items-center gap-1">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`size-2 rounded-node border ${n <= dots ? "border-ink bg-ink" : "border-line-strong bg-transparent"}`} />
        ))}
      </span>
      <span>
        <span className="sr-only">Level: </span>
        {word}
      </span>
    </span>
  );
}
