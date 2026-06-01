import {
  Activity,
  BookOpen,
  Boxes,
  Gauge,
  Hourglass,
  Layers,
  LineChart,
  Newspaper,
  Pickaxe,
  Play,
  Sparkles,
  TrendingDown,
  Wallet,
  Waves,
  type LucideIcon,
} from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Core cycle journeys.
export const PRIMARY: readonly NavLink[] = [
  { href: "/", label: "Cycle dashboard", icon: Gauge },
  { href: "/cycles", label: "Cycle comparison", icon: Layers },
  { href: "/downside-scenarios", label: "Downside scenarios", icon: TrendingDown },
  { href: "/brief", label: "Daily brief", icon: Newspaper },
  { href: "/sentiment", label: "Sentiment", icon: Activity },
  { href: "/replay", label: "Cycle replay", icon: Play },
  { href: "/metrics", label: "Metric library", icon: Sparkles },
  { href: "/learn", label: "Learn", icon: BookOpen },
];

// Real, data-backed extra pages.
export const EXPLORE: readonly NavLink[] = [
  { href: "/price", label: "Bitcoin price", icon: LineChart },
  { href: "/etf", label: "ETF flow", icon: Wallet },
  { href: "/halving", label: "Next halving", icon: Hourglass },
  { href: "/miners", label: "Miners", icon: Pickaxe },
];

// Honest placeholders — switch on once a live source is connected.
export const SOON: readonly NavLink[] = [
  { href: "/onchain", label: "On-chain", icon: Boxes },
  { href: "/hodl-waves", label: "HODL waves", icon: Waves },
];
