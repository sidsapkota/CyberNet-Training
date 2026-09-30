/**
 * The shared glossary (content/glossary.json): plain-language definitions of technical terms,
 * for ages 12+. Card text marks a term as `[[router]]`, or `[[routers|router]]` when the wording
 * differs from the entry's id. Marked terms become tappable definitions. Pure and framework-free,
 * so the content loader, tests and the UI all use it.
 */
import { z } from "zod";
import data from "../../content/glossary.json";

export const GlossaryEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be kebab-case"),
  /** How the term is written in the popover heading, e.g. "IP address". */
  term: z.string().trim().min(1).max(40),
  /** One or two short sentences. Plain text. */
  definition: z.string().trim().min(10).max(220),
});
export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;

export const GlossarySchema = z
  .object({ terms: z.array(GlossaryEntrySchema) })
  .refine((g) => new Set(g.terms.map((t) => t.id)).size === g.terms.length, {
    message: "glossary ids must be unique",
    path: ["terms"],
  });

const glossary = GlossarySchema.parse(data);
const byId = new Map(glossary.terms.map((t) => [t.id, t]));

export function glossaryEntry(id: string): GlossaryEntry | undefined {
  return byId.get(id);
}

export function glossaryEntries(): readonly GlossaryEntry[] {
  return glossary.terms;
}

/** `[[label]]` or `[[label|id]]`. Labels can't contain brackets or pipes. */
const MARK = /\[\[([^\][|]+?)(?:\|([^\][|]+?))?\]\]/g;

/** The id a mark refers to: explicit, or the label in kebab-case ("IP address" → "ip-address"). */
export function markId(label: string, id?: string): string {
  return (id ?? label).trim().toLowerCase().replace(/\s+/g, "-");
}

export interface GlossaryMark {
  label: string;
  id: string;
}

export function findGlossaryMarks(text: string): GlossaryMark[] {
  return [...text.matchAll(MARK)].map((m) => ({ label: m[1]!.trim(), id: markId(m[1]!, m[2]) }));
}

/** Rewrites marks as markdown links with the `glossary:` scheme, for the Markdown renderer. */
export function glossaryMarksToLinks(text: string): string {
  return text.replace(MARK, (_all, label: string, id?: string) => `[${label.trim()}](glossary:${markId(label, id)})`);
}

/** Removes the mark syntax, leaving the label (for plain-text uses such as screen-reader summaries). */
export function stripGlossaryMarks(text: string): string {
  return text.replace(MARK, (_all, label: string) => label.trim());
}
