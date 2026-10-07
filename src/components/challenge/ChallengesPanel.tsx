"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMyChallengesAction } from "@/app/actions/challenges";
import { DuelIcon } from "@/components/ui/icons";
import type { MyChallenge } from "@/lib/challenges/server";

/** "Challenges" on /account: the learner's latest challenges and how many friends played each. Hidden until they've made one. */
export function ChallengesPanel({ className }: { className: string }) {
  const [list, setList] = useState<MyChallenge[] | null>(null);
  useEffect(() => {
    getMyChallengesAction().then(setList, () => setList([]));
  }, []);
  if (!list?.length) return null;
  return (
    <section aria-labelledby="challenges-title" className={className}>
      <h2 id="challenges-title" className="flex items-center gap-2 font-semibold">
        <DuelIcon className="size-5 text-ink-muted" /> Challenges
      </h2>
      <ul className="mt-3 divide-y divide-line">
        {list.map((c) => (
          <li key={c.id}>
            <Link href={`/c/${c.id}`} className="flex min-h-11 items-center gap-3 py-2 text-small hover:text-accent-ink">
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{c.lessonTitle}</span>
              <span className="font-mono tabular-nums text-ink-muted">
                {c.score}/{c.total}
              </span>
              <span className="text-ink-muted">
                {c.players} {c.players === 1 ? "player" : "players"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
