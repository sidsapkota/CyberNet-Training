import type { Card, CardType } from "../../cards/schema";
import { stripGlossaryMarks } from "../glossary";
import { DEFAULT_SITE_URL } from "../site";
import type { LoadedContent } from "./load";
import type { Lesson } from "./schema";

/**
 * The content export (`npm run export:content` → `WEBSITE-CONTENT-FOR-AI.md` at the repo root): the one
 * file the owner hands to another AI so it knows what's on the website and can draft videos and
 * posts. It starts with a briefing (audience, tone, safety rules), then every course. Rebuilt on every
 * `npm run build`, and a test fails if it falls behind /content. Pure, so it's tested without the file
 * system.
 *
 * It only reads what learners see before answering: explainer text and card prompts. It never
 * includes quiz cards, correct answers, explanations, hints or nudges.
 */

/** Hands-on types first: these make the best clips. Static cards are never "interactive picks". */
const TYPE_RANK: Partial<Record<CardType, number>> = {
  simulator: 0,
  teardown: 1,
  packet_path: 2,
  terminal: 3,
  scenario: 4,
  hotspot: 5,
  sort_bins: 6,
  train_model: 0,
  next_word: 2,
  binary_toggle: 7,
  match_pairs: 8,
  drag_to_order: 9,
  numeric_input: 10,
  multiple_choice: 11,
};

const TYPE_LABEL: Record<CardType, string> = {
  explainer: "Explainer",
  photo: "Photo",
  multiple_choice: "Multiple choice",
  drag_to_order: "Put in order",
  binary_toggle: "Binary switches",
  numeric_input: "Number answer",
  match_pairs: "Match pairs",
  packet_path: "Route a packet",
  terminal: "Terminal",
  hotspot: "Tap the picture",
  teardown: "Take it apart",
  simulator: "Simulator",
  scenario: "Choose what happens",
  sort_bins: "Sort into groups",
  train_model: "Train a model",
  next_word: "Next word",
  reveal: "Tap to learn",
  true_false: "True or false",
  fill_gap: "Fill the gap",
};

const PICKS_PER_LESSON = 3;
const KEY_FACTS_PER_EXPLAINER = 2;
const SURPRISES_PER_LESSON = 3;
const MAX_PROMPT = 220;

/** Words that usually mark a fact worth repeating in a video. Numbers count too. */
const SURPRISING = /\b(billion|billions|million|millions|thousand|thousands|trillion|every second|actually|in fact|even though)\b|\d{2,}/i;

/** Markdown to one line of readable text: glossary marks and link syntax gone, bold kept. */
export function plainText(markdown: string): string {
  return stripGlossaryMarks(markdown)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*(?:[-*]|\d+\.)\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Sentences of an explainer body (lists become their own sentences). */
export function sentences(markdown: string): string[] {
  return stripGlossaryMarks(markdown)
    .split(/\n+/)
    .flatMap((line) => plainText(line).split(/(?<=[.!?])\s+(?=[A-Z"'`*(])/))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function truncate(text: string, max = MAX_PROMPT): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max / 2)).replace(/[\s,;:.]+$/, "")}…`;
}

/**
 * The lesson's key facts: the words it teaches ("tap to learn" cards, one sentence each), then the
 * sentences that name an idea in bold, up to two per explainer.
 */
export function keyFacts(lesson: Lesson): { title: string; facts: string[] }[] {
  const words = lesson.cards.flatMap((card) => (card.type === "reveal" ? [plainText(card.sentence)] : []));
  const explained = lesson.cards.flatMap((card) => {
    if (card.type !== "explainer") return [];
    const facts = sentences(card.body)
      .filter((s) => s.includes("**"))
      .slice(0, KEY_FACTS_PER_EXPLAINER);
    return facts.length ? [{ title: card.title, facts }] : [];
  });
  return [...(words.length ? [{ title: "Words it teaches", facts: words }] : []), ...explained];
}

/** Explainer sentences with big numbers or "actually"-style surprises, not already key facts. */
export function surprisingFacts(lesson: Lesson): string[] {
  const used = new Set(keyFacts(lesson).flatMap((k) => k.facts));
  return lesson.cards
    .flatMap((card) => (card.type === "explainer" ? sentences(card.body) : []))
    .filter((s) => !used.has(s) && !/^Next\b/.test(s) && (s.match(/[A-Za-z]{2,}/g) ?? []).length >= 7 && SURPRISING.test(s))
    .slice(0, SURPRISES_PER_LESSON);
}

type Promptable = Extract<Card, { prompt: string }>;

/** The most hands-on cards in a lesson, in lesson order, shown by their prompt only. */
export function interactivePicks(lesson: Lesson): { type: string; prompt: string }[] {
  const candidates = lesson.cards
    .map((card, index) => ({ card, index }))
    .filter((c): c is { card: Promptable; index: number } => "prompt" in c.card && TYPE_RANK[c.card.type] !== undefined);
  return candidates
    .sort((a, b) => TYPE_RANK[a.card.type]! - TYPE_RANK[b.card.type]! || a.index - b.index)
    .slice(0, PICKS_PER_LESSON)
    .sort((a, b) => a.index - b.index)
    .map(({ card }) => ({
      type: card.type === "hotspot" && card.mode === "explore" ? "Explore the picture" : TYPE_LABEL[card.type],
      prompt: truncate(plainText(card.prompt)),
    }));
}

/** Who can open a lesson from a link: what a video's viewers will meet. */
export function accessLabel(lesson: Pick<Lesson, "access" | "guests">): string {
  if (lesson.access === "pro") return "Pro";
  return lesson.guests ? "Free, no account needed (best for video links)" : "Free with a free account";
}

export function taggedLink(lessonId: string): string {
  return `${new URL(DEFAULT_SITE_URL).host}/from/<platform>/${lessonId}`;
}

const LEVEL: Record<string, string> = {
  easy: "Easy: feels like a game, very little reading",
  medium: "Medium: simple cause and effect, a little prediction",
  hard: "Hard: how it really works underneath, still beginner-friendly",
};

/** What the other AI needs to know before it drafts anything. */
const BRIEFING = [
  "# CyberNet Training: website content for AI",
  "",
  "**Give this whole file to an AI before asking it to draft videos or posts.** It's generated from the",
  "lessons themselves and rebuilt every time the website is built, so it always matches what's live on",
  "https://cybernettraining.com. Don't edit it by hand.",
  "",
  "## Briefing for the AI",
  "",
  "- **What it is:** CyberNet Training, a free-to-start website of short, hands-on lessons on how tech works:",
  "  staying safe online, what's inside phones and laptops, how AI works, and how the internet works.",
  "  Lessons are made of interactive cards (sort, drag, tap a picture, take a device apart, train a tiny model).",
  "- **Audience:** \"For ages 13+. No experience needed.\" Write for a curious 13-year-old and an adult alike:",
  "  plain words, short sentences, light humour where it fits, never childish. Australian English spelling.",
  "- **Use only what's in this file.** Don't invent facts, numbers or features. If something isn't here,",
  "  say so rather than guess. It teaches understanding, never exam or certificate prep.",
  "- **Tease, don't spoil:** \"Best interactive cards\" are questions learners answer on the site. Pose them",
  "  as a challenge (\"Can you…?\") and send viewers to the lesson; never give the answer. Quizzes aren't",
  "  in this file on purpose.",
  "- **Safety rules:**",
  "  - Online safety is defence only: how to spot and stop scams, never how to run one. Examples use made-up",
  "    names (\"Your Bank\", \"Parcels\") and `.example` addresses, never real companies or real scam sites.",
  "  - Never show or describe opening a real phone or laptop: the lessons are simulations, and a damaged",
  "    battery can catch fire. Point to a repair shop.",
  "  - Help lines, word for word: **Kids Helpline 1800 55 1800** (ages 5 to 25) always with **Lifeline 13 11 14**",
  "    (anyone in Australia, any time); **000** in an emergency. Calm and kind: it's never the viewer's fault.",
  "  - No real brands, apart from the one AI lesson (\"AI Tools Today\") that names real products.",
  "- **Honest marketing:** no fake urgency, countdowns or guilt. Pro is a paid subscription with a 7-day free",
  "  trial; under-18s should ask a parent or guardian before subscribing.",
  "- **Links:** use each lesson's tagged link and replace `<platform>` with one lower-case word for the",
  "  platform or video (`tiktok`, `youtube`, `tiktok-ram`), so we can see where visitors came from. Lessons",
  "  marked \"no account needed\" work straight from a video; other free lessons ask for a free account, and",
  "  Pro lessons need Pro.",
  "",
  "## What's on the website",
  "",
];

export function renderContentExport(content: LoadedContent): string {
  const out: string[] = [...BRIEFING];

  for (const course of content.courses) {
    out.push(`## ${course.title}`, "", course.description, "", `- **Level:** ${LEVEL[course.level] ?? course.level}`, "");
    for (const mod of course.modules) {
      out.push(`### Module ${mod.order}: ${mod.title} (${mod.access === "pro" ? "Pro" : "Free"})`, "", mod.description, "");
      for (const outline of mod.lessons) {
        const lesson = content.lessons.get(outline.id);
        if (!lesson) continue;
        if (lesson.kind === "quiz") {
          const questions = lesson.cards.length;
          out.push(`#### Module quiz (${questions} question${questions === 1 ? "" : "s"})`, "", "Not exported, so the answers stay secret.", "");
          continue;
        }
        out.push(
          `#### ${lesson.title}`,
          "",
          ...(lesson.kind === "lesson" ? [`- **What you learn:** ${lesson.about}`] : []),
          `- **Access:** ${accessLabel(lesson)}`,
          `- **Link:** \`${taggedLink(lesson.id)}\``,
          ...(lesson.kind === "lesson" && lesson.lastChecked
            ? [`- **Facts last checked:** ${lesson.lastChecked} (real products change: check again before posting)`]
            : []),
          "",
        );

        const facts = keyFacts(lesson);
        if (facts.length) {
          out.push("**Key facts**", "");
          for (const { title, facts: lines } of facts) out.push(`- *${title}:* ${lines.join(" ")}`);
          out.push("");
        }
        const picks = interactivePicks(lesson);
        if (picks.length) {
          out.push("**Best interactive cards**", "");
          for (const pick of picks) out.push(`- ${pick.type}: ${pick.prompt}`);
          out.push("");
        }
        const surprises = surprisingFacts(lesson);
        if (surprises.length) {
          out.push("**Surprising facts**", "");
          for (const s of surprises) out.push(`- ${s}`);
          out.push("");
        }
      }
    }
  }
  return `${out.join("\n").trimEnd()}\n`;
}
