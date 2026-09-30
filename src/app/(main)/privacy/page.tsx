import type { Metadata } from "next";
import { LegalArticle } from "@/components/legal/LegalPage";
import { getLegalPage } from "@/lib/content/legal";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What CyberNet Training collects, why, and how to delete it. No ads, no selling data, no tracking cookies.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <LegalArticle markdown={getLegalPage("privacy")} />;
}
