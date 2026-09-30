"use client";

import { MotionConfig } from "motion/react";
import { type ReactNode, useEffect } from "react";
import { AgeGate } from "@/components/account/AgeGate";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ProProvider } from "@/lib/pro/ProProvider";
import { installAudioUnlock } from "@/lib/sound";

export function Providers({ children }: { children: ReactNode }) {
  // Sound can only ever play after the learner's first tap or key press.
  useEffect(() => installAudioUnlock(), []);
  return (
    // reducedMotion="user": motion drops transform/layout animations when the OS asks for reduced motion.
    <MotionConfig reducedMotion="user">
      {/* AuthProvider also provides progress: localStorage for guests, Supabase when signed in. */}
      <AuthProvider>
        {/* ProProvider only shows Pro status; the server decides access. */}
        <ProProvider>
          {children}
          <AgeGate />
        </ProProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
