"use client";

import { useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { trackEvent } from "@/lib/analytics";
import { ByteView, type ByteForView } from "./ByteView";

/**
 * The landing page's first screen when the Feed is on: one live byte to play straight away (no
 * account), then "Keep going" into the Feed. The landing page's other sections stay below it.
 */
export function HeroByte({ byte }: { byte: ByteForView }) {
  const [answered, setAnswered] = useState(false);
  return (
    <div className="w-full max-w-lesson text-left">
      <ByteView byte={byte} compact onAnswered={() => setAnswered(true)} onDeeper={() => trackEvent("byte_go_deeper", byte.lessonId)} />
      <ButtonLink href="/feed" variant={answered ? "primary" : "secondary"} className="mt-4 w-full" onClick={() => trackEvent("landing_cta")}>
        {answered ? "Keep going" : "More like this"} <ArrowRightIcon className="size-5" />
      </ButtonLink>
    </div>
  );
}
