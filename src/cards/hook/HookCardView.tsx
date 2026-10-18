import Image from "next/image";
import { Markdown } from "@/components/ui/Markdown";
import type { HookCard } from "./schema";

/** The Hook: one full-width picture and one line. The footer's Start moves on. */
export function HookCardView({ card }: { card: HookCard }) {
  return (
    <article>
      <figure className="overflow-hidden rounded-card border border-line bg-screen p-2 sm:p-3">
        <Image
          src={card.image.src}
          alt={card.image.alt}
          width={card.image.width}
          height={card.image.height}
          className="mx-auto h-auto w-full object-contain sm:max-w-[30rem]"
          priority
          unoptimized={card.image.src.endsWith(".svg")}
        />
      </figure>
      <Markdown className="mt-4 text-lead font-semibold text-balance text-ink sm:text-title">{card.situation}</Markdown>
    </article>
  );
}
