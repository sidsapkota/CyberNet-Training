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
  /**
   * For abbreviations: the full name, shown as "CPU = Central Processing Unit". Required when the
   * term is (or contains) an abbreviation that it doesn't already spell out (`needsFullName`).
   */
  full: z.string().trim().min(3).max(60).optional(),
  /** One plain sentence (a single full stop, at the end). */
  definition: z
    .string()
    .trim()
    .min(10)
    .max(180)
    .refine(isOneSentence, "must be one sentence (one full stop, at the end)"),
});

/** One sentence: it ends with . ! or ?, and no sentence ends before that. Pure. */
export function isOneSentence(text: string): boolean {
  const trimmed = text.trim();
  if (!/[.!?]$/.test(trimmed)) return false;
  // A sentence break: . ! or ? followed by a space and a capital letter (so "e.g." stays fine).
  return !/[.!?]\s+[A-Z]/.test(trimmed.slice(0, -1));
}

/**
 * Whether a term needs `full`: it has an abbreviation (2+ capital letters, like "CPU" or "IP")
 * that isn't already spelled out in brackets ("random-access memory (RAM)" is fine). Pure.
 */
export function needsFullName(term: string): boolean {
  const outsideBrackets = term.replace(/\([^)]*\)/g, "");
  return /\b[A-Z][A-Z0-9]+s?\b/.test(outsideBrackets);
}
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
