import Link from "next/link";
import { CourseCard } from "@/components/course/CourseCard";
import { Mascot } from "@/components/mascot/Mascot";
import { ChevronDownIcon, HandsOnIcon, HintIcon, LessonTimeIcon, SafeIcon } from "@/components/ui/icons";
import type { CourseOutline } from "@/lib/content/schema";
import { AUDIENCE } from "@/lib/site";
import { LandingCta } from "./LandingCta";

const COUNT_WORDS: Record<number, string> = { 2: "Two", 3: "Three", 4: "Four", 5: "Five" };

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is it free?",
    a: "Yes. Play the first lesson of any course straight away. A free account opens every lesson in every course, up to 3 new lessons a day. CyberNet Pro makes it unlimited and starts with a 7-day free trial. Help after something goes wrong online is always free, with no account needed.",
  },
  {
    q: "Do I need an account?",
    a: "Not to start. The first lesson of every course, and help after something goes wrong online, work without one. A free account (age 13 or older) opens every other lesson, up to 3 new ones a day, and keeps your progress on every device.",
  },
  {
    q: "Is it safe for kids?",
    a: "Yes. There are no ads, no chat and no public profiles, and everything you take apart is a simulation.",
  },
  {
    q: "Who is it for?",
    a: `${AUDIENCE} Every course starts from zero and teaches each idea before it asks about it. Each course shows its level (Easy, Medium or Hard), so you can pick where to start.`,
  },
  {
    q: "Can I use it in class?",
    a: "Yes. Lessons are short, work on phones, tablets and laptops, and you can link straight to any lesson. After each course's first lesson, students need a free account (13+).",
  },
];

/**
 * The first-visit page at `/` (returning learners see the dashboard instead; see HomeSwitch).
 * Server-rendered so previews and search engines see it, and short enough to load fast on a phone.
 * Copy rules: short headings, one-line descriptions, one primary action.
 */
export function Landing({
  courses,
  firstLessonId,
  lessonMinutes,
}: {
  courses: CourseOutline[];
  firstLessonId: string;
  lessonMinutes: number;
}) {
  const how = [
    { Icon: LessonTimeIcon, text: `Short lessons, about ${lessonMinutes} minutes each` },
    { Icon: HandsOnIcon, text: "Learn by doing: take apart a laptop, route packets, fix a slow phone" },
    { Icon: HintIcon, text: "Instant feedback, and hints when you're stuck" },
  ];

  return (
    <div className="mx-auto max-w-page px-gutter">
      {/* Hero */}
      <section className="flex flex-col items-center pt-6 pb-12 text-center sm:pt-12">
        <Mascot expression="happy" size={140} idle label="The CyberNet mascot, waving hello" />
        <h1 className="mt-4 text-headline font-semibold text-balance sm:text-display">How tech really works</h1>
        <p className="mt-3 max-w-md text-lead text-balance text-ink-muted">
          Short, hands-on lessons on devices, the internet, AI and staying safe online.
        </p>
        <p className="mt-2 text-body font-semibold">{AUDIENCE}</p>
        <div className="mt-8 flex w-full max-w-sm flex-col items-center gap-2 sm:max-w-none">
          <LandingCta lessonId={firstLessonId} />
          <p className="text-small text-ink-muted">No sign-up for your first lesson</p>
        </div>
      </section>

      {/* Courses */}
      <section aria-labelledby="courses-heading" className="py-10">
        <h2 id="courses-heading" className="text-title font-semibold">
          {COUNT_WORDS[courses.length] ?? courses.length} courses
        </h2>
        <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, i) => (
            <li key={course.id}>
              <CourseCard course={course} startHere={i === 0} />
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-heading" className="py-10">
        <h2 id="how-heading" className="text-title font-semibold">
          How it works
        </h2>
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {how.map(({ Icon, text }) => (
            <li key={text} className="flex items-center gap-3 rounded-card border border-line bg-surface p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-node border-2 border-line-strong text-ink-muted">
                <Icon className="size-5" />
              </span>
              <span className="text-body">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Parents and teachers */}
      <section aria-labelledby="parents-heading" className="py-10">
        <h2 id="parents-heading" className="text-title font-semibold">
          For parents and teachers
        </h2>
        <ul className="mt-5 space-y-3 rounded-card border border-line bg-surface p-5">
          {[
            "No ads, and no tracking cookies",
            "We never sell anyone's data",
            "Start without an account. Free accounts (13+) keep only an email, a display name and learning progress",
          ].map((text) => (
            <li key={text} className="flex items-start gap-3 text-body">
              <SafeIcon className="mt-0.5 size-5 shrink-0 text-ink-muted" />
              <span>{text}</span>
            </li>
          ))}
          <li>
            <Link href="/privacy" className="font-semibold text-accent-ink underline-offset-2 hover:underline">
              Read the privacy policy
            </Link>
          </li>
        </ul>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="py-10">
        <h2 id="faq-heading" className="text-title font-semibold">
          Questions
        </h2>
        <div className="mt-5 divide-y divide-line rounded-card border border-line bg-surface">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-body font-semibold [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDownIcon className="size-5 shrink-0 text-ink-muted transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-5 pb-4 text-body text-ink-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
