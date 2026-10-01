"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { LogoLockup } from "@/components/brand/Logo";
import { CoursesIcon, DashboardIcon, LeaguesIcon, SignInIcon } from "@/components/ui/icons";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { StreakPill } from "@/components/streak/StreakPill";
import { XpPill } from "@/components/XpPill";
import { useAuth } from "@/lib/auth/AuthProvider";
import { FALLBACK_DISPLAY_NAME } from "@/lib/auth/profile";
import { UserNode } from "@/components/account/UserNode";
import { ProBadge } from "@/components/pro/ProBadge";
import { usePro } from "@/lib/pro/ProProvider";
import { useLeaguesOpen } from "@/lib/leagues/useLeaguesOpen";

interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
}

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", Icon: DashboardIcon, isActive: (p) => p === "/" },
  {
    href: "/courses",
    label: "Courses",
    Icon: CoursesIcon,
    isActive: (p) => p.startsWith("/courses") || p.startsWith("/course/"),
  },
];

/** Leagues: only for signed-in learners, once leagues have opened. */
const LEAGUES: NavItem = { href: "/leagues", label: "Leagues", Icon: LeaguesIcon, isActive: (p) => p.startsWith("/leagues") };

function useNav(): NavItem[] {
  return useLeaguesOpen() ? [...NAV, LEAGUES] : NAV;
}

/** Top bar: logo, Dashboard, Courses and Leagues (from `sm` up), XP and theme. */
export function SiteHeader() {
  const pathname = usePathname();
  const nav = useNav();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas">
      <div className="mx-auto flex h-16 max-w-wide items-center gap-2 px-gutter sm:gap-6">
        <Link href="/" aria-label="CyberNet Training, dashboard" className="inline-flex min-h-11 min-w-11 items-center rounded-control">
          <LogoLockup />
        </Link>
        <nav aria-label="Main" className="hidden h-full items-stretch gap-1 sm:flex">
          {nav.map((item) => {
            const active = item.isActive(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center px-3 text-small font-semibold transition-colors ${
                  active ? "text-ink" : "text-ink-muted hover:text-ink"
                }`}
              >
                {item.label}
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    aria-hidden="true"
                    className="absolute inset-x-3 bottom-0 h-0.5 rounded-sm bg-accent"
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
  const name = auth.displayName ?? FALLBACK_DISPLAY_NAME;
  return (
    <Link
      href="/account"
      aria-label={`Account: ${name}${hasPro ? ", Pro" : ""}`}
      className="hidden items-center gap-2 rounded-control px-1.5 py-1 text-small font-semibold text-ink transition-colors hover:bg-surface-raised sm:flex"
    >
      <UserNode name={auth.displayName} pro={hasPro} className="size-8 text-small" />
      <span className="hidden max-w-32 truncate md:inline">{name}</span>
      {hasPro && <ProBadge size="sm" lit className="hidden md:inline-flex" />}
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
        {nav.map(({ href, label, Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-16 flex-col items-center justify-center gap-0.5 text-caption font-semibold ${
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
                <Icon className="size-6" />
                {label}
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
  const active = pathname.startsWith("/account") || pathname.startsWith("/login");
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`relative flex h-16 flex-col items-center justify-center gap-0.5 text-caption font-semibold ${
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
        {signedIn ? <UserNode name={auth.displayName} pro={hasPro} className="size-6 text-[0.7rem]" /> : <SignInIcon className="size-6" />}
        {signedIn ? "Account" : "Sign in"}
      </Link>
    </li>
  );
}
