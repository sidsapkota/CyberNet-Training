import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og";

export const alt = "CyberNet Training: short, hands-on lessons on devices, the internet and staying safe online";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    eyebrow: "Free · no sign-up",
    title: "How tech really works",
    subtitle: "Short, hands-on lessons on devices, the internet and staying safe online.",
    mascot: "happy",
  });
}
