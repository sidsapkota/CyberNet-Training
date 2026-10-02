"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { NetworkMark } from "@/components/network/NetworkMark";

const Loading = () => (
  <div className="grid h-[340px] place-items-center rounded-card bg-screen">
    <NetworkMark mode="loading" className="size-14" />
  </div>
);
// Each hero is its own chunk, loaded only when chosen (nothing on other pages).
const HEROES = {
  phone: { title: "3D phone", Component: dynamic(() => import("@/components/hero/Phone3D"), { ssr: false, loading: Loading }) },
  race: { title: "Packet race", Component: dynamic(() => import("@/components/hero/PacketRace"), { ssr: false, loading: Loading }) },
  fruit: { title: "Train the model", Component: dynamic(() => import("@/components/hero/FruitTrainer"), { ssr: false, loading: Loading }) },
} as const;
type HeroId = keyof typeof HEROES;

function Playground() {
  const params = useSearchParams();
  const raw = params.get("hero");
  const id: HeroId | null = raw && raw in HEROES ? (raw as HeroId) : raw === "none" ? null : "phone";
  const Hero = id ? HEROES[id].Component : null;
  return (
    <main className="mx-auto max-w-lesson px-gutter py-6">
      <h1 className="text-title font-semibold">Hero interactions</h1>
      <nav className="mt-3 flex gap-2" aria-label="Prototypes">
        {(Object.keys(HEROES) as HeroId[]).map((h) => (
          <Link
            key={h}
            href={`/dev/hero?hero=${h}`}
            aria-current={h === id ? "page" : undefined}
            className={`min-h-11 rounded-control border-2 px-3 py-2 text-small font-semibold ${h === id ? "border-accent-ink bg-accent-soft" : "border-line"}`}
          >
            {HEROES[h].title}
          </Link>
        ))}
      </nav>
      <div className="mt-5">{Hero && <Hero key={id} />}</div>
    </main>
  );
}

export function HeroPlayground() {
  return (
    <Suspense>
      <Playground />
    </Suspense>
  );
}
