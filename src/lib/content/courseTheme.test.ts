import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { COVER_COURSE_IDS } from "@/components/illustrations/CourseCover";
import { ACCENT_ART, ACCENT_CLASSES, COURSE_ACCENTS, courseAccent } from "./courseTheme";
import { loadContent } from "./load";

const { courses } = loadContent();
const theme = fs.readFileSync("src/app/theme.css", "utf8");

describe("course thumbnails follow the template", () => {
  it("every course has its own cover and identity colour", () => {
    for (const course of courses) {
      expect(COVER_COURSE_IDS, `${course.id} needs a cover in CourseCover.tsx`).toContain(course.id);
      expect(courseAccent(course.id), `${course.id} needs an accent in courseTheme.ts`).not.toBe("base");
    }
  });

  it("no two courses share a colour", () => {
    const accents = Object.values(COURSE_ACCENTS);
    expect(new Set(accents).size).toBe(accents.length);
  });

  it("each colour is a theme token pair: one for surfaces (both themes), one fixed for the navy art panel", () => {
    for (const accent of new Set(Object.values(COURSE_ACCENTS))) {
      expect(theme).toMatch(new RegExp(`--color-course-${accent}: light-dark\\(#[0-9a-f]{6}, #[0-9a-f]{6}\\);`));
      expect(theme).toMatch(new RegExp(`--color-course-${accent}-art: #[0-9a-f]{6};`));
      expect(ACCENT_ART[accent]).toBe(`var(--color-course-${accent}-art)`);
      expect(ACCENT_CLASSES[accent].bar).toBe(`bg-course-${accent}`);
    }
  });

  it("the AI violet stays clearly apart from the Quantum badge's lilac", () => {
    expect(theme).toContain("--color-quantum: #b392ff;");
    expect(theme).toContain("--color-course-ai-art: #8b5cf6;");
  });
});
