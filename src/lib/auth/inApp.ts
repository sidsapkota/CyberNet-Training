/**
 * In-app browsers (the web view inside Instagram, TikTok and friends). Google blocks sign-in there
 * ("disallowed_useragent"), and a link opened from an email lands in a different browser, without
 * this one's guest progress. So these get the email code instead of Google. Pure, so it's tested.
 */
export type InAppBrowser = "Instagram" | "TikTok" | "Facebook" | "Messenger" | "Snapchat";

const PATTERNS: [InAppBrowser, RegExp][] = [
  ["Instagram", /\bInstagram\b/i],
  // "musical_ly_34.1.0" (no word break after it), "BytedanceWebview", "trill_330003".
  ["TikTok", /(musical_ly|BytedanceWebview|\bTikTok\b|\btrill_)/i],
  ["Messenger", /\bFBAN\/Messenger|\bFB_IAB\/MESSENGER/i],
  ["Facebook", /\b(FBAN|FBAV|FB_IAB|FBIOS)\b/i],
  ["Snapchat", /\bSnapchat\b/i],
];

/** Which app's built-in browser this is, from its user agent, or null for a normal browser. */
export function inAppBrowser(userAgent: string | null | undefined): InAppBrowser | null {
  if (!userAgent) return null;
  for (const [name, pattern] of PATTERNS) if (pattern.test(userAgent)) return name;
  return null;
}
