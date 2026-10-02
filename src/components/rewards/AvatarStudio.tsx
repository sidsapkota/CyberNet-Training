"use client";

import { useState } from "react";
import { MascotAvatar } from "@/components/mascot/outfit/MascotAvatar";
import { Button } from "@/components/ui/Button";
import { ProIcon } from "@/components/ui/icons";
import { AVATAR_ITEMS, type AvatarItem, SLOT_LABEL, SLOTS, type Slot, unlockLabel } from "@/lib/rewards/items";
import { effectiveOutfit, spinCounts } from "@/lib/rewards/rules";

export interface StudioData {
  outfit: string[];
  owned: ReadonlySet<string>;
  waiting: number;
  hasPro: boolean;
}

/**
 * The avatar page (avatars v2): a big preview of the mascot in your outfit, then a tab per slot
 * (Head, Face, Neck, Body, Back). Tap an item to wear it (it replaces what's in that slot) or tap
 * it again to take it off; it pops on and the mascot waves (nothing moves under reduced motion).
 * Locked items are dim silhouettes with how to get them. Every item is always listed.
 * Presentational: the caller saves (`onChange`) and reverts on failure.
 */
export function AvatarStudio({
  data,
  onWear,
  onSpin,
  error,
  pop,
  wave,
}: {
  data: StudioData;
  onWear: (itemId: string) => void;
  onSpin: () => void;
  error: string | null;
  pop: string | null;
  wave: number;
}) {
  const [slot, setSlot] = useState<Slot>("head");
  const outfit = effectiveOutfit(data.outfit, data.hasPro);
  const { ready, saved } = spinCounts(data.waiting, data.owned);
  const items = AVATAR_ITEMS.filter((i) => i.slot === slot);
  const wearing = outfit.map((id) => AVATAR_ITEMS.find((i) => i.id === id)!.name);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start lg:gap-8">
      <section aria-labelledby="avatar-title" className="lg:sticky lg:top-24">
        <h1 id="avatar-title" className="sr-only text-headline font-semibold lg:not-sr-only lg:mb-4">
          Avatar
        </h1>
        <div className="relative grid place-items-center rounded-card border border-line bg-screen pt-1.5 pb-6 lg:pt-8 lg:pb-12">
          <MascotAvatar
            outfit={outfit}
            size={300}
            pop={pop}
            wave={wave}
            label={wearing.length ? `Your avatar, wearing: ${wearing.join(", ")}` : "Your avatar"}
            className="h-[100px] w-auto lg:h-[300px]"
          />
          {ready > 0 && (
            <Button onClick={onSpin} className="absolute top-2 right-2 min-h-11 px-4 lg:top-3 lg:right-3">
              {ready === 1 ? "Spin" : `Spin (${ready})`}
            </Button>
          )}
          {saved > 0 && (
            <p className="absolute bottom-1.5 left-3 text-caption text-on-screen-muted lg:bottom-3 lg:left-4 lg:text-small">
              <span className="font-mono font-semibold text-on-screen">{saved}</span> {saved === 1 ? "spin" : "spins"} saved for new items
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-2 text-small text-danger">
            {error}
          </p>
        )}
      </section>

      <section className="mt-2 lg:mt-12" aria-label="Avatar items">
        <div role="tablist" aria-label="Slots" className="grid grid-cols-5 gap-1 rounded-control bg-surface-raised p-1">
          {SLOTS.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              id={`slot-${s}`}
              aria-selected={slot === s}
              aria-controls="slot-panel"
              onClick={() => setSlot(s)}
              className={`min-h-11 rounded-sm text-small font-semibold transition-colors ${slot === s ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink"}`}
            >
              {SLOT_LABEL[s]}
            </button>
          ))}
        </div>
        <ul id="slot-panel" role="tabpanel" aria-labelledby={`slot-${slot}`} className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:mt-3 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
              <ItemTile item={item} owned={data.owned.has(item.id)} worn={outfit.includes(item.id)} onWear={() => onWear(item.id)} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ItemTile({ item, owned, worn, onWear }: { item: AvatarItem; owned: boolean; worn: boolean; onWear: () => void }) {
  const how = unlockLabel(item);
  return (
    <button
      type="button"
      disabled={!owned}
      aria-pressed={owned ? worn : undefined}
      aria-label={owned ? `${item.name}${worn ? ", wearing. Tap to take off" : ", tap to wear"}` : `${item.name}, locked: ${how}`}
      onClick={onWear}
      className={`flex w-full flex-col items-center rounded-card border-2 bg-surface px-1 pt-1.5 pb-1 text-center lg:pt-3 lg:pb-2 transition-colors disabled:cursor-default ${
        worn ? "border-accent-ink bg-accent-soft" : "border-line enabled:hover:border-accent-ink"
      }`}
    >
      <span className="grid size-10 place-items-center overflow-hidden rounded-node bg-screen lg:size-16">
        <MascotAvatar outfit={[item.id]} framing="bust" size={64} silhouette={!owned} className="h-10 w-auto lg:h-16" />
      </span>
      <span className={`mt-1 w-full truncate text-caption font-semibold ${owned ? "text-ink" : "text-ink-muted"}`}>{item.name}</span>
      <span className="flex min-h-4 w-full leading-tight items-center justify-center gap-1 truncate text-caption text-ink-faint">
        {!owned && item.source === "pro" && <ProIcon className="size-3.5 shrink-0" />}
        {owned ? (worn ? "Wearing" : "") : how}
      </span>
    </button>
  );
}
