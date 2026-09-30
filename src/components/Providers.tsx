"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { ProgressProvider } from "@/lib/progress/ProgressProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    // reducedMotion="user": motion drops transform/layout animations when the OS asks for reduced motion.
    <MotionConfig reducedMotion="user">
      <ProgressProvider>{children}</ProgressProvider>
    </MotionConfig>
  );
}
