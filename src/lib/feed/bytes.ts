/**
 * Feed bytes: `content/bytes/bytes.json`. Each byte points at an existing interactive core card in a
 * lesson; the card is the interaction and its explanation is the reveal. Checked here (and by
 * bytes.test.ts, so a bad byte fails the build's tests).
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { type InteractiveCard, isInteractiveCard } from "@/cards/schema";
import type { Lesson } from "@/lib/content/schema";

/** Card types that work as a one-screen byte (tap, flip, pick or sort; no long drags). */
export const FEED_TYPES = ["multiple_choice", "true_false", "fill_gap", "binary_toggle", "next_word", "train_model", "sort_bins"] as const;
/** Types that check themselves the moment you tap (the rest have a Check button). */
export const ONE_TAP_TYPES = new Set(["multiple_choice", "true_false", "fill_gap"]);

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export const ByteSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  hook: z.string().min(5).max(80).refine((h) => words(h) <= 12, "a hook is at most 12 words"),
  lesson: z.string(),
  card: z.string(),
  rare: z.boolean().optional(),
});
export type ByteData = z.infer<typeof ByteSchema>;

export interface Byte extends Omit<ByteData, "card"> {
  courseId: string;
  lessonTitle: string;
  /** The lesson card it plays. */
  card: InteractiveCard;
}

export const BYTES_FILE = path.join(process.cwd(), "content", "bytes", "bytes.json");

/** Reads and checks every byte against the loaded lessons. Throws with every problem found. */
export function loadBytes(lessons: ReadonlyMap<string, Lesson>, file = BYTES_FILE): Byte[] {
  const raw = z.array(ByteSchema).parse(JSON.parse(fs.readFileSync(file, "utf8")));
  const problems: string[] = [];
  const ids = new Set<string>();
  const out: Byte[] = [];
  for (const b of raw) {
    if (ids.has(b.id)) problems.push(`${b.id}: duplicate id`);
    ids.add(b.id);
    const lesson = lessons.get(b.lesson);
    const card = lesson?.cards.find((c) => c.id === b.card);
    if (!lesson || lesson.kind !== "lesson") problems.push(`${b.id}: no lesson "${b.lesson}"`);
    else if (!card) problems.push(`${b.id}: no card "${b.card}" in ${b.lesson}`);
    else if (!isInteractiveCard(card) || !(FEED_TYPES as readonly string[]).includes(card.type)) problems.push(`${b.id}: a ${card.type} card can't be a byte`);
    else if (card.difficulty !== "core") problems.push(`${b.id}: bytes use core cards`);
    else out.push({ ...b, courseId: lesson.courseId, lessonTitle: lesson.title, card });
  }
  const rare = raw.filter((b) => b.rare).length;
  if (rare * 6 > raw.length) problems.push(`at most 1 in 6 bytes can be rare (${rare} of ${raw.length})`);
  if (problems.length) throw new Error(`Feed bytes:\n${problems.join("\n")}`);
  return out;
}
