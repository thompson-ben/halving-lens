import {
  Activity,
  Award,
  BookOpen,
  Boxes,
  FlaskConical,
  Gauge,
  HeartPulse,
  Landmark,
  LayoutDashboard,
  History,
  Hourglass,
  Layers,
  Library,
  LineChart,
  Newspaper,
  Pickaxe,
  Play,
  Radar,
  ScrollText,
  Sparkles,
  Sprout,
  TrendingDown,
  Waves,
  type LucideIcon,
} from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

// The three flagship experiences — the daily-return story: what changed today,
// how attractive conditions are vs history, and the full historical range from
// here. Surfaced first, on their own, so they stand out.
export const FLAGSHIP: readonly NavLink[] = [
  { href: "/state-of-bitcoin", label: "The State of Bitcoin", icon: Radar },
  { href: "/accumulation", label: "Accumulation Index", icon: Sprout },
  { href: "/historical-price-paths", label: "Historical Price Paths", icon: TrendingDown },
];

// Core cycle journeys.
export const PRIMARY: readonly NavLink[] = [
  { href: "/", label: "Cycle dashboard", icon: Gauge },
  { href: "/dashboard", label: "Your dashboard", icon: LayoutDashboard },
  { href: "/cycles", label: "Cycle comparison", icon: Layers },
  { href: "/similar-moments", label: "Similar moments", icon: History },
  { href: "/market-health", label: "Market Health", icon: HeartPulse },
  { href: "/etf", label: "ETF Flows", icon: Landmark },
  { href: "/brief", label: "Daily brief", icon: Newspaper },
  { href: "/research", label: "Morning Research", icon: Library },
  { href: "/research/findings", label: "Research findings", icon: FlaskConical },
  { href: "/weekly", label: "Weekly Research", icon: ScrollText },
  { href: "/sentiment", label: "Sentiment", icon: Activity },
  { href: "/replay", label: "Cycle replay", icon: Play },
  { href: "/metrics", label: "Metric library", icon: Sparkles },
  { href: "/learn", label: "Learn", icon: BookOpen },
];

// Real, data-backed extra pages.
export const EXPLORE: readonly NavLink[] = [
  { href: "/price", label: "Bitcoin price", icon: LineChart },
  { href: "/halving", label: "Next halving", icon: Hourglass },
  { href: "/miners", label: "Miners", icon: Pickaxe },
  { href: "/founders", label: "Hall of Founders", icon: Award },
];

// Honest placeholders — switch on once a live source is connected.
export const SOON: readonly NavLink[] = [
  { href: "/onchain", label: "On-chain", icon: Boxes },
  { href: "/hodl-waves", label: "HODL waves", icon: Waves },
];
