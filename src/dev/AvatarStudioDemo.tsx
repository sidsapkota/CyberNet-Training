"use client";

import { useState } from "react";
import { AvatarStudio } from "@/components/rewards/AvatarStudio";
import { ownedItems, wearItem } from "@/lib/rewards/rules";

/**
 * /dev/avatar-page: the real avatar page with local data (nothing saved): a free learner on a
 * 7-day streak who has won the beanie, with one spin ready and two saved for new items.
 */
export function AvatarStudioDemo() {
  const [outfit, setOutfit] = useState<string[]>(["beanie", "glasses", "scarf"]);
  const [pop, setPop] = useState<string | null>(null);
  const [wave, setWave] = useState(0);
  return (
    <main className="mx-auto max-w-wide px-gutter py-3 sm:py-10">
      <AvatarStudio
        data={{ outfit, owned: ownedItems(["beanie"], false, { longestStreak: 9, finishedCourse: false }), waiting: 5, hasPro: false }}
        onWear={(id) => {
          const next = wearItem(outfit, id);
          setPop(next.includes(id) ? id : null);
          if (next.includes(id)) setWave((w) => w + 1);
          setOutfit(next);
        }}
        onSpin={() => {}}
        error={null}
        pop={pop}
        wave={wave}
      />
    </main>
  );
}
