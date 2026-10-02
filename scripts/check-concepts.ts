/**
 * Prints every prior-knowledge problem (a concept used before it's taught, only by a bonus card, or
 * never) and every graded card without `uses` tags. The same check runs in concepts.test.ts.
 *   npx tsx scripts/check-concepts.ts [course-id]
 */
import { cardsWithoutUses, conceptProblems } from "../src/lib/content/concepts";
import { loadContent } from "../src/lib/content/load";

const [courseId] = process.argv.slice(2);
const content = loadContent();
const problems = conceptProblems(content).filter((p) => !courseId || p.courseId === courseId);
for (const p of problems) console.log(`✗ ${p.lessonId}/${p.cardId} uses "${p.concept}": ${p.kind}${p.taughtAt ? ` (taught at ${p.taughtAt})` : ""}`);
const untagged = cardsWithoutUses(content);
for (const id of untagged) console.log(`✗ ${id}: no "uses" tags`);
console.log(problems.length + untagged.length === 0 ? "✓ Every question uses only what came before it." : `${problems.length} problem(s), ${untagged.length} untagged card(s)`);
process.exitCode = problems.length + untagged.length ? 1 : 0;
