"use client";

import { Mascot } from "@/components/mascot/Mascot";
import { useAuth } from "@/lib/auth/AuthProvider";
import { SignInOptions } from "./SignInOptions";

export function LoginForm({ linkError, next }: { linkError: boolean; next?: string }) {
  const { available } = useAuth();
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center text-center">
      <Mascot expression="happy" size={150} idle />
      <h1 className="mt-4 text-headline font-semibold">Sign in</h1>
      <p className="mt-1 text-ink-muted">Keep your XP and lessons on every device.</p>
      <div className="mt-8 w-full">
        {available ? (
          <SignInOptions next={next} linkError={linkError} />
        ) : (
          <p className="rounded-card border border-line bg-surface p-4 text-small text-ink-muted">
            Accounts aren&apos;t set up on this copy of CyberNet. You can keep learning as a guest.
          </p>
        )}
      </div>
    </div>
  );
}
