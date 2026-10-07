"use client";

import { motion } from "motion/react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { LogoLockup } from "@/components/brand/Logo";
import { CoursesIcon, DashboardIcon, LeaguesIcon, PlayIcon, PricingIcon, ProIcon, SignInIcon } from "@/components/ui/icons";
import { FEED_ENABLED } from "@/lib/feed/config";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { StreakPill } from "@/components/streak/StreakPill";
import { XpPill } from "@/components/XpPill";
import { useAuth } from "@/lib/auth/AuthProvider";
import { FALLBACK_NAME } from "@/lib/auth/profile";
import { UserNode } from "@/components/account/UserNode";
import { ProBadge } from "@/components/pro/ProBadge";
import { usePro } from "@/lib/pro/ProProvider";
import { useLeaguesOpen } from "@/lib/leagues/useLeaguesOpen";

interface NavItem {
  href: string;
  label: string;
  /** A shorter label for the phone tab bar (six tabs share 360px). */
  short?: string;
  Icon: ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
}

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", short: "Home", Icon: DashboardIcon, isActive: (p) => p === "/" },
  {
    href: "/courses",
    label: "Courses",
    Icon: CoursesIcon,
    isActive: (p) => p.startsWith("/courses") || p.startsWith("/course/"),
  },
];

/** The Feed (behind FEED_ENABLED; docs/plans/feed.md). */
const FEED: NavItem = { href: "/feed", label: "Feed", Icon: PlayIcon, isActive: (p) => p.startsWith("/feed") };

/** Leagues: only for signed-in learners, once leagues have opened. */
const LEAGUES: NavItem = { href: "/leagues", label: "Leagues", Icon: LeaguesIcon, isActive: (p) => p.startsWith("/leagues") };

/** Pricing (the plans on /pro), or "Your plan" for Pro members. */
const PRICING: NavItem = { href: "/pro?from=nav", label: "Pricing", Icon: PricingIcon, isActive: (p) => p === "/pro" };
const YOUR_PLAN: NavItem = { href: "/account/plan", label: "Your plan", Icon: ProIcon, isActive: (p) => p.startsWith("/account/plan") };

/**
 * The plan item: hidden until a signed-in learner's Pro status is known, so a member never sees
 * "Pricing" flash before "Your plan".
 */
function usePlanItem(): NavItem | null {
  const { auth, available } = useAuth();
  const { pro, hasPro } = usePro();
  if (!available || auth.status === "guest") return PRICING;
  if (auth.status === "loading" || pro.loading) return null;
  return hasPro ? YOUR_PLAN : PRICING;
}

function useNav(): NavItem[] {
  const plan = usePlanItem();
  return [...NAV, ...(FEED_ENABLED ? [FEED] : []), ...(useLeaguesOpen() ? [LEAGUES] : []), ...(plan ? [plan] : [])];
}

/** Top bar: logo, Dashboard, Courses and Leagues (from `sm` up), XP and theme. */
export function SiteHeader() {
  const pathname = usePathname();
  const nav = useNav();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas">
      <div className="mx-auto flex h-16 max-w-wide items-center gap-2 px-gutter sm:gap-3 lg:gap-6">
        <Link href="/" aria-label="CyberNet Training, dashboard" className="inline-flex min-h-11 min-w-11 shrink-0 items-center rounded-control">
          <LogoLockup tileOnTablets />
        </Link>
        <nav aria-label="Main" className="hidden h-full items-stretch gap-1 sm:flex">
          {nav.map((item) => {
            const active = item.isActive(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center px-2 text-small font-semibold lg:px-3 transition-[background-color,color] active:bg-surface-raised ${
                  active ? "text-ink" : "text-ink-muted hover:text-ink"
                }`}
              >
                {/* Tablets share the bar with the Feed tab: the short label (Home) until there's room. */}
                <span className="lg:hidden">{item.short ?? item.label}</span>
                <span className="hidden lg:inline">{item.label}</span>
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    aria-hidden="true"
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-sm bg-accent lg:inset-x-3"
                  />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2 max-[399px]:gap-1">
          <StreakPill />
          <Link href="/" aria-label="Your XP, on the dashboard" className="rounded-control">
            <XpPill />
          </Link>
          <SoundToggle />
          <ThemeToggle />
          <HeaderAccount />
        </div>
      </div>
    </header>
  );
}

/** Desktop header (from `sm`): "Sign in" for guests, the learner's node and name when signed in. */
function HeaderAccount() {
  const { auth, available } = useAuth();
  const { hasPro } = usePro();
  if (!available) return null;
  if (auth.status === "loading") return <span className="hidden w-24 sm:block" aria-hidden="true" />;
  if (auth.status === "guest") {
    return (
      <Link
        href="/login"
        className="hidden min-h-11 items-center gap-1.5 rounded-control border border-line-strong px-3 text-small font-semibold text-ink transition-colors hover:border-accent-ink hover:text-accent-ink sm:inline-flex"
      >
        <SignInIcon className="size-4" /> Sign in
      </Link>
    );
  }
  const name = auth.username ?? FALLBACK_NAME;
  return (
    <Link
      href="/account"
      // The whole page, prefetched (as before loading.tsx existed): the tap shows it at once, and
      // the loading screen is only a fallback when a tap beats the prefetch.
      prefetch
      aria-label={`Account: ${name}${hasPro ? ", Pro" : ""}`}
      className="hidden items-center gap-2 rounded-control px-1.5 py-1 text-small font-semibold text-ink hover:bg-surface-raised sm:flex transition-[background-color,color,scale] active:bg-surface-raised motion-safe:active:scale-95"
    >
      <Pending>
        <UserNode outfit={auth.outfit} pro={hasPro} size={32} />
      </Pending>
      <span className="hidden whitespace-nowrap lg:inline">{name}</span>
      {hasPro && <ProBadge size="sm" lit className="hidden lg:inline-flex" />}
    </Link>
  );
}

/** Phone tab bar, like Duolingo's: big tap targets at the bottom of the screen. */
export function BottomNav() {
  const pathname = usePathname();
  const nav = useNav();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="grid auto-cols-fr grid-flow-col">
        {nav.map(({ href, label, short, Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-16 flex-col items-center justify-center gap-0.5 rounded-control text-caption font-semibold transition-[background-color,color,scale] active:bg-surface-raised motion-safe:active:scale-95 ${
                  active ? "text-accent-ink" : "text-ink-muted"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="tab-active"
                    aria-hidden="true"
                    className="absolute inset-x-8 top-0 h-0.5 rounded-sm bg-accent"
                  />
                )}
                <Pending>
                  <Icon className="size-6" />
                </Pending>
                {short ?? label}
              </Link>
            </li>
          );
        })}
        <AccountTab pathname={pathname} />
      </ul>
    </nav>
  );
}

/** Last phone tab: "Sign in" for guests, "Account" with the learner's node when signed in. */
function AccountTab({ pathname }: { pathname: string }) {
  const { auth, available } = useAuth();
  const { hasPro } = usePro();
  if (!available) return null;
  const signedIn = auth.status === "signed-in";
  const href = signedIn ? "/account" : "/login";
  // Your plan has its own tab for Pro members.
  const active = (pathname.startsWith("/account") && !(hasPro && pathname.startsWith("/account/plan"))) || pathname.startsWith("/login");
  return (
    <li>
      <Link
        href={href}
        prefetch={signedIn ? true : undefined}
        aria-current={active ? "page" : undefined}
        className={`relative flex h-16 flex-col items-center justify-center gap-0.5 rounded-control text-caption font-semibold transition-[background-color,color,scale] active:bg-surface-raised motion-safe:active:scale-95 ${
          active ? "text-accent-ink" : "text-ink-muted"
        }`}
      >
        {active && (
          <motion.span
            layoutId="tab-active"
            aria-hidden="true"
            className="absolute inset-x-8 top-0 h-0.5 rounded-sm bg-accent"
          />
        )}
        <Pending>
          {signedIn ? <UserNode outfit={auth.outfit} pro={hasPro} size={24} /> : <SignInIcon className="size-6" />}
        </Pending>
        {signedIn ? "Account" : "Sign in"}
      </Link>
    </li>
  );
}

/**
 * Inside a nav link: from the tap until the new page shows, the icon stays visibly pressed (dimmed,
 * and a touch smaller when motion is allowed), so a tap always gets an answer at once.
 */
function Pending({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <span data-pending={pending || undefined} className={`inline-grid transition-[opacity,scale] duration-100 ${pending ? "opacity-60 motion-safe:scale-90" : ""}`}>
      {children}
    </span>
  );
}
