"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ComponentType, ReactNode } from "react";
import { CourseCard } from "@/components/course/CourseCard";
import { CourseCover } from "@/components/illustrations/CourseCover";
import { Mascot } from "@/components/mascot/Mascot";
import { NetworkMark } from "@/components/network/NetworkMark";
import { ButtonLink } from "@/components/ui/Button";
import { CountUp } from "@/components/ui/CountUp";
import { LessonsIcon, ModulesIcon, PlayIcon, XpIcon } from "@/components/ui/icons";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { estimateMinutes } from "@/lib/content/estimate";
import type { CourseOutline } from "@/lib/content/schema";
import { EASE_OUT_QUICK, staggerDelay } from "@/lib/motion";
import { type ActivityDay, dailyActivity, learnerStats } from "@/lib/progress/activity";
import { useProgress } from "@/lib/progress/ProgressProvider";
import {
  computeCourseState,
  type CourseState,
  courseProgress,
  getCurrentLesson,
  hasAnyProgress,
} from "@/lib/progress/state";
import { ResetProgressButton } from "./ResetProgressButton";

/** Staggered fade-and-rise for dashboard blocks. */
function Rise({ index, className = "", children }: { index: number; className?: string; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: staggerDelay(index, 0.06), ease: EASE_OUT_QUICK }}
    >
      {children}
    </motion.div>
  );
}

const panel = "rounded-card border border-line bg-surface shadow-card";

export function Dashboard({ courses }: { courses: CourseOutline[] }) {
  const { snapshot } = useProgress();

  if (!snapshot) {
    return (
      <div className="grid min-h-[60dvh] place-items-center">
        <NetworkMark mode="loading" className="size-20" label="Loading your progress" />
      </div>
    );
  }

  const first = courses[0];
  if (!hasAnyProgress(snapshot) || !first) return <Welcome course={first} />;

  const states = courses.map((course) => computeCourseState(snapshot, course));
  const focus =
    states.find((s) => getCurrentLesson(s) && courseProgress(s).completed > 0) ??
    states.find((s) => getCurrentLesson(s)) ??
    states[0]!;
  const stats = learnerStats(snapshot, courses);
  // Progress only renders after mount, so reading the clock here can't cause a hydration mismatch.
  const activity = dailyActivity(snapshot, new Date());

  return (
    <>
      <h1 className="sr-only">Dashboard</h1>
      <div className="grid gap-4 lg:grid-cols-3">
        <Rise index={0} className="lg:col-span-2">
          <ContinueHero state={focus} />
        </Rise>
        <Rise index={1}>
          <div className="grid h-full grid-cols-3 gap-3 lg:grid-cols-1">
            <Stat Icon={XpIcon} value={stats.totalXp} label="XP" accent />
            <Stat Icon={LessonsIcon} value={stats.lessonsCompleted} label="Lessons" />
            <Stat Icon={ModulesIcon} value={stats.modulesCompleted} label="Modules" />
          </div>
        </Rise>
        <Rise index={2} className="lg:col-span-2">
          <Activity days={activity} />
        </Rise>
        <Rise index={3}>
          <CourseRings states={states} />
        </Rise>
      </div>

      <Rise index={4} className="mt-10">
        <h2 className="text-title font-semibold">Your courses</h2>
        <div className="-mx-gutter mt-4 flex snap-x gap-4 overflow-x-auto px-gutter pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {courses.map((course) => (
            <div key={course.id} className="w-72 shrink-0 snap-start sm:w-auto">
              <CourseCard course={course} />
            </div>
          ))}
        </div>
      </Rise>

      <div className="mt-section flex justify-center">
        <ResetProgressButton />
      </div>
    </>
  );
}

function ContinueHero({ state }: { state: CourseState }) {
  const current = getCurrentLesson(state);
  const { course } = state;
  const moduleNumber = current ? course.modules.findIndex((m) => m.id === current.lesson.moduleId) + 1 : 0;
  const started = current && (current.status === "in_progress" || current.completedCoreCards > 0);

  return (
    <section aria-labelledby="continue-title" className={`${panel} flex h-full flex-col overflow-hidden md:flex-row`}>
      <CourseCover
        courseId={course.id}
        title={course.title}
        className="aspect-[16/9] md:order-2 md:aspect-auto md:w-72 md:shrink-0"
      />
      <div className="flex flex-1 flex-col justify-center gap-5 p-5 sm:p-7">
        <div>
          <p className="font-mono text-caption font-semibold tracking-widest text-accent-ink uppercase">
            {current ? (started ? "Continue" : "Up next") : "Course complete"}
          </p>
          <h2 id="continue-title" className="mt-2 text-headline leading-tight font-semibold text-balance">
            {current ? current.lesson.title : course.title}
          </h2>
          <p className="mt-1 truncate text-small text-ink-muted">
            {current
              ? `${course.title} · Module ${moduleNumber} · about ${estimateMinutes(current.lesson)} min`
              : "Every lesson and quiz done. Nice work."}
          </p>
        </div>
        {current ? (
          <ButtonLink href={`/lesson/${current.lesson.id}`} className="w-full sm:w-auto sm:self-start">
            <PlayIcon className="size-5" /> {started ? "Continue" : "Start"}
          </ButtonLink>
        ) : (
          <ButtonLink href={`/course/${course.id}`} variant="secondary" className="w-full sm:w-auto sm:self-start">
            Review course
          </ButtonLink>
        )}
      </div>
    </section>
  );
}

function Stat({
  Icon,
  value,
  label,
  accent = false,
}: {
  Icon: ComponentType<{ className?: string }>;
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className={`${panel} flex flex-col items-center justify-center gap-1 p-3 text-center lg:flex-row lg:justify-start lg:gap-4 lg:p-4 lg:text-left`}>
      <span
        className={`grid size-10 place-items-center rounded-control ${accent ? "bg-accent-soft text-accent-ink" : "bg-surface-raised text-ink-muted"}`}
      >
        <Icon className="size-5" />
      </span>
      <div>
        <p className={`font-mono text-title font-semibold tabular-nums ${accent ? "text-accent-ink" : "text-ink"}`}>
          <CountUp value={value} delay={0.3} />
        </p>
        <p className="text-caption text-ink-muted">{label}</p>
      </div>
    </div>
  );
}

const WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: "narrow" });
const LONG_DATE = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" });

function parseDay(date: string): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

function Activity({ days }: { days: ActivityDay[] }) {
  const reduceMotion = useReducedMotion();
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((sum, d) => sum + d.count, 0);

  return (
    <section aria-labelledby="activity-title" className={`${panel} h-full p-5`}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="activity-title" className="text-lead font-semibold">
          Activity
        </h2>
        <p className="font-mono text-caption text-ink-faint">Last 2 weeks · {total}</p>
      </div>
      <ol className="mt-5 grid h-32 grid-cols-14 items-end gap-1.5 sm:gap-2" aria-label="Lessons completed per day">
        {days.map((day, i) => {
          const date = parseDay(day.date);
          const isToday = i === days.length - 1;
          const height = day.count === 0 ? 0 : Math.max(12, (day.count / max) * 100);
          return (
            <li key={day.date} className="flex h-full flex-col items-center justify-end gap-2">
              <span className="sr-only">
                {LONG_DATE.format(date)}: {day.count} {day.count === 1 ? "completion" : "completions"}
              </span>
              <div aria-hidden="true" className="flex w-full flex-1 items-end justify-center">
                {day.count === 0 ? (
                  <span className="size-1.5 rounded-node bg-line-strong" />
                ) : (
                  <motion.span
                    className="block w-full max-w-5 origin-bottom rounded-sm bg-accent"
                    style={{ height: `${height}%` }}
                    initial={reduceMotion ? false : { scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.03, ease: EASE_OUT_QUICK }}
                  />
                )}
              </div>
              <span
                aria-hidden="true"
                className={`font-mono text-[0.65rem] ${isToday ? "font-semibold text-ink" : "text-ink-faint"}`}
              >
                {WEEKDAY.format(date)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function CourseRings({ states }: { states: CourseState[] }) {
  return (
    <section aria-labelledby="progress-title" className={`${panel} h-full p-5`}>
      <h2 id="progress-title" className="text-lead font-semibold">
        Progress
      </h2>
      <ul className="mt-4 space-y-4">
        {states.map((state) => {
          const { completed, total, fraction } = courseProgress(state);
          const percent = Math.round(fraction * 100);
          return (
            <li key={state.course.id} className="flex items-center gap-4">
              <ProgressRing value={fraction} size={64} label={`${state.course.title}: ${percent}% complete`}>
                <span className="font-mono text-small font-semibold tabular-nums">{percent}%</span>
              </ProgressRing>
              <div className="min-w-0">
                <p className="truncate font-semibold">{state.course.title}</p>
                <p className="font-mono text-caption text-ink-faint">
                  {completed}/{total} · {state.completedModules}/{state.modules.length} modules
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Welcome({ course }: { course: CourseOutline | undefined }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="flex min-h-[65dvh] flex-col items-center justify-center text-center">
      <Mascot expression="happy" size={200} idle label="The CyberNet mascot waving hello" />
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.35, ease: EASE_OUT_QUICK }}
        className="mt-8 flex flex-col items-center"
      >
        <h1 className="text-headline font-semibold text-balance sm:text-display">Welcome to CyberNet</h1>
        <p className="mt-2 text-lead text-ink-muted">Learn how tech really works, one tap at a time.</p>
        {course && (
          <ButtonLink href={`/course/${course.id}`} className="mt-8 w-full max-w-xs">
            Start learning
          </ButtonLink>
        )}
      </motion.div>
    </div>
  );
}
