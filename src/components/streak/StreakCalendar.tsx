import { CheckIcon, FreezeIcon } from "@/components/ui/icons";
import { addDays } from "@/lib/progress/daily";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

type DayState = "met" | "frozen" | "today" | "open" | "future";

const STATE_TEXT: Record<DayState, string> = {
  met: "goal met",
  frozen: "streak freeze used",
  today: "today, goal not met yet",
  open: "goal not met",
  future: "",
};

/**
 * This month as a grid of nodes (weeks start on Monday). Met days are lit nodes with a check,
 * frozen days a dashed node with a snowflake, today a ring. Every state has a shape or icon, and
 * each day's label says it in words.
 */
export function StreakCalendar({
  today,
  metDays,
  frozenDays,
}: {
  /** "YYYY-MM-DD". */
  today: string;
  metDays: ReadonlySet<string>;
  frozenDays: ReadonlySet<string>;
}) {
  const first = `${today.slice(0, 8)}01`;
  const [year, month] = today.split("-").map(Number) as [number, number];
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7; // Monday = 0
  const monthName = new Intl.DateTimeFormat("en-AU", { month: "long", timeZone: "UTC" }).format(Date.UTC(year, month - 1, 1));

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = addDays(first, i);
    const state: DayState = metDays.has(day)
      ? "met"
      : frozenDays.has(day)
        ? "frozen"
        : day === today
          ? "today"
          : day < today
            ? "open"
            : "future";
    return { day, n: i + 1, state };
  });

  return (
    <div className="w-full max-w-xs">
      <p className="text-small font-semibold">{monthName}</p>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center" aria-hidden="true">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="font-mono text-caption text-ink-faint">
            {d}
          </span>
        ))}
      </div>
      <ol className="mt-1 grid grid-cols-7 gap-1" aria-label={`${monthName} streak calendar`}>
        {days.map(({ day, n, state }, i) => (
          <li
            key={day}
            className="grid place-items-center"
            style={i === 0 ? { gridColumnStart: lead + 1 } : undefined}
          >
            <span className="sr-only">{`${monthName} ${n}${state === "future" ? "" : `: ${STATE_TEXT[state]}`}`}</span>
            <span
              aria-hidden="true"
              className={`grid size-8 place-items-center rounded-node font-mono text-caption tabular-nums ${
                state === "met"
                  ? "bg-accent text-on-accent"
                  : state === "frozen"
                    ? "border-2 border-dashed border-line-strong text-ink-muted"
                    : state === "today"
                      ? "border-2 border-accent-ink font-semibold text-ink"
                      : "text-ink-faint"
              }`}
            >
              {state === "met" ? (
                <CheckIcon className="size-4" />
              ) : state === "frozen" ? (
                <FreezeIcon className="size-4" />
              ) : (
                n
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
