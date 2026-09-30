import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  Cloud,
  Diamond,
  GripVertical,
  Laptop,
  Lightbulb,
  Lock,
  type LucideIcon,
  type LucideProps,
  Moon,
  Network,
  Play,
  RotateCcw,
  Router,
  Server,
  Sun,
  SquareTerminal,
  Undo2,
  X,
  Zap,
} from "lucide-react";

/**
 * The app's icon set: lucide-react, normalised to the brand stroke (1.75, round caps/joins)
 * to match the logo's line weight. Import icons from here, never from lucide-react directly,
 * so every icon stays consistent. Only the logo and node shapes are custom-drawn.
 */
export const ICON_STROKE = 1.75;

function brandIcon(Icon: LucideIcon, name: string) {
  function BrandIcon(props: LucideProps) {
    return (
      <Icon
        strokeWidth={ICON_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...props}
      />
    );
  }
  BrandIcon.displayName = name;
  return BrandIcon;
}

export const CheckIcon = brandIcon(Check, "CheckIcon");
export const XIcon = brandIcon(X, "XIcon");
export const LockIcon = brandIcon(Lock, "LockIcon");
export const PlayIcon = brandIcon(Play, "PlayIcon");
export const XpIcon = brandIcon(Zap, "XpIcon");
export const ChallengeIcon = brandIcon(Diamond, "ChallengeIcon");
export const GripIcon = brandIcon(GripVertical, "GripIcon");
export const ChevronDownIcon = brandIcon(ChevronDown, "ChevronDownIcon");
export const ArrowRightIcon = brandIcon(ArrowRight, "ArrowRightIcon");
export const RetryIcon = brandIcon(RotateCcw, "RetryIcon");
export const SunIcon = brandIcon(Sun, "SunIcon");
export const MoonIcon = brandIcon(Moon, "MoonIcon");
export const WarningIcon = brandIcon(CircleAlert, "WarningIcon");
export const HintIcon = brandIcon(Lightbulb, "HintIcon");
export const UndoIcon = brandIcon(Undo2, "UndoIcon");
export const TerminalIcon = brandIcon(SquareTerminal, "TerminalIcon");
// Network node kinds (packet_path)
export const DeviceIcon = brandIcon(Laptop, "DeviceIcon");
export const RouterIcon = brandIcon(Router, "RouterIcon");
export const SwitchIcon = brandIcon(Network, "SwitchIcon");
export const ServerIcon = brandIcon(Server, "ServerIcon");
export const InternetIcon = brandIcon(Cloud, "InternetIcon");
