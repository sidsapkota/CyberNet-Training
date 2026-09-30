import { LogoLockup } from "@/components/brand/Logo";
import { CourseList } from "@/components/home/CourseList";
import { ResetProgressButton } from "@/components/home/ResetProgressButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { XpPill } from "@/components/XpPill";
import { getCourses } from "@/lib/content/server";

export default function HomePage() {
  const courses = getCourses();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-canvas">
        <div className="mx-auto flex max-w-page items-center gap-2 px-gutter py-3">
          <div className="flex-1">
            <LogoLockup />
          </div>
          <XpPill />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-page px-gutter pt-10 pb-section sm:pt-14">
        <p className="font-mono text-caption tracking-widest text-ink-faint uppercase">
          Hardware · Networks · Systems · Security
        </p>
        <h1 className="mt-3 max-w-2xl text-headline font-semibold text-balance sm:text-display">
          Learn how technology really works
        </h1>
        <p className="mt-3 max-w-xl text-lead text-ink-muted">
          Short, hands-on lessons. Connect one idea at a time. No experience needed.
        </p>

        <CourseList courses={courses} />

        <footer className="mt-section flex justify-center border-t border-line pt-6">
          <ResetProgressButton />
        </footer>
      </main>
    </div>
  );
}
