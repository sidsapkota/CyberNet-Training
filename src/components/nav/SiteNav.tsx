"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { LogoLockup } from "@/components/brand/Logo";
import { CoursesIcon, DashboardIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { XpPill } from "@/components/XpPill";

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

/** Top bar: logo, Dashboard and Courses (from `sm` up), XP and theme. */
export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas">
      <div className="mx-auto flex h-16 max-w-wide items-center gap-2 px-gutter sm:gap-6">
        <Link href="/" aria-label="CyberNet Training, dashboard" className="rounded-control">
          <LogoLockup />
        </Link>
        <nav aria-label="Main" className="hidden h-full items-stretch gap-1 sm:flex">
          {NAV.map((item) => {
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
        <div className="ml-auto flex items-center gap-2">
          <Link href="/" aria-label="Your XP, on the dashboard" className="rounded-control">
            <XpPill />
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

/** Phone tab bar, like Duolingo's: big tap targets at the bottom of the screen. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="grid grid-cols-2">
        {NAV.map(({ href, label, Icon, isActive }) => {
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
      </ul>
    </nav>
  );
}
