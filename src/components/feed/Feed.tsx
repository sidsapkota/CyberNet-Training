"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { InteractiveCard } from "@/cards/schema";
import { Mascot } from "@/components/mascot/Mascot";
import { NetworkMark } from "@/components/network/NetworkMark";
import { ButtonLink } from "@/components/ui/Button";
import { ChevronDownIcon, PlayIcon, XIcon } from "@/components/ui/icons";
import type { CourseOutline } from "@/lib/content/schema";
import { trackEvent, trackWith } from "@/lib/analytics";
import { useAuth } from "@/lib/auth/AuthProvider";
import { courseWeights, DAILY_BYTES, FEED_LESSON_ID, feedOrder, seedFrom, sessionBucket } from "@/lib/feed/rules";
import { bytesLeft, type FeedDay, feedBytesOn, pickToday, readFeedDay, writeFeedDay } from "@/lib/feed/today";
import { usePro } from "@/lib/pro/ProProvider";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { computeCourseState, focusCourse, getCurrentLesson } from "@/lib/progress/state";
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

type Item = { kind: "byte"; byte: FeedByte } | { kind: "done" };

const DEEPER_KEY = "cybernet.feed.deeper";
function readDeeper(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(DEEPER_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

/**
 * The Feed: today's 3 bytes, one per screen (CSS scroll snap: swipe on a phone; arrow keys, j/k or
 * the buttons anywhere), then "That's today's bytes" with a button to the next lesson. Never moves
 * on by itself, and it's finite: the same three all day, new ones tomorrow. Which three: a seeded
 * shuffle per learner per day, leaning toward courses they finish lessons in or tap "Go deeper" on,
 * bytes finished on earlier days last.
 */
export function Feed({ bytes, courses, start }: { bytes: FeedByte[]; courses: CourseOutline[]; start: string | null }) {
  const { snapshot } = useProgress();
  const { auth, available } = useAuth();
  const { pro, hasPro } = usePro();
  const daily = useDaily();
  const scroller = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const sessionStart = useRef(0);
  const viewed = useRef(new Set<string>());
  const guest = available && auth.status === "guest";
  const who = auth.status === "signed-in" ? auth.userId : "guest";
  const ready = snapshot !== null && auth.status !== "loading" && daily !== null;

  // Today's three are worked out once progress is known, then kept (on this device) for the day.
  const [today, setToday] = useState<FeedDay | null>(null);
  const [todays, setTodays] = useState<FeedByte[] | null>(null);
  useEffect(() => {
    if (!ready || todays) return;
    const finished: Record<string, number> = {};
    const courseOf = new Map(bytes.map((b) => [b.lessonId, b.courseId]));
    for (const id of Object.keys(snapshot.lessons)) {
      const course = courseOf.get(id);
      if (course) finished[course] = (finished[course] ?? 0) + 1;
    }
    const doneToday = feedBytesOn(snapshot.xpEvents, daily.today.day);
    const doneEarlier = new Set(
      Object.keys(snapshot.cards)
        .filter((k) => k.startsWith(`${FEED_LESSON_ID}/`))
        .map((k) => k.slice(FEED_LESSON_ID.length + 1))
        .filter((id) => !doneToday.includes(id)),
    );
    let ordered = feedOrder(bytes, seedFrom(`${who}|${daily.today.day}`), courseWeights(finished, readDeeper()), doneEarlier);
    const first = start ? ordered.find((b) => b.id === start) : undefined;
    if (first) ordered = [first, ...ordered.filter((b) => b !== first)];
    const picked = pickToday(ordered, readFeedDay(), daily.today.day, who, doneToday);
    writeFeedDay(picked.record);
    /* eslint-disable react-hooks/set-state-in-effect -- today's bytes depend on progress, known only after mount */
    setToday(picked.record);
    setTodays(picked.bytes);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [ready, todays, bytes, snapshot, who, daily, start]);

  function answered(byte: FeedByte) {
    setToday((value) => {
      if (!value || value.answered.includes(byte.id)) return value;
      const next = { ...value, answered: [...value.answered, byte.id] };
      writeFeedDay(next);
      return next;
    });
  }

  useEffect(() => {
    sessionStart.current = Date.now();
    const send = () => trackWith("feed_session_length", { source: sessionBucket(Date.now() - sessionStart.current) });
    window.addEventListener("pagehide", send);
    return () => {
      window.removeEventListener("pagehide", send);
      send();
    };
  }, []);

  const items = useMemo<Item[]>(() => (todays ? [...todays.map((byte) => ({ kind: "byte" as const, byte })), { kind: "done" as const }] : []), [todays]);

  // Which screen is in view (for the buttons and byte_viewed).
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

  const left = snapshot && daily ? bytesLeft(today, feedBytesOn(snapshot.xpEvents, daily.today.day), daily.today.day, who) : DAILY_BYTES;
  // The next lesson, as on the dashboard's Continue (null once everything they can open is done).
  const next = snapshot && !pro.loading ? nextLesson(courses, snapshot, hasPro || available) : null;

  return (
    <main className="fixed inset-0 flex flex-col bg-canvas">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-gutter">
        <Link href="/" aria-label="Close the Feed" className="grid size-11 place-items-center rounded-control text-ink-muted hover:text-ink">
          <XIcon className="size-6" />
        </Link>
        <h1 className="flex-1 text-lead font-semibold">Feed</h1>
        <span
          className="rounded-control border border-line px-2.5 py-1 font-mono text-small font-semibold text-accent-ink"
          aria-label={`${DAILY_BYTES - left} of today's ${DAILY_BYTES} bytes played`}
        >
          {DAILY_BYTES - left}/{DAILY_BYTES} today
        </span>
        {/* Swipe on a phone; these (and the arrow keys) move one byte, anywhere. */}
        <nav aria-label="Feed" className="flex">
          <button type="button" onClick={() => go(-1)} disabled={!todays || current === 0} aria-label="Previous byte" className="grid size-11 place-items-center rounded-control text-ink-muted hover:text-ink disabled:opacity-40">
            <ChevronDownIcon className="size-5 rotate-180" />
          </button>
          <button type="button" onClick={() => go(1)} disabled={!todays || current >= items.length - 1} aria-label="Next byte" className="grid size-11 place-items-center rounded-control text-ink-muted hover:text-ink disabled:opacity-40">
            <ChevronDownIcon className="size-5" />
          </button>
        </nav>
      </header>

      {!todays ? (
        <div className="grid flex-1 place-items-center">
          <NetworkMark mode="loading" className="size-16" label="Loading the Feed" />
        </div>
      ) : (
        <div ref={scroller} className="flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain" data-feed>
          {items.map((item, index) => (
            <section
              key={item.kind === "byte" ? item.byte.id : item.kind}
              data-index={index}
              aria-label={item.kind === "byte" ? `Byte ${index + 1} of ${DAILY_BYTES}` : "That's today's bytes"}
              className="flex min-h-full snap-start flex-col px-gutter pt-3"
            >
              {item.kind === "byte" && <ByteView byte={item.byte} onAnswered={() => answered(item.byte)} onDeeper={() => deeper(item.byte)} />}
              {item.kind === "done" && (
                <div className="mx-auto flex w-full max-w-lesson flex-1 flex-col items-center justify-center pb-6 text-center">
                  <Mascot expression="happy" size={112} idle />
                  <h2 className="mt-5 text-title font-semibold">That&apos;s today&apos;s bytes</h2>
                  <p className="mt-2 text-ink-muted">Back tomorrow for {DAILY_BYTES} more.</p>
                  <div className="mt-7 flex w-full max-w-sm flex-col items-center gap-2">
                    {next ? (
                      <ButtonLink href={`/lesson/${next.id}`} className="w-full" onClick={() => trackEvent("byte_next_lesson", next.id)}>
                        <PlayIcon className="size-5" /> Next lesson: {next.title}
                      </ButtonLink>
                    ) : (
                      <ButtonLink href="/courses" className="w-full">
                        See the courses
                      </ButtonLink>
                    )}
                    {guest && (
                      <Link
                        href="/login?next=/feed"
                        onClick={() => trackEvent("feed_signup")}
                        className="inline-flex min-h-11 items-center text-small font-semibold text-accent-ink underline-offset-2 hover:underline"
                      >
                        Create a free account to keep your XP
                      </Link>
                    )}
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

function nextLesson(courses: CourseOutline[], snapshot: NonNullable<ReturnType<typeof useProgress>["snapshot"]>, access: boolean) {
  const focus = focusCourse(courses.map((course) => computeCourseState(snapshot, course, undefined, access)));
  return focus ? (getCurrentLesson(focus)?.lesson ?? null) : null;
}
