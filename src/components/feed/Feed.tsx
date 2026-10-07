"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { InteractiveCard } from "@/cards/schema";
import { SignUpGate } from "@/components/account/SignUpGate";
import { Mascot } from "@/components/mascot/Mascot";
import { NetworkMark } from "@/components/network/NetworkMark";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ChevronDownIcon, XIcon, XpIcon } from "@/components/ui/icons";
import { trackEvent, trackWith } from "@/lib/analytics";
import { useAuth } from "@/lib/auth/AuthProvider";
import { BREAK_AFTER_MS, courseWeights, FEED_DAILY_CAP, FEED_LESSON_ID, feedOrder, feedXpOn, GUEST_BYTES, seedFrom, sessionBucket } from "@/lib/feed/rules";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { useDaily } from "@/lib/progress/useDaily";
import { ByteView } from "./ByteView";

export interface FeedByte {
  id: string;
  hook: string;
  rare: boolean;
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  card: InteractiveCard;
}

type Item = { kind: "byte"; byte: FeedByte } | { kind: "signup" } | { kind: "break" };

const DEEPER_KEY = "cybernet.feed.deeper";
function readDeeper(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(DEEPER_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

/**
 * The Feed: a vertical stream of bytes, one per screen (CSS scroll snap: swipe on a phone; arrow
 * keys, j/k or the buttons anywhere). Never moves on by itself. Order: a seeded shuffle per learner
 * per day, leaning toward courses they finish lessons in or tap "Go deeper" on, answered bytes last.
 * Guests play GUEST_BYTES, then the sign-up card. After 15 minutes, one friendly "take a break?".
 */
export function Feed({ bytes, start }: { bytes: FeedByte[]; start: string | null }) {
  const { snapshot } = useProgress();
  const { auth, available } = useAuth();
  const daily = useDaily();
  const scroller = useRef<HTMLDivElement>(null);
  const [breakDue, setBreakDue] = useState(false);
  const [breakDismissed, setBreakDismissed] = useState(false);
  const [current, setCurrent] = useState(0);
  const sessionStart = useRef(0);
  const viewed = useRef(new Set<string>());
  const guest = available && auth.status === "guest";
  const ready = snapshot !== null && auth.status !== "loading" && daily !== null;

  // The order is worked out once progress is known, then kept for the session (no reshuffling as
  // bytes are answered).
  const [order, setOrder] = useState<FeedByte[] | null>(null);
  useEffect(() => {
    if (!ready || order) return;
    const finished: Record<string, number> = {};
    const courseOf = new Map(bytes.map((b) => [b.lessonId, b.courseId]));
    for (const id of Object.keys(snapshot.lessons)) {
      const course = courseOf.get(id);
      if (course) finished[course] = (finished[course] ?? 0) + 1;
    }
    const done = new Set(Object.keys(snapshot.cards).filter((k) => k.startsWith(`${FEED_LESSON_ID}/`)).map((k) => k.slice(FEED_LESSON_ID.length + 1)));
    const who = auth.status === "signed-in" ? auth.userId : "guest";
    let ordered = feedOrder(bytes, seedFrom(`${who}|${daily.today.day}`), courseWeights(finished, readDeeper()), done);
    const first = start ? ordered.find((b) => b.id === start) : undefined;
    if (first) ordered = [first, ...ordered.filter((b) => b !== first)];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the order depends on progress, known only after mount
    setOrder(ordered);
  }, [ready, order, bytes, snapshot, auth, daily, start]);

  // The break card: due after 15 minutes in this session (once).
  useEffect(() => {
    sessionStart.current = Date.now();
    const timer = window.setTimeout(() => setBreakDue(true), BREAK_AFTER_MS);
    const send = () => trackWith("feed_session_length", { source: sessionBucket(Date.now() - sessionStart.current) });
    window.addEventListener("pagehide", send);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", send);
      send();
    };
  }, []);

  const items = useMemo<Item[]>(() => {
    if (!order) return [];
    const list: Item[] = (guest ? order.slice(0, GUEST_BYTES) : order).map((byte) => ({ kind: "byte", byte }));
    if (guest) list.push({ kind: "signup" });
    if (breakDue && !breakDismissed) list.splice(Math.min(current + 1, list.length), 0, { kind: "break" });
    return list;
    // `current` is read when the break first becomes due; it doesn't move the card afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, guest, breakDue, breakDismissed]);

  // Which screen is in view (for the buttons, byte_viewed and the break card's place).
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.index);
          setCurrent(index);
          const item = items[index];
          if (item?.kind === "byte" && !viewed.current.has(item.byte.id)) {
            viewed.current.add(item.byte.id);
            trackEvent("byte_viewed", item.byte.lessonId);
          }
        }
      },
      { root, threshold: 0.6 },
    );
    for (const el of root.querySelectorAll("[data-index]")) observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  function go(delta: number) {
    const root = scroller.current;
    const target = root?.querySelector<HTMLElement>(`[data-index="${current + delta}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, [role=slider]")) return;
      const delta = ["ArrowDown", "j", "PageDown"].includes(event.key) ? 1 : ["ArrowUp", "k", "PageUp"].includes(event.key) ? -1 : 0;
      if (delta === 0) return;
      event.preventDefault();
      go(delta);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function deeper(byte: FeedByte) {
    trackEvent("byte_go_deeper", byte.lessonId);
    try {
      const counts = readDeeper();
      counts[byte.courseId] = (counts[byte.courseId] ?? 0) + 1;
      localStorage.setItem(DEEPER_KEY, JSON.stringify(counts));
    } catch {
      // storage blocked: no personalisation, nothing else lost
    }
  }

  const xpToday = snapshot && daily ? feedXpOn(snapshot.xpEvents, daily.today.day) : 0;

  return (
    <main className="fixed inset-0 flex flex-col bg-canvas">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-gutter">
        <Link href="/" aria-label="Close the Feed" className="grid size-11 place-items-center rounded-control text-ink-muted hover:text-ink">
          <XIcon className="size-6" />
        </Link>
        <h1 className="flex-1 text-lead font-semibold">Feed</h1>
        <span className="inline-flex items-center gap-1 rounded-control border border-line px-2.5 py-1 font-mono text-small font-semibold text-accent-ink" aria-label={`${xpToday} of ${FEED_DAILY_CAP} Feed XP today`}>
          <XpIcon className="size-4" />
          {xpToday}/{FEED_DAILY_CAP}
        </span>
        {/* Swipe on a phone; these (and the arrow keys) move one byte, anywhere. */}
        <nav aria-label="Feed" className="flex">
          <button type="button" onClick={() => go(-1)} disabled={!order || current === 0} aria-label="Previous byte" className="grid size-11 place-items-center rounded-control text-ink-muted hover:text-ink disabled:opacity-40">
            <ChevronDownIcon className="size-5 rotate-180" />
          </button>
          <button type="button" onClick={() => go(1)} disabled={!order || current >= items.length - 1} aria-label="Next byte" className="grid size-11 place-items-center rounded-control text-ink-muted hover:text-ink disabled:opacity-40">
            <ChevronDownIcon className="size-5" />
          </button>
        </nav>
      </header>

      {!order ? (
        <div className="grid flex-1 place-items-center">
          <NetworkMark mode="loading" className="size-16" label="Loading the Feed" />
        </div>
      ) : (
        <div ref={scroller} className="flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain" data-feed>
          {items.map((item, index) => (
            <section
              key={item.kind === "byte" ? item.byte.id : item.kind}
              data-index={index}
              aria-label={item.kind === "byte" ? `Byte ${index + 1}` : item.kind === "signup" ? "Sign up" : "Take a break"}
              className="flex min-h-full snap-start flex-col px-gutter pt-3"
            >
              {item.kind === "byte" && <ByteView byte={item.byte} onDeeper={() => deeper(item.byte)} />}
              {item.kind === "signup" && (
                <div
                  className="mx-auto w-full max-w-lesson"
                  onClickCapture={(event) => {
                    const button = (event.target as HTMLElement).closest("button, a");
                    if (button && !/not now/i.test(button.textContent ?? "")) trackEvent("feed_signup");
                  }}
                >
                  <SignUpGate lessonId={order[0]?.lessonId ?? "feed"} next="/feed" variant="inline" notNowHref="/courses" />
                </div>
              )}
              {item.kind === "break" && (
                <div className="mx-auto flex w-full max-w-lesson flex-1 flex-col items-center justify-center text-center">
                  <Mascot expression="happy" size={120} idle />
                  <h2 className="mt-6 text-title font-semibold">Nice work. Take a break?</h2>
                  <p className="mt-2 text-ink-muted">You&apos;ve been learning for 15 minutes. Your progress is saved.</p>
                  <div className="mt-8 flex w-full max-w-sm flex-col gap-2">
                    <ButtonLink href="/">Done for now</ButtonLink>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setBreakDismissed(true);
                        window.requestAnimationFrame(() => go(0));
                      }}
                    >
                      Keep going
                    </Button>
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

    </main>
  );
}
