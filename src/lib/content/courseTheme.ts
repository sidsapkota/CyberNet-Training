/**
 * Each course's identity colour (owner, 2 Oct 2026): used only on its thumbnail art, its level dots
 * and its progress bar, never inside lessons or answer feedback. Navy and our blue stay the base.
 * Colours are tokens in src/app/theme.css (`--color-course-*`, contrast checked there). A new course
 * adds an entry here, a token pair and a cover (the template is at the top of
 * src/components/illustrations/CourseCover.tsx); until then it gets the base blue. A test checks
 * every course has both.
 */
export type CourseAccent = "safe" | "devices" | "ai" | "internet" | "base";

export const COURSE_ACCENTS: Readonly<Record<string, CourseAccent>> = {
  "stay-safe-online": "safe",
  "inside-your-devices": "devices",
  "how-ai-really-works": "ai",
  "how-the-internet-works": "internet",
};

export function courseAccent(courseId: string): CourseAccent {
  return COURSE_ACCENTS[courseId] ?? "base";
}

/** Class names per accent, written out in full so Tailwind generates them. */
export const ACCENT_CLASSES: Record<CourseAccent, { bar: string; dot: string }> = {
  safe: { bar: "bg-course-safe", dot: "border-course-safe bg-course-safe" },
  devices: { bar: "bg-course-devices", dot: "border-course-devices bg-course-devices" },
  ai: { bar: "bg-course-ai", dot: "border-course-ai bg-course-ai" },
  internet: { bar: "bg-course-internet", dot: "border-course-internet bg-course-internet" },
  base: { bar: "bg-accent", dot: "border-ink bg-ink" },
};

/** The fixed colour for a course's art on the always-navy panel. */
export const ACCENT_ART: Record<CourseAccent, string> = {
  safe: "var(--color-course-safe-art)",
  devices: "var(--color-course-devices-art)",
  ai: "var(--color-course-ai-art)",
  internet: "var(--color-course-internet-art)",
  base: "var(--color-screen-accent)",
};
