import { Google_Sans } from "next/font/google";
import Image from "next/image";
import type { ButtonHTMLAttributes } from "react";

/**
 * Google's font for its sign-in button text (branding guidelines: Google Sans Medium 14/20).
 * Self-hosted at build time like Plex, and only loaded on pages that render this button.
 * next/font has no fallback metrics for Google Sans, so the fallback is named instead of adjusted.
 */
const googleSans = Google_Sans({
  subsets: ["latin"],
  weight: "500",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Roboto", "Arial", "sans-serif"],
});

/** Google's official "G", unmodified (see public/brand/google/README.md for where it came from). */
export const GOOGLE_G_SRC = "/brand/google/google-g.png";

/**
 * "Continue with Google", built to Google's Sign in with Google branding guidelines, which the
 * Google app needs before it can leave Testing mode:
 * - the official full-colour "G" at its fixed 20px size, never recoloured or replaced
 * - Google's light theme (white, #747775 stroke) or dark theme (#131314, #8E918F stroke),
 *   following our light and dark themes (tokens `google-*` in theme.css)
 * - 12px before the logo, 10px after it, 12px after the text; Google Sans Medium 14/20
 * - rectangular with Google's 4px corners; 44px tall to keep our tap-target minimum
 * This is the one place a third-party brand appears: an exception to the lucide-only icon rule
 * and the brand palette. Don't restyle it to match our buttons.
 */
export function GoogleSignInButton({
  className = "",
  type = "button",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return (
    <button
      type={type}
      className={
        "inline-flex min-h-11 w-full items-center justify-center rounded-sm border border-google-stroke " +
        "bg-google-fill pr-3 pl-3 text-google-ink transition-colors duration-150 hover:bg-google-fill-hover " +
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-google-fill " +
        className
      }
      {...props}
    >
      <Image src={GOOGLE_G_SRC} width={20} height={20} alt="" unoptimized className="size-5 shrink-0" />
      <span className={`${googleSans.className} ml-2.5 text-google-button font-medium`}>Continue with Google</span>
    </button>
  );
}
