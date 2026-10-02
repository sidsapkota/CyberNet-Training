"use client";

import { MascotAvatar } from "@/components/mascot/outfit/MascotAvatar";
import { Avatar } from "@/components/rewards/Avatar";
import { AVATAR_ITEMS } from "@/lib/rewards/items";

/**
 * /dev/avatars: every avatar item worn on its own (full body), the size strip (24, 32 and 48px in
 * the round node, as in the header and leaderboards) and a few stacked outfits.
 */
export function AvatarPlayground() {
  return (
    <main className="mx-auto max-w-wide space-y-10 px-gutter py-8">
      <section data-shot="grid">
        <h1 className="text-headline font-semibold">All 12 items</h1>
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {AVATAR_ITEMS.map((item) => (
            <li key={item.id} className="flex flex-col items-center rounded-card bg-screen p-3">
              <MascotAvatar outfit={[item.id]} size={150} />
              <span className="mt-2 text-small text-on-screen">{item.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section data-shot="strip">
        <h2 className="text-title font-semibold">Sizes: 24, 32, 48px</h2>
        <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          {[{ id: "none", name: "No items" }, ...AVATAR_ITEMS].map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              {[24, 32, 48].map((s) => (
                <Avatar key={s} outfit={item.id === "none" ? [] : [item.id]} pro size={s} frame={false} />
              ))}
              <span className="text-small text-ink-muted">{item.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section data-shot="stacked">
        <h2 className="text-title font-semibold">Stacked</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {[
            ["beanie", "glasses", "scarf", "cape"],
            ["cap", "visor", "hoodie", "jetpack"],
            ["crown", "glasses", "scarf", "hoodie", "cape"],
            ["headset", "hoodie"],
            ["grad-cap", "glasses", "scarf"],
          ].map((outfit) => (
            <div key={outfit.join()} className="rounded-card bg-screen p-3">
              <MascotAvatar outfit={outfit} size={180} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
