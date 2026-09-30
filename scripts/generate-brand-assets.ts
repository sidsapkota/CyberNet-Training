/**
 * Regenerates the static brand SVGs from src/components/brand/geometry.ts.
 * Run with `npm run brand:assets` after changing the mark's geometry.
 *
 * The PNG app icons (src/app/apple-icon.png, public/brand/icon-*.png) are rasterised from
 * logo-tile.svg; re-export them from any browser or image tool at the listed sizes.
 */
import fs from "node:fs";
import path from "node:path";
import { BRAND, markSvg } from "../src/components/brand/geometry";

const root = process.cwd();
const write = (file: string, content: string) => {
  const full = path.join(root, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${content}\n`);
  console.log(`✓ ${file}`);
};

// Full-colour mark on transparent (for navy backgrounds).
write("public/brand/logo-color.svg", markSvg({ color: BRAND.cyan }));
// Single-colour mark: currentColor, so it takes the colour of surrounding text when inlined.
write("public/brand/logo-mono.svg", markSvg({ color: "currentColor" }));
// App-icon tile: cyan mark on a rounded navy square.
write("public/brand/logo-tile.svg", markSvg({ tile: true, size: 512 }));
// Favicon (Next.js serves src/app/icon.svg automatically).
write("src/app/icon.svg", markSvg({ tile: true, size: 32 }));

// Horizontal lockup. Text uses IBM Plex Sans with system fallbacks.
const tile = markSvg({ tile: true, size: 64 })
  .replace(/^<svg[^>]*>/, "")
  .replace(/<\/svg>$/, "")
  .replace(/<title>.*?<\/title>/, "");
write(
  "public/brand/logo-lockup.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 64" width="400" height="64">` +
    `<title>CyberNet Training</title>` +
    `<g>${tile}</g>` +
    `<text x="80" y="42" font-family="'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif" font-size="30" letter-spacing="-0.3">` +
    `<tspan font-weight="600" fill="${BRAND.navy}">CyberNet</tspan>` +
    `<tspan font-weight="400" fill="#3D5575"> Training</tspan></text></svg>`,
);
write(
  "public/brand/logo-lockup-dark.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 64" width="400" height="64">` +
    `<title>CyberNet Training</title>` +
    `<g>${tile}</g>` +
    `<text x="80" y="42" font-family="'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif" font-size="30" letter-spacing="-0.3">` +
    `<tspan font-weight="600" fill="#E6EEF9">CyberNet</tspan>` +
    `<tspan font-weight="400" fill="#A3B6D2"> Training</tspan></text></svg>`,
);
