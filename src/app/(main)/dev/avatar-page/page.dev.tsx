import type { Metadata } from "next";
import { AvatarStudioDemo } from "@/dev/AvatarStudioDemo";

// Dev-only route: the avatar page with local data inside the real site layout (header and phone
// tab bar), for screenshots and trying the equip motion. Nothing is saved.
export const metadata: Metadata = { title: "Avatar page (dev)", robots: { index: false, follow: false } };

export default function DevAvatarPage() {
  return <AvatarStudioDemo />;
}
