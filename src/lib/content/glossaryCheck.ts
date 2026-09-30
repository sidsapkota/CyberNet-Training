import { findGlossaryMarks } from "@/lib/glossary";

/**
 * Where glossary marks may appear: markdown text blocks only. Labels on buttons (options, items,
 * choices) can't hold a tappable term, because a button can't contain another button.
 */
function isMarkdownField(path: readonly (string | number)[]): boolean {
  const key = path.at(-1);
  if (key === "body" || key === "prompt" || key === "hint" || key === "nudge" || key === "explanation" || key === "consequence") {
    return true;
  }
  // A scenario step's situation text (steps[i].text), but not its choices' button text.
  return key === "text" && path.at(-3) === "steps";
}

/**
 * Checks one card's glossary marks: every marked term exists, is marked at most once per card
 * (first use only, to avoid clutter), and sits in a markdown field. Returns problems as
 * "path: message". Pure.
 */
export function checkGlossaryMarks(card: unknown, known: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  const marked = new Map<string, string>();

  const visit = (value: unknown, path: (string | number)[]) => {
    if (typeof value === "string") {
      const marks = findGlossaryMarks(value);
      if (marks.length === 0) return;
      const where = path.map((p) => (typeof p === "number" ? `[${p}]` : `.${p}`)).join("").replace(/^\./, "");
      if (!isMarkdownField(path)) {
        problems.push(`${where}: glossary marks are only allowed in markdown text (body, prompt, hint, nudge, explanation)`);
        return;
      }
      // Code is shown literally, so a mark inside `code` or a ``` block would show its brackets.
      const code = value.match(/```[\s\S]*?```|`[^`]*`/g) ?? [];
      if (code.some((c) => findGlossaryMarks(c).length > 0)) {
        problems.push(`${where}: glossary marks can't go inside code`);
      }
      for (const mark of marks) {
        if (!known.has(mark.id)) problems.push(`${where}: "${mark.label}" is marked, but the glossary has no "${mark.id}"`);
        const first = marked.get(mark.id);
        if (first) problems.push(`${where}: "${mark.id}" is already marked in ${first} (mark only its first use per card)`);
        else marked.set(mark.id, where);
      }
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => visit(v, [...path, i]));
    } else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) visit(v, [...path, k]);
    }
  };
  visit(card, []);
  return problems;
}
