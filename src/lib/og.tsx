import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

/**
 * Branded link previews (Open Graph / Twitter), rendered to PNG at build time. The flagship navy
 * theme: logo, one mascot pose and the title. Cyan appears only in the logo and mascot, as the
 * brand rules require (cyan means interactive or progress). Colours mirror the fixed `screen`
 * tokens in theme.css (images can't read CSS variables). Fonts are IBM Plex Sans (OFL), vendored
 * in assets/og-fonts because the image renderer needs raw font files.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const OG = {
  navy: "#061630", // --color-screen
  ink: "#e6eef9", // --color-on-screen
  muted: "#a3b6d2", // --color-on-screen-muted
  line: "#1c3a66", // --color-screen-line
};

// Literal paths (no variables), so the bundler traces only these files.
const FILES = {
  logo: path.join(process.cwd(), "public", "brand", "logo-color.svg"),
  happy: path.join(process.cwd(), "public", "brand", "mascot", "happy.svg"),
  presenting: path.join(process.cwd(), "public", "brand", "mascot", "presenting.svg"),
};
const dataUri = async (file: string) => `data:image/svg+xml;base64,${(await readFile(file)).toString("base64")}`;

export async function renderOgImage({
  eyebrow,
  title,
  subtitle,
  mascot,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  mascot: "happy" | "presenting";
}) {
  const [logo, character, regular, semibold] = await Promise.all([
    dataUri(FILES.logo),
    dataUri(FILES[mascot]),
    readFile(path.join(process.cwd(), "assets/og-fonts/ibm-plex-sans-latin-400-normal.woff")),
    readFile(path.join(process.cwd(), "assets/og-fonts/ibm-plex-sans-latin-600-normal.woff")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: OG.navy,
          color: OG.ink,
          fontFamily: "Plex",
          padding: "64px 72px",
          border: `2px solid ${OG.line}`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG, not the DOM */}
            <img src={logo} width={64} height={64} alt="" />
            <span style={{ fontSize: 34, fontWeight: 600 }}>CyberNet Training</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: 4, color: OG.muted, textTransform: "uppercase" }}>
              {eyebrow}
            </span>
            <span style={{ marginTop: 14, fontSize: 68, fontWeight: 600, lineHeight: 1.05, letterSpacing: -1.5, maxWidth: 700 }}>
              {title}
            </span>
            <div style={{ display: "flex", marginTop: 24, width: 96, height: 6, borderRadius: 3, background: OG.line }} />
            <span style={{ marginTop: 24, fontSize: 30, lineHeight: 1.35, color: OG.muted, maxWidth: 680 }}>{subtitle}</span>
          </div>
          <span style={{ fontSize: 24, color: OG.muted }}>cybernettrainer.com</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 340 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG, not the DOM */}
          <img src={character} width={300} height={348} alt="" />
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Plex", data: regular, weight: 400, style: "normal" },
        { name: "Plex", data: semibold, weight: 600, style: "normal" },
      ],
    },
  );
}
