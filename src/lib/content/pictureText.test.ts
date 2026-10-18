import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadContent } from "./load";

/**
 * Lesson Blueprint v1: any text inside a card's picture reads at 14px or more on a phone. At 360px
 * wide the lesson column is 328px (a 16px gutter each side); the multiple-choice figure has a 1px
 * border and 8px padding, the explainer figure 16px, so the picture is drawn about 310px or 294px
 * wide. Text that's big enough there is bigger still on tablets and desktops.
 */
const MIN_PX = 14;
const PHONE_WIDTH: Record<string, number> = { multiple_choice: 328 - 2 - 16, hook: 328 - 2 - 16, explainer: 328 - 2 - 32 };

function smallestText(svg: string): { viewWidth: number; size: number } | null {
  const viewWidth = Number(svg.match(/viewBox="[\d.-]+\s+[\d.-]+\s+([\d.]+)/)?.[1]);
  const sizes = [...svg.matchAll(/font-size(?:=|:)\s*"?([\d.]+)/g)].map((m) => Number(m[1]));
  return sizes.length && viewWidth ? { viewWidth, size: Math.min(...sizes) } : null;
}

describe("text in lesson pictures reads at 14px or more on a 360px phone", () => {
  const pictures = [...loadContent().lessons.values()].flatMap((lesson) =>
    lesson.cards.flatMap((card) => {
      if (!("image" in card) || !card.image) return [];
      const image = card.image as { src: string; revealSrc?: string };
      return [image.src, image.revealSrc]
        .filter((src): src is string => Boolean(src?.endsWith(".svg")))
        .map((src) => ({ where: `${lesson.id} → ${card.id} (${src})`, type: card.type, src }));
    }),
  );

  it("finds the pictures", () => {
    expect(pictures.length).toBeGreaterThan(0);
  });

  it.each(pictures)("$where", ({ type, src }) => {
    const width = PHONE_WIDTH[type];
    expect(width, `no phone width known for ${type} pictures`).toBeDefined();
    const text = smallestText(fs.readFileSync(path.join(process.cwd(), "public", src), "utf8"));
    if (!text) return; // no text in this picture
    const rendered = (text.size * (width ?? 0)) / text.viewWidth;
    expect(rendered, `smallest text is ${text.size} units in a ${text.viewWidth}-wide picture: about ${rendered.toFixed(1)}px on a phone`).toBeGreaterThanOrEqual(MIN_PX);
  });
});
