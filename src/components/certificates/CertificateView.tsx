import { LogoMark } from "@/components/brand/Logo";
import { formatCertificateDate } from "@/lib/certificates/certificates";
import { SITE_NAME } from "@/lib/site";

/**
 * A certificate on screen: the same design as the PDF (navy, cyan frame, the logo, the name, the
 * course and the date). Real text, so screen readers get all of it. `preview` adds a "Preview"
 * watermark (free learners who finished a course).
 */
export function CertificateView({
  name,
  courseTitle,
  completedOn,
  id,
  preview = false,
}: {
  name: string;
  courseTitle: string;
  completedOn: string;
  id?: string;
  preview?: boolean;
}) {
  return (
    <figure
      aria-label={`${preview ? "Preview of a certificate" : "Certificate"}: ${name} completed ${courseTitle}`}
      className="relative overflow-hidden rounded-card bg-screen p-3 sm:p-5"
    >
      <div className="rounded-card border-2 border-screen-accent p-5 text-on-screen sm:p-8">
        <div className="flex items-center gap-3">
          <LogoMark variant="color" className="size-9 sm:size-11" />
          <span className="text-lead font-semibold">{SITE_NAME}</span>
        </div>
        <p className="mt-8 font-mono text-caption tracking-widest text-on-screen-muted uppercase sm:mt-12">Certificate of completion</p>
        <p className="mt-2 text-headline font-semibold break-words sm:text-display">{name}</p>
        <p className="mt-3 text-on-screen-muted">has completed the course</p>
        <p className="mt-1 text-title font-semibold text-screen-accent">{courseTitle}</p>
        <dl className="mt-8 grid gap-4 border-t border-screen-line pt-4 text-small sm:mt-12 sm:grid-cols-2">
          <div>
            <dt className="font-mono text-caption tracking-widest text-on-screen-muted uppercase">Completed</dt>
            <dd className="mt-0.5">{formatCertificateDate(completedOn)}</dd>
          </div>
          {id && (
            <div>
              <dt className="font-mono text-caption tracking-widest text-on-screen-muted uppercase">Certificate ID</dt>
              <dd className="mt-0.5 font-mono">{id}</dd>
            </div>
          )}
        </dl>
      </div>
      {preview && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid place-items-center font-mono text-[4.5rem] font-semibold tracking-widest text-on-screen/15 uppercase select-none sm:text-[7rem]"
          style={{ transform: "rotate(-18deg)" }}
        >
          Preview
        </span>
      )}
    </figure>
  );
}
