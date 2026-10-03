import type { ReactNode } from "react";
import { LeaguesOpening } from "@/components/leagues/LeaguesOpening";
import { SiteFooter } from "@/components/nav/SiteFooter";
import { BottomNav, SiteHeader } from "@/components/nav/SiteNav";
import { ProCelebration } from "@/components/pro/ProCelebration";

/** Dashboard, catalog and course pages share the header, footer (and the phone tab bar). Lessons don't. */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
      <SiteHeader />
      {children}
      <SiteFooter />
      <BottomNav />
      <ProCelebration />
      <LeaguesOpening />
    </div>
  );
}
