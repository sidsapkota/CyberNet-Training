import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

export type ButtonVariant = "primary" | "success" | "danger" | "secondary" | "ghost";

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-6 text-body font-semibold " +
  "transition-[background-color,color,box-shadow,transform,border-color] duration-150 active:translate-y-px " +
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:active:translate-y-0";

const variants: Record<ButtonVariant, string> = {
  // The primary action is the one place besides lit nodes that may glow.
  primary: "bg-accent text-on-accent shadow-glow hover:bg-accent-strong",
  success: "bg-success text-on-success hover:brightness-110",
  danger: "bg-danger text-on-danger hover:brightness-110",
  secondary: "border border-line-strong bg-surface text-ink hover:border-accent-ink hover:text-accent-ink",
  ghost: "text-ink-muted hover:bg-surface-raised hover:text-ink",
};

export function buttonClasses(variant: ButtonVariant = "primary", className = "") {
  return `${base} ${variants[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={buttonClasses(variant, className)} {...props} />;
}
