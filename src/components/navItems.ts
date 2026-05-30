import {
  Activity,
  BookOpen,
  Gauge,
  Layers,
  LineChart,
  Pickaxe,
  Play,
  Repeat,
  Sparkles,
  Wallet,
  Waves,
  type LucideIcon,
} from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const PRIMARY: readonly NavLink[] = [
  { href: "/", label: "Cycle dashboard", icon: Gauge },
  { href: "/cycles", label: "Cycle comparison", icon: Layers },
  { href: "/sentiment", label: "Sentiment", icon: Activity },
  { href: "/replay", label: "Cycle replay", icon: Play },
  { href: "/metrics", label: "Metric library", icon: Sparkles },
  { href: "/learn", label: "Learn", icon: BookOpen },
];

export const SECONDARY: readonly NavLink[] = [
  { href: "/etf", label: "ETF flow", icon: Wallet },
  { href: "/hodl-waves", label: "HODL waves", icon: Waves },
  { href: "/onchain", label: "On-chain", icon: LineChart },
  { href: "/miners", label: "Miners", icon: Pickaxe },
  { href: "/derivatives", label: "Derivatives", icon: Repeat },
];
