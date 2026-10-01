"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listMyCertificatesAction } from "@/app/actions/certificates";
import { type Certificate, formatCertificateDate } from "@/lib/certificates/certificates";

/** Certificates on /account: each one's course, date and ID, with its page (download, share, withdraw). */
export function CertificatesPanel({ className, courseTitles }: { className: string; courseTitles: Record<string, string> }) {
  const [certs, setCerts] = useState<Certificate[] | null>(null);
  useEffect(() => {
    listMyCertificatesAction().then(setCerts, () => setCerts([]));
  }, []);
  if (!certs || certs.length === 0) return null;
  return (
    <section aria-labelledby="certificates-title" className={className}>
      <h2 id="certificates-title" className="font-semibold">
        Certificates
      </h2>
      <ul className="mt-3 space-y-2">
        {certs.map((c) => (
          <li key={c.id} className="rounded-control bg-surface-raised px-3 py-2.5">
            <p className="font-semibold">{courseTitles[c.courseId] ?? c.courseId}</p>
            <p className="text-small text-ink-muted">
              {formatCertificateDate(c.completedOn)} · <span className="font-mono">{c.id}</span>
            </p>
            <div className="mt-1 flex flex-wrap gap-x-4 text-small">
              <Link href={`/course/${c.courseId}/certificate`} className="inline-flex min-h-11 items-center font-semibold text-accent-ink underline underline-offset-2">
                Manage
              </Link>
              <a href={`/api/certificates/${c.id}/pdf`} download className="inline-flex min-h-11 items-center font-semibold text-accent-ink underline underline-offset-2">
                Download PDF
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
