import type { ReactNode } from "react";
import { BottomNav, SiteHeader } from "@/components/nav/SiteNav";

/** Dashboard, catalog and course pages share the header (and the phone tab bar). Lessons don't. */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
      <SiteHeader />
      {children}
      <BottomNav />
    </div>
  );
}
