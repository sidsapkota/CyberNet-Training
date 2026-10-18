"use client";

import Link from "next/link";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { trackEvent } from "@/lib/analytics";
import { ByteView, type ByteForView } from "./ByteView";

/**
 * The landing page's first screen when the Feed is on: one live byte from the "Start here" lesson to
 * play straight away (no account), then one button into that full lesson (still no account). The
 * Feed is a quiet link; the landing page's other sections stay below.
 */
export function HeroByte({ byte, lessonMinutes }: { byte: ByteForView; lessonMinutes: number }) {
  const [answered, setAnswered] = useState(false);
  return (
    <div className="w-full max-w-lesson text-left">
      <ByteView byte={byte} compact onAnswered={() => setAnswered(true)} onDeeper={() => trackEvent("byte_go_deeper", byte.lessonId)} />
      <ButtonLink
        href={`/lesson/${byte.lessonId}`}
        variant={answered ? "primary" : "secondary"}
        className="mt-4 w-full"
        onClick={() => trackEvent("landing_cta", byte.lessonId)}
      >
        {answered ? "Play the whole lesson" : `Start a ${lessonMinutes}-minute lesson`} <ArrowRightIcon className="size-5" />
      </ButtonLink>
      <p className="mt-1 text-center">
        <Link href="/feed" className="inline-flex min-h-11 items-center text-small font-semibold text-accent-ink underline-offset-2 hover:underline">
          Or try more quick questions
        </Link>
      </p>
    </div>
  );
}
