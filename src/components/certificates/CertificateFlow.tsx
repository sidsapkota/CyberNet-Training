"use client";

import { useCallback, useEffect, useId, useState, useTransition } from "react";
import { type CertificateStatus, getCertificateStatusAction, issueCertificateAction, revokeCertificateAction } from "@/app/actions/certificates";
import { NetworkMark } from "@/components/network/NetworkMark";
import { ProBadge } from "@/components/pro/ProBadge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import { trackEvent } from "@/lib/analytics";
import { LINKEDIN_ADD_CERTIFICATION, linkedInFields, NAME_MAX, verificationUrl } from "@/lib/certificates/certificates";
import { usePro } from "@/lib/pro/ProProvider";
import { CertificateView } from "./CertificateView";

const panel = "rounded-card border border-line bg-surface p-5 shadow-card";

/** The certificate step after a course final: issue it (Pro), or preview it (free). */
export function CertificateFlow({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const [status, setStatus] = useState<CertificateStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    getCertificateStatusAction(courseId).then(setStatus, (e: unknown) => {
      console.error(e);
      setFailed(true);
    });
  }, [courseId]);
  useEffect(load, [load]);

  if (failed) return <p className="text-ink-muted">Couldn&apos;t load your certificate. Please try again.</p>;
  if (!status) return <NetworkMark mode="loading" className="mx-auto size-16" label="Loading your certificate" />;

  if (!status.passedFinal) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <NetworkMark mode="dim" className="size-16" />
        <h1 className="mt-4 text-title font-semibold">Pass the course final first</h1>
        <p className="mt-2 text-ink-muted">Your certificate for {courseTitle} is waiting at the end of the course.</p>
        <ButtonLink href={`/course/${courseId}`} className="mt-6">
          Back to the course
        </ButtonLink>
      </div>
    );
  }
  if (!status.hasPro) return <FreePreview status={status} courseTitle={courseTitle} />;
  if (status.certificate) return <Issued status={status} courseId={courseId} courseTitle={courseTitle} onChange={load} />;
  return <IssueForm courseId={courseId} courseTitle={courseTitle} initialName={status.suggestedName} onIssued={load} />;
}

function FreePreview({ status, courseTitle }: { status: CertificateStatus; courseTitle: string }) {
  const { pro } = usePro();
  const trial = pro.loading || pro.trialEligible;
  return (
    <div>
      <h1 className="text-title font-semibold">You finished {courseTitle}!</h1>
      <p className="mt-2 text-ink-muted">Here&apos;s a preview of your certificate. With Pro, you can download it as a PDF and share a link that anyone can check.</p>
      <div className="mt-6">
        <CertificateView name={status.suggestedName || "Your name"} courseTitle={courseTitle} completedOn={new Date().toISOString().slice(0, 10)} preview />
      </div>
      <div className={`${panel} mt-6`}>
        <div className="flex items-center gap-2">
          <ProBadge />
          <p className="font-semibold">Certificates are part of Pro</p>
        </div>
        <ButtonLink href="/pro" className="mt-4 w-full">
          {trial ? "Start your 7-day free trial" : "Upgrade to Pro"}
        </ButtonLink>
        <p className="mt-3 text-center text-small text-ink-muted">Ask a parent or guardian before subscribing.</p>
      </div>
    </div>
  );
}

function IssueForm({
  courseId,
  courseTitle,
  initialName,
  onIssued,
  replacing = false,
  onCancel,
}: {
  courseId: string;
  courseTitle: string;
  initialName: string;
  onIssued: () => void;
  replacing?: boolean;
  onCancel?: () => void;
}) {
  const id = useId();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div>
      <h1 className="text-title font-semibold">{replacing ? "Change the name" : "Your certificate"}</h1>
      <form
        className={`${panel} mt-4`}
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const result = await issueCertificateAction(courseId, name).catch(() => ({ ok: false as const, error: "Something went wrong. Please try again." }));
            if (result.ok) {
              trackEvent("certificate_issued", { course: courseId });
              onIssued();
            } else setError(result.error);
          });
        }}
      >
        <label htmlFor={`${id}-name`} className="text-small font-semibold">
          Name on the certificate
        </label>
        <input
          id={`${id}-name`}
          value={name}
          maxLength={NAME_MAX}
          autoComplete="off"
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          aria-describedby={`${id}-help`}
          className="mt-2 min-h-12 w-full rounded-control border border-line-strong bg-surface px-4 text-ink outline-none focus-visible:border-accent-ink"
        />
        <p id={`${id}-help`} className="mt-2 text-caption text-ink-faint">
          A first name or nickname is fine. This name appears on your certificate and on its public check page, which anyone with the link can see.
          {replacing && " Your old certificate link will stop working."}
        </p>
        {error && (
          <p role="alert" className="mt-2 text-small text-danger">
            {error}
          </p>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button type="submit" disabled={pending || name.trim() === ""}>
            {pending ? "Creating…" : replacing ? "Create the new certificate" : "Create my certificate"}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
      <div className="mt-6">
        <CertificateView name={name.trim() || "Your name"} courseTitle={courseTitle} completedOn={new Date().toISOString().slice(0, 10)} preview />
      </div>
    </div>
  );
}

function Issued({ status, courseId, courseTitle, onChange }: { status: CertificateStatus; courseId: string; courseTitle: string; onChange: () => void }) {
  const cert = status.certificate!;
  const [editing, setEditing] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const copy = (label: string, value: string) => {
    void navigator.clipboard?.writeText(value).then(() => setCopied(label), () => setCopied(null));
  };

  if (editing) {
    return <IssueForm courseId={courseId} courseTitle={courseTitle} initialName={cert.name} onIssued={() => { setEditing(false); onChange(); }} replacing onCancel={() => setEditing(false)} />;
  }
  return (
    <div>
      <p className="font-mono text-caption tracking-widest text-success uppercase">Certificate ready</p>
      <h1 className="mt-1 text-title font-semibold">Well done!</h1>
      <div className="mt-5">
        <CertificateView name={cert.name} courseTitle={courseTitle} completedOn={cert.completedOn} id={cert.id} />
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <ButtonLink href={`/api/certificates/${cert.id}/pdf`} download>
          Download PDF
        </ButtonLink>
        <Button variant="secondary" onClick={() => copy("link", verificationUrl(cert.id))}>
          {copied === "link" ? (
            <>
              <CheckIcon className="size-5" /> Link copied
            </>
          ) : (
            "Copy the check link"
          )}
        </Button>
      </div>

      <section aria-labelledby="linkedin-title" className={`${panel} mt-6`}>
        <h2 id="linkedin-title" className="font-semibold">
          Add it to LinkedIn
        </h2>
        <p className="mt-1 text-small text-ink-muted">LinkedIn&apos;s form opens in a new tab. Copy each of these into it.</p>
        <dl className="mt-3 space-y-2">
          {linkedInFields(cert, courseTitle).map((f) => (
            <div key={f.label} className="flex items-center gap-3 rounded-control bg-surface-raised px-3 py-2">
              <div className="min-w-0 flex-1">
                <dt className="text-caption text-ink-faint">{f.label}</dt>
                <dd className="truncate text-small font-semibold">{f.value}</dd>
              </div>
              <Button variant="ghost" className="min-h-11 shrink-0 px-3 text-small" onClick={() => copy(f.label, f.value)} aria-label={`Copy ${f.label}`}>
                {copied === f.label ? <CheckIcon className="size-4" /> : "Copy"}
              </Button>
            </div>
          ))}
        </dl>
        <a
          href={LINKEDIN_ADD_CERTIFICATION}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-11 items-center font-semibold text-accent-ink underline underline-offset-2"
        >
          Open LinkedIn&apos;s form
        </a>
      </section>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button variant="ghost" onClick={() => setEditing(true)}>
          Change the name
        </Button>
        {confirmRevoke ? (
          <>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => startTransition(async () => {
                await revokeCertificateAction(cert.id);
                onChange();
              })}
            >
              Yes, withdraw it
            </Button>
            <Button variant="ghost" onClick={() => setConfirmRevoke(false)}>
              Keep it
            </Button>
          </>
        ) : (
          <Button variant="ghost" className="text-danger" onClick={() => setConfirmRevoke(true)}>
            Withdraw this certificate
          </Button>
        )}
      </div>
      {confirmRevoke && <p className="mt-2 text-small text-ink-muted">Its check page will say it isn&apos;t valid. You can create a new one any time.</p>}
    </div>
  );
}
