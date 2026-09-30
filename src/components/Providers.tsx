"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth/AuthProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    // reducedMotion="user": motion drops transform/layout animations when the OS asks for reduced motion.
    <MotionConfig reducedMotion="user">
      {/* AuthProvider also provides progress: localStorage for guests, Supabase when signed in. */}
      <AuthProvider>{children}</AuthProvider>
    </MotionConfig>
  );
}
