import {
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
  { href: "/cycles", label: "4-cycle overlay", icon: Layers },
  { href: "/replay", label: "Cycle replay", icon: Play },
  { href: "/metrics", label: "Metric library", icon: Sparkles },
  { href: "/hodl-waves", label: "HODL waves", icon: Waves },
];

export const SECONDARY: readonly NavLink[] = [
  { href: "/onchain", label: "On-chain", icon: LineChart },
  { href: "/etf", label: "ETF flow", icon: Wallet },
  { href: "/miners", label: "Miners", icon: Pickaxe },
  { href: "/derivatives", label: "Derivatives", icon: Repeat },
];
