/**
 * Choosing the "Listen" voice. Pure, so it's tested without a browser.
 *
 * macOS ships novelty voices (Albert, Bad News, Zarvox…) that sound awful and often come first in
 * the list, labelled en-US. They are never used. The rest are ranked: the learner's own locale
 * (en-AU, then en-GB, then any English), higher-quality voices ("Premium", "Enhanced", "Natural",
 * "Neural"; the well-known system voices like Karen, Lee, Daniel and Samantha; Google's and
 * Microsoft's voices), and voices on the device before online ones. With nothing suitable, no voice
 * is set and the browser uses its own default for en-AU.
 */

/** The novelty and joke voices (macOS and older systems). Matched on the first word of the name. */
export const NOVELTY_VOICES = [
  "Albert",
  "Bad News",
  "Bahh",
  "Bells",
  "Boing",
  "Bubbles",
  "Cellos",
  "Deranged",
  "Good News",
  "Hysterical",
  "Jester",
  "Organ",
  "Superstar",
  "Trinoids",
  "Whisper",
  "Wobble",
  "Zarvox",
  "Fred",
  "Junior",
  "Ralph",
  "Kathy",
  "Grandma",
  "Grandpa",
  "Rocko",
  "Sandy",
  "Shelley",
  "Reed",
  "Eddy",
  "Flo",
  "Pipe Organ",
] as const;

/** Well-known, natural-sounding system voices (macOS, iOS, Windows). */
const GOOD_NAMES = ["Karen", "Lee", "Catherine", "Daniel", "Serena", "Kate", "Samantha", "Alex", "Moira", "Tessa", "Allison", "Ava", "Susan", "Zoe"];
const QUALITY = /\b(premium|enhanced|natural|neural)\b/i;

export interface VoiceLike {
  name: string;
  lang: string;
  localService: boolean;
}

export function isNoveltyVoice(name: string): boolean {
  const n = name.trim().toLowerCase();
  return NOVELTY_VOICES.some((v) => n === v.toLowerCase() || n.startsWith(`${v.toLowerCase()} `) || n.startsWith(`${v.toLowerCase()} (`));
}

/** A score for a voice (higher is better), or null when it must never be used. Pure. */
export function voiceScore(voice: VoiceLike, locale: string): number | null {
  const lang = voice.lang.replace("_", "-").toLowerCase();
  if (!lang.startsWith("en") || isNoveltyVoice(voice.name)) return null;
  const want = locale.toLowerCase();
  let score = 0;
  // Locale first: quality only decides between voices of the same accent.
  if (lang === want) score += 100;
  else if (lang === "en-au") score += 60;
  else if (lang === "en-gb") score += 40;
  else score += 20;
  if (QUALITY.test(voice.name)) score += 25;
  if (GOOD_NAMES.some((g) => voice.name.toLowerCase().startsWith(g.toLowerCase()))) score += 15;
  if (/google|microsoft/i.test(voice.name)) score += 10;
  if (voice.localService) score += 5;
  return score;
}

/** The best voice to use, or null (then the browser's default for en-AU is used). Pure. */
export function pickVoice<V extends VoiceLike>(voices: readonly V[], locale: string): V | null {
  let best: { voice: V; score: number } | null = null;
  for (const voice of voices) {
    const score = voiceScore(voice, locale);
    if (score !== null && (!best || score > best.score)) best = { voice, score };
  }
  return best?.voice ?? null;
}
