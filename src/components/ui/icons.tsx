import {
  ArrowRight,
  Award,
  Infinity as InfinityLucide,
  BookCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  LayoutList,
  Lightbulb,
  Tag,
  ListRestart,
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
  UserRound,
  MonitorSmartphone,
} from "lucide-react";
import {
  AppWindow,
  ArrowRightLeft,
  BatteryCharging,
  BatteryWarning,
  Binary,
  BookUser,
  Box,
  Bug,
  Cable,
  Calculator,
  Code,
  Cpu,
  DoorOpen,
  Download,
  Earth,
  Expand,
  EyeOff,
  FileDigit,
  FileText,
  Fingerprint,
  Folder,
  FolderOpen,
  Footprints,
  Gauge,
  Globe,
  Handshake,
  HardDrive,
  Hash,
  Image as ImageIcon,
  Keyboard,
  KeyRound,
  Layers,
  LifeBuoy,
  Bot,
  ScanEye,
  Brain,
  AudioLines,
  Tags,
  Scale,
  MessageSquare,
  ThermometerSun,
  Sparkles,
  WandSparkles,
  ImagePlay,
  ScanFace,
  Link,
  MailWarning,
  MapPin,
  MemoryStick,
  MessageSquareWarning,
  Monitor,
  Package,
  Phone,
  Plug,
  Radar,
  ScrollText,
  Search,
  ShieldAlert,
  Signal,
  Smartphone,
  Split,
  Thermometer,
  Users,
  Wifi,
  Wrench,
  Trophy,
  Flag,
  ChevronsUp,
  ChevronsDown,
  BookOpenCheck,
} from "lucide-react";
import type { LessonIconName } from "@/lib/content/lessonIcons";

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
export const BackIcon = brandIcon(ChevronLeft, "BackIcon");
export const ForwardIcon = brandIcon(ChevronRight, "ForwardIcon");
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
/** A free account: the badge on course path nodes a guest needs one for, and the sign-up gate. */
export const AccountIcon = brandIcon(UserRound, "AccountIcon");
export const AnyDeviceIcon = brandIcon(MonitorSmartphone, "AnyDeviceIcon");

// Sound
export const SoundOnIcon = brandIcon(Volume2, "SoundOnIcon");
export const SoundOffIcon = brandIcon(VolumeX, "SoundOffIcon");

// Landing, feedback and legal pages
export const LessonTimeIcon = brandIcon(Clock, "LessonTimeIcon");
export const HandsOnIcon = brandIcon(Hand, "HandsOnIcon");
export const FeedbackIcon = brandIcon(MessageSquareText, "FeedbackIcon");
export const SafeIcon = brandIcon(ShieldCheck, "SafeIcon");
export const RatingIcon = brandIcon(Star, "RatingIcon");

// Leagues
export const LeaguesIcon = brandIcon(Trophy, "LeaguesIcon");
export const ReportIcon = brandIcon(Flag, "ReportIcon");
export const PromotionIcon = brandIcon(ChevronsUp, "PromotionIcon");
export const DemotionIcon = brandIcon(ChevronsDown, "DemotionIcon");
export const CoursesDoneIcon = brandIcon(BookOpenCheck, "CoursesDoneIcon");
export const HiddenIcon = brandIcon(EyeOff, "HiddenIcon");

// Daily goals and streaks (the streak itself uses the drawn node chain, StreakIcon).
export const GoalIcon = brandIcon(Target, "GoalIcon");
export const FreezeIcon = brandIcon(Snowflake, "FreezeIcon");

// CyberNet Pro.
export const ProIcon = brandIcon(Gem, "ProIcon");
export const UnlimitedIcon = brandIcon(InfinityLucide, "UnlimitedIcon");
export const CertificateIcon = brandIcon(Award, "CertificateIcon");
export const MistakesIcon = brandIcon(ListRestart, "MistakesIcon");
export const PricingIcon = brandIcon(Tag, "PricingIcon");
export const LessonMenuIcon = brandIcon(LayoutList, "LessonMenuIcon");

/**
 * Lesson icons (the `icon` field of every lesson, from `LESSON_ICONS`), shown on course path
 * nodes, in the node popover and on the lesson-complete screen. `satisfies` makes the compiler
 * catch a name on the allow-list without an icon here, or the other way round.
 */
export const LESSON_ICON_COMPONENTS = {
  binary: Binary,
  "file-digit": FileDigit,
  hash: Hash,
  "map-pin": MapPin,
  house: House,
  globe: Globe,
  earth: Earth,
  expand: Expand,
  package: Package,
  router: Router,
  split: Split,
  network: Network,
  signal: Signal,
  cable: Cable,
  radar: Radar,
  "book-user": BookUser,
  search: Search,
  "square-terminal": SquareTerminal,
  "door-open": DoorOpen,
  handshake: Handshake,
  "scroll-text": ScrollText,
  "arrow-right-left": ArrowRightLeft,
  keyboard: Keyboard,
  link: Link,
  cloud: Cloud,
  server: Server,
  download: Download,
  code: Code,
  calculator: Calculator,
  box: Box,
  "memory-stick": MemoryStick,
  cpu: Cpu,
  "hard-drive": HardDrive,
  monitor: Monitor,
  laptop: Laptop,
  smartphone: Smartphone,
  "app-window": AppWindow,
  folder: Folder,
  "folder-open": FolderOpen,
  "file-text": FileText,
  image: ImageIcon,
  gauge: Gauge,
  thermometer: Thermometer,
  "battery-warning": BatteryWarning,
  "battery-charging": BatteryCharging,
  plug: Plug,
  wifi: Wifi,
  wrench: Wrench,
  bug: Bug,
  layers: Layers,
  "shield-check": ShieldCheck,
  "shield-alert": ShieldAlert,
  "key-round": KeyRound,
  fingerprint: Fingerprint,
  "mail-warning": MailWarning,
  "message-square-warning": MessageSquareWarning,
  phone: Phone,
  footprints: Footprints,
  "eye-off": EyeOff,
  users: Users,
  "life-buoy": LifeBuoy,
  bot: Bot,
  "scan-eye": ScanEye,
  brain: Brain,
  "audio-lines": AudioLines,
  tags: Tags,
  target: Target,
  scale: Scale,
  "message-square": MessageSquare,
  "thermometer-sun": ThermometerSun,
  sparkles: Sparkles,
  "wand-sparkles": WandSparkles,
  "image-play": ImagePlay,
  "scan-face": ScanFace,
} satisfies Record<LessonIconName, LucideIcon>;

/** A lesson's icon, with the brand stroke. Decorative: the lesson title always carries the meaning. */
export function LessonIcon({ name, ...props }: LucideProps & { name: LessonIconName }) {
  const Icon = LESSON_ICON_COMPONENTS[name];
  return (
    <Icon strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props} />
  );
}
