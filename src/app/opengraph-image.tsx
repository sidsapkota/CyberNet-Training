import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og";

export const alt = "CyberNet Training: short, hands-on lessons on how devices and the internet work";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: "Free · no sign-up",
    title: "How tech really works",
    subtitle: "Short, hands-on lessons on devices and the internet.",
    mascot: "happy",
  });
}
