import {
  ArrowRight,
  BookCheck,
  Check,
  ChevronDown,
  CircleAlert,
  Cloud,
  Compass,
  Diamond,
  GripVertical,
  House,
  Laptop,
  LibraryBig,
  Lightbulb,
  Lock,
  type LucideIcon,
  type LucideProps,
  Moon,
  Network,
  Play,
  RotateCcw,
  Route,
  Router,
  Server,
  Sun,
  SquareTerminal,
  Undo2,
  Waypoints,
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

// Navigation, dashboard and course path
export const DashboardIcon = brandIcon(House, "DashboardIcon");
export const CoursesIcon = brandIcon(LibraryBig, "CoursesIcon");
export const PathModeIcon = brandIcon(Route, "PathModeIcon");
export const ExploreModeIcon = brandIcon(Compass, "ExploreModeIcon");
export const LessonsIcon = brandIcon(BookCheck, "LessonsIcon");
export const ModulesIcon = brandIcon(Waypoints, "ModulesIcon");
