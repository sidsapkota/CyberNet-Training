"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAccountAction, updateDisplayNameAction } from "@/app/actions/account";
import { Button } from "@/components/ui/Button";
import { DeleteIcon, SignOutIcon } from "@/components/ui/icons";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/lib/auth/AuthProvider";
import { initialOf } from "@/lib/auth/profile";

const panel = "rounded-card border border-line bg-surface p-5 shadow-card";

export function AccountPanel({
  email,
  displayName,
  welcome,
}: {
  email: string | null;
  displayName: string | null;
  welcome: boolean;
}) {
  const router = useRouter();
  const { refreshProfile, signOut } = useAuth();
  const [name, setName] = useState(displayName ?? "");
  const [saved, setSaved] = useState(displayName);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function saveName(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateDisplayNameAction(name);
      if (result.ok) {
        setSaved(result.displayName);
        setName(result.displayName);
        setMessage({ tone: "ok", text: "Saved." });
        await refreshProfile();
        if (welcome) {
          trackEvent("signup_complete"); // a new account has just finished setting up
          router.push("/");
        }
      } else {
        setMessage({ tone: "error", text: result.error });
      }
    });
  }

  function deleteAccount() {
    startTransition(async () => {
      await deleteAccountAction(); // redirects home when done
    });
  }

  return (
    <div className="mx-auto max-w-lesson space-y-5">
      <div className="flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-node border-2 border-accent-ink bg-accent-soft font-mono text-title font-semibold text-accent-ink">
          {initialOf(saved)}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-headline font-semibold">{saved ?? "Your account"}</h1>
          {email && <p className="truncate text-small text-ink-muted">{email}</p>}
        </div>
      </div>

      {welcome && !saved && (
        <p role="status" className="rounded-card border border-accent-ink bg-accent-soft p-4 text-small">
          You&apos;re in! Pick a display name. It&apos;s shown only to you, so a nickname is perfect.
        </p>
      )}

      <form onSubmit={saveName} className={panel}>
        <label htmlFor="display-name" className="text-small font-semibold">
          Display name
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="display-name"
            value={name}
            maxLength={40}
            autoComplete="nickname"
            onChange={(e) => {
              setName(e.target.value);
              setMessage(null);
            }}
            className="min-h-12 flex-1 rounded-control border border-line-strong bg-surface px-4 text-body text-ink outline-none focus-visible:border-accent-ink"
            placeholder="e.g. Sam"
          />
          <Button type="submit" disabled={pending || name.trim() === "" || name.trim() === saved}>
            Save
          </Button>
        </div>
        <p className="mt-2 text-caption text-ink-faint">Use a nickname rather than your full name.</p>
        {message && (
          <p role={message.tone === "error" ? "alert" : "status"} className={`mt-2 text-small ${message.tone === "error" ? "text-danger" : "text-success"}`}>
            {message.text}
          </p>
        )}
      </form>

      <div className={panel}>
        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={() =>
            startTransition(async () => {
              await signOut();
              router.push("/");
              router.refresh();
            })
          }
          disabled={pending}
        >
          <SignOutIcon className="size-5" /> Sign out
        </Button>
      </div>

      <div className={`${panel} border-danger`}>
        <h2 className="font-semibold">Delete account</h2>
        <p className="mt-1 text-small text-ink-muted">
          Deletes your account, your progress and your XP. This can&apos;t be undone.
        </p>
        {confirmDelete ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button variant="danger" onClick={deleteAccount} disabled={pending}>
              <DeleteIcon className="size-5" /> {pending ? "Deleting…" : "Yes, delete everything"}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={pending}>
              Keep my account
            </Button>
          </div>
        ) : (
          <Button variant="ghost" className="mt-3 text-danger" onClick={() => setConfirmDelete(true)}>
            <DeleteIcon className="size-5" /> Delete my account
          </Button>
        )}
      </div>
    </div>
  );
}
