import type { Metadata } from "next";
import { LegalArticle } from "@/components/legal/LegalPage";
import { getLegalPage } from "@/lib/content/legal";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The rules for using CyberNet Training, in plain words.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <LegalArticle markdown={getLegalPage("terms")} />;
}
