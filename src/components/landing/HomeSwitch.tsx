"use client";

import { type ReactNode, useEffect } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { hasAnyProgress } from "@/lib/progress/state";

/**
 * Renders both the landing page and the dashboard; CSS shows one (see src/lib/home.ts). The
 * inline script in the root layout decides before first paint; after that, this keeps the choice
 * right when things change without a reload (a newcomer finishes a lesson and comes back, or
 * signs in).
 */
export function HomeSwitch({ landing, dashboard }: { landing: ReactNode; dashboard: ReactNode }) {
  const { auth } = useAuth();
  const { snapshot } = useProgress();
  const returning = auth.status === "signed-in" || (snapshot !== null && hasAnyProgress(snapshot));

  useEffect(() => {
    // Only ever switch *to* the dashboard here; the script's first answer covers the rest.
    if (returning) document.documentElement.setAttribute("data-returning", "");
  }, [returning]);

  return (
    <>
      <div data-home="landing">{landing}</div>
      <div data-home="dashboard">{dashboard}</div>
    </>
  );
}
