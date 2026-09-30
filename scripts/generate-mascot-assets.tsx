/**
 * Writes one static SVG per mascot expression to public/brand/mascot/<expression>.svg, for videos
 * and socials. Uses the same parts as the <Mascot> component with brand hex colours (no CSS
 * variables, no motion), so the files match the app exactly.
 *
 * Run: npm run brand:mascot
 */
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MASCOT_HEX, MASCOT_VIEWBOX } from "../src/components/mascot/geometry";
import { GlowFilter, MascotFigure } from "../src/components/mascot/parts";
import { MASCOT_EXPRESSIONS, MASCOT_LABELS, MASCOT_POSES } from "../src/components/mascot/poses";

const OUT_DIR = path.join(process.cwd(), "public", "brand", "mascot");
const EXPORT_HEIGHT = 464;

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const expression of MASCOT_EXPRESSIONS) {
  const { width, height } = MASCOT_VIEWBOX;
  const svg = renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      width={Math.round((EXPORT_HEIGHT * width) / height)}
      height={EXPORT_HEIGHT}
    >
      <title>{`CyberNet Training mascot: ${MASCOT_LABELS[expression].replace(/^Mascot /, "")}`}</title>
      <defs>
        <GlowFilter id="mascot-glow" />
      </defs>
      <MascotFigure pose={MASCOT_POSES[expression]} palette={MASCOT_HEX} glow="mascot-glow" />
    </svg>,
  );
  const file = path.join(OUT_DIR, `${expression}.svg`);
  fs.writeFileSync(file, `${svg}\n`);
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}
