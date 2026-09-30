import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NODES } from "@/components/brand/geometry";
import {
  EYES,
  HAND_PATH,
  HAPPY_EYE_PATH,
  MASCOT_HEX,
  MASCOT_TOKENS,
  MOUTH_PATH,
  POINTING_HAND_PATH,
} from "./geometry";
import { MascotFigure } from "./parts";
import { MASCOT_EXPRESSIONS, MASCOT_POSES, type MascotExpression } from "./poses";

const render = (expression: MascotExpression) =>
  renderToStaticMarkup(
    createElement(
      "svg",
      null,
      createElement(MascotFigure, { pose: MASCOT_POSES[expression], palette: MASCOT_HEX, glow: "g" }),
    ),
  );
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

describe("mascot character rules", () => {
  it.each(MASCOT_EXPRESSIONS)("%s draws the one shared mouth exactly once", (expression) => {
    expect(count(render(expression), `d="${MOUTH_PATH}"`)).toBe(1);
  });

  it.each(MASCOT_EXPRESSIONS.filter((e) => e !== "presenting"))("%s uses two mitten hands", (expression) => {
    const svg = render(expression);
    expect(count(svg, `d="${HAND_PATH}"`)).toBe(2);
    expect(svg).not.toContain(POINTING_HAND_PATH);
  });

  it("presenting points with the pointing hand and keeps one mitten", () => {
    const svg = render("presenting");
    expect(count(svg, `d="${POINTING_HAND_PATH}"`)).toBe(1);
    expect(count(svg, `d="${HAND_PATH}"`)).toBe(1);
  });

  it("only alert uses the coral alert colour, for face nodes, joints and antenna", () => {
    for (const expression of MASCOT_EXPRESSIONS) {
      const coral = count(render(expression), MASCOT_HEX.alert);
      if (expression === "alert") expect(coral).toBeGreaterThanOrEqual(10); // nose, 2 cheeks, network, 7 joints, antenna
      else expect(coral).toBe(0);
    }
  });

  it("celebrating closes its eyes into happy arcs (no pupils)", () => {
    const svg = render("celebrating");
    expect(count(svg, `d="${HAPPY_EYE_PATH}"`)).toBe(2);
    expect(svg).not.toContain(MASCOT_HEX.pupil);
  });

  it("builds the face on the logo's nodes: eyes sit on the top two", () => {
    EYES.forEach((eye, i) => {
      expect(Math.abs(eye.x - NODES[i]!.x)).toBeLessThan(1);
      expect(Math.abs(eye.y - NODES[i]!.y)).toBeLessThan(2);
    });
  });
});

describe("mascot colours", () => {
  it("keeps theme.css tokens in sync with the hex values used for static exports", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/theme.css"), "utf8");
    for (const [key, hex] of Object.entries(MASCOT_HEX)) {
      const token = MASCOT_TOKENS[key as keyof typeof MASCOT_HEX].match(/--color-[a-z-]+/)?.[0];
      const declared = new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6});`).exec(css)?.[1];
      expect(declared?.toLowerCase(), `${token}`).toBe(hex.toLowerCase());
    }
  });

  it("static exports exist for every expression and match the current parts", () => {
    for (const expression of MASCOT_EXPRESSIONS) {
      const file = path.join(process.cwd(), "public/brand/mascot", `${expression}.svg`);
      const svg = fs.readFileSync(file, "utf8");
      expect(svg, `${expression}.svg is stale: run npm run brand:mascot`).toContain(
        render(expression).replace(/^<svg>|<\/svg>$/g, "").replaceAll('"url(#g)"', '"url(#mascot-glow)"'),
      );
    }
  });
});
