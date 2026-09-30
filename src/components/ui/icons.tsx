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
  LogIn,
  LogOut,
  Mail,
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
  Trash2,
  Undo2,
  Volume2,
  VolumeX,
  Waypoints,
  X,
  Zap,
  Clock,
  Hand,
  MessageSquareText,
  ShieldCheck,
  Star,
  Snowflake,
  Gem,
  Target,
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

// Accounts
export const SignInIcon = brandIcon(LogIn, "SignInIcon");
export const SignOutIcon = brandIcon(LogOut, "SignOutIcon");
export const MailIcon = brandIcon(Mail, "MailIcon");
export const DeleteIcon = brandIcon(Trash2, "DeleteIcon");

// Sound
export const SoundOnIcon = brandIcon(Volume2, "SoundOnIcon");
export const SoundOffIcon = brandIcon(VolumeX, "SoundOffIcon");

// Landing, feedback and legal pages
export const LessonTimeIcon = brandIcon(Clock, "LessonTimeIcon");
export const HandsOnIcon = brandIcon(Hand, "HandsOnIcon");
export const FeedbackIcon = brandIcon(MessageSquareText, "FeedbackIcon");
export const SafeIcon = brandIcon(ShieldCheck, "SafeIcon");
export const RatingIcon = brandIcon(Star, "RatingIcon");

// Daily goals and streaks (the streak itself uses the drawn node chain, StreakIcon).
export const GoalIcon = brandIcon(Target, "GoalIcon");
export const FreezeIcon = brandIcon(Snowflake, "FreezeIcon");

// CyberNet Pro.
export const ProIcon = brandIcon(Gem, "ProIcon");
