/**
 * What "Listen" reads aloud for a card (browser speech, `src/lib/speech.ts`). Pure, so it's tested.
 *
 * - Before Check: the title, body, prompt and the things to choose from (options in their on-screen
 *   order, items, bins, pairs, choices). Never the answer, the explanation, a hint or a nudge.
 * - After Check (status `correct` or `incorrect`): the same, plus the explanation.
 * - Card text is cleaned for speech: glossary marks read as their word, markdown is dropped, and
 *   technical values read sensibly (`192.0.2.1` → "192 dot 0 dot 2 dot 1", `0101` → "0 1 0 1").
 */
import { displayOptions } from "./multiple-choice/grade";
import type { Card } from "./schema";
import type { CardStatus } from "./types";

/** A dotted IPv4 address, or a domain-like name (example.com), read with "dot". */
const DOTTED = /\b(?:\d{1,3}(?:\.\d{1,3}){3}|[a-z0-9-]+(?:\.[a-z0-9-]+)+)\b/gi;

/** Reads one technical value (the inside of `code`) so a speech engine says it clearly. */
export function speakTechnical(value: string): string {
  const v = value.trim();
  if (/^0b[01]+$/i.test(v)) return `binary ${v.slice(2).split("").join(" ")}`;
  if (/^0x[0-9a-f]+$/i.test(v)) return `hex ${v.slice(2).toUpperCase().split("").join(" ")}`;
  // Bit strings ("0101 1100") digit by digit, so "0101" isn't read as "one hundred and one".
  if (/^[01]{4,}( [01]{4,})*$/.test(v)) return v.replace(/ /g, "").split("").join(" ");
  // IPv6 (has "::" or 3+ colons): group by group, "colon colon" for the gap.
  if (/^[0-9a-f:]+(\/\d+)?$/i.test(v) && (v.includes("::") || (v.match(/:/g) ?? []).length >= 3)) {
    return v.replace(/::/g, " colon colon ").replace(/:/g, " colon ").replace(/\//, " slash ").replace(/\s+/g, " ").trim();
  }
  // A port after a colon (":443") or a lone port-ish note.
  if (/^:\d{1,5}$/.test(v)) return `port ${v.slice(1)}`;
  return speakDots(v.replace(/[_*`]/g, " "));
}

function speakDots(text: string): string {
  return text.replace(DOTTED, (m) => m.split(".").join(" dot "));
}

/** Markdown and glossary marks out; technical values made speakable. */
export function speakable(markdown: string): string {
  return (
    markdown
      // code blocks: their lines, each read as technical text
      .replace(/```[a-z]*\n?([\s\S]*?)```/g, (_, code: string) => code.split("\n").map(speakTechnical).join(". "))
      // [[label]] or [[label|id]]: the label as written
      .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")
      // links: the link text only
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/`([^`]+)`/g, (_, code: string) => speakTechnical(code))
      // emphasis, headings, list bullets and table pipes
      .replace(/(\*\*|__|\*|_)(\S[^*_]*?)\1/g, "$2")
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      .replace(/\|/g, ", ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

const sentence = (s: string) => {
  const t = speakable(s);
  return t && !/[.!?:]$/.test(t) ? `${t}.` : t;
};
const list = (label: string, items: string[]) => (items.length ? `${label}: ${items.map(speakable).join("; ")}.` : "");

/** The text to read for a card, in reading order. */
export function speechText(card: Card, status: CardStatus = "answering"): string {
  const parts: string[] = [];
  const add = (...texts: (string | undefined | false)[]) => {
    for (const t of texts) if (t) parts.push(t);
  };

  switch (card.type) {
    case "explainer":
      add(sentence(card.title), sentence(card.body));
      return parts.join(" ");
    case "photo":
      add(sentence(card.title), sentence(card.caption));
      return parts.join(" ");
    case "reveal":
      add(sentence(card.prompt ?? "Tap to see."), sentence(card.sentence));
      return parts.join(" ");
    default:
      break;
  }

  add(sentence(card.prompt));
  switch (card.type) {
    case "multiple_choice":
      add(list("The options are", displayOptions(card).map((o) => o.text)));
      break;
    case "drag_to_order":
      // Not in the right order on screen either, but read alphabetically so the order isn't given away.
      add(list("The items are", [...card.items.map((i) => i.label)].sort((a, b) => a.localeCompare(b))));
      break;
    case "match_pairs":
      add(list("Match these", card.pairs.map((p) => p.left)), list("with these", [...card.pairs.map((p) => p.right)].sort((a, b) => a.localeCompare(b))));
      break;
    case "sort_bins":
      add(list("The groups are", card.bins.map((b) => b.label)), list("The items are", card.items.map((i) => i.label)));
      break;
    case "scenario": {
      const step = card.steps.find((s) => s.id === card.start);
      if (step) add(sentence(step.text), list("Your choices", step.choices.map((c) => c.text)));
      break;
    }
    case "hotspot":
      if (card.mode === "label" && card.labels) add(list("The labels are", card.labels.map((l) => l.label)));
      break;
    case "train_model":
      add(list("The labels are", card.labels.map((l) => l.text)));
      break;
    case "true_false":
      add("True or false?");
      break;
    case "fill_gap":
      add(list("The words are", card.options.map((o) => o.text)));
      break;
    case "next_word":
      add(sentence(card.context), list("The possible next words are", card.candidates.map((c) => c.word)));
      break;
    case "terminal":
      if (card.success.type === "answer") add(sentence(card.success.question));
      break;
    default:
      break;
  }
  if (status !== "answering") add(`Explanation. ${sentence(card.explanation)}`);
  return parts.join(" ");
}
