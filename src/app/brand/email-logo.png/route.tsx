import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

/**
 * The logo lockup for sign-in emails, as a PNG (most email clients can't show SVG). Drawn at 2×
 * (560×112) and shown at 280×56 in the templates in docs/email/. The navy background is baked
 * in, so the light text stays readable even if a dark-mode email client recolours the header.
 * Served at /brand/email-logo.png; generated at build.
 */
export const dynamic = "force-static";

export async function GET() {
  const [logo, semibold] = await Promise.all([
    readFile(path.join(process.cwd(), "public/brand/logo-color.svg")),
    readFile(path.join(process.cwd(), "assets/og-fonts/ibm-plex-sans-latin-600-normal.woff")),
  ]);
  const src = `data:image/svg+xml;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ display: "flex", alignItems: "center", gap: 22, width: "100%", height: "100%", paddingLeft: 4, background: "#061630" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered to PNG, not the DOM */}
        <img src={src} width={96} height={96} alt="" />
        <span style={{ fontFamily: "Plex", fontSize: 50, fontWeight: 600, color: "#e6eef9" }}>CyberNet Training</span>
      </div>
    ),
    { width: 560, height: 112, fonts: [{ name: "Plex", data: semibold, weight: 600, style: "normal" }] },
  );
}
