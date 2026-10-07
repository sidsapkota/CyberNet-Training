import "server-only";
/**
 * Stores one anonymous card measurement, with the secret key, only for a lesson and graded card that
 * exist in the loaded content (so nothing made up can be stored). No user or device is recorded.
 */
import { isInteractiveCard } from "@/cards/schema";
import { getLesson } from "@/lib/content/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { type CardPlay, cappedMs } from "./cardPlays";

export async function recordCardPlay(play: CardPlay): Promise<boolean> {
  const lesson = getLesson(play.lessonId);
  const card = lesson?.cards.find((c) => c.id === play.cardId);
  if (!lesson || !card || !isInteractiveCard(card)) return false;
  const { error } = await createSupabaseAdminClient()
    .from("card_plays")
    .insert({ lesson_id: lesson.id, card_id: card.id, ms: cappedMs(play.ms), first_try: play.firstTry, quiz: lesson.kind === "quiz" });
  if (error) {
    console.error("Card plays: couldn't store a measurement", error.message);
    return false;
  }
  return true;
}
