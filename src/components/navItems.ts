import {
  Activity,
  Award,
  BookMarked,
  BookOpen,
  CalendarDays,
  Boxes,
  CircleHelp,
  Compass,
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

export interface NavSection {
  label: string;
  items: readonly NavLink[];
  accent?: boolean; // render the label in the accent colour (the flagship group)
  muted?: boolean; // render the items muted (placeholders)
}

// The three flagship experiences — the daily-return story: what changed today,
// how attractive conditions are vs history, and the full historical range from
// here. Surfaced first, on their own, so they stand out.
export const FLAGSHIP: readonly NavLink[] = [
  // The Journal is the publication and the primary destination; The State of
  // Bitcoin is its current Chapter, read live.
  { href: "/journal", label: "The Journal", icon: BookMarked },
  { href: "/state-of-bitcoin", label: "The State of Bitcoin", icon: Radar },
  { href: "/four-reference-prices", label: "Four Reference Prices", icon: Layers },
  { href: "/accumulation", label: "Accumulation Index", icon: Sprout },
  { href: "/historical-price-paths", label: "Historical Price Paths", icon: TrendingDown },
];

// The rest of the app, grouped by intent so it reads as an extension of the
// flagship journey: what's happening now (Today) → positioning (Invest) →
// deeper study (Research). Each theme echoes one flagship page.
const TODAY: readonly NavLink[] = [
  { href: "/", label: "Cycle dashboard", icon: Gauge },
  { href: "/brief", label: "Daily brief", icon: Newspaper },
  { href: "/market-health", label: "Market Health", icon: HeartPulse },
  { href: "/sentiment", label: "Sentiment", icon: Activity },
  { href: "/etf", label: "ETF Flows", icon: Landmark },
];

const INVEST: readonly NavLink[] = [
  { href: "/dashboard", label: "Your dashboard", icon: LayoutDashboard },
  { href: "/similar-moments", label: "Similar moments", icon: History },
];

const RESEARCH: readonly NavLink[] = [
  { href: "/cycles", label: "Cycle comparison", icon: Layers },
  { href: "/research", label: "Morning Research", icon: Library },
  { href: "/research/findings", label: "Research findings", icon: FlaskConical },
  { href: "/weekly", label: "Weekly Research", icon: ScrollText },
  { href: "/replay", label: "Cycle replay", icon: Play },
  { href: "/metrics", label: "Metric library", icon: Sparkles },
  { href: "/questions", label: "Bitcoin Questions", icon: CircleHelp },
  { href: "/learn", label: "Learn", icon: BookOpen },
];

// Real, data-backed extra pages.
export const EXPLORE: readonly NavLink[] = [
  { href: "/start-here", label: "Start Here", icon: Compass },
  { href: "/price", label: "Bitcoin price", icon: LineChart },
  { href: "/price/seasonality", label: "Seasonality", icon: CalendarDays },
  { href: "/halving", label: "Next halving", icon: Hourglass },
  { href: "/miners", label: "Miners", icon: Pickaxe },
  { href: "/founders", label: "Hall of Founders", icon: Award },
];

// Honest placeholders — switch on once a live source is connected.
export const SOON: readonly NavLink[] = [
  { href: "/onchain", label: "On-chain", icon: Boxes },
  { href: "/hodl-waves", label: "HODL waves", icon: Waves },
];

// Single source of truth the sidebar and mobile nav both render, so the two
// never drift apart.
export const NAV_SECTIONS: readonly NavSection[] = [
  { label: "Flagship", items: FLAGSHIP, accent: true },
  { label: "Today", items: TODAY },
  { label: "Invest", items: INVEST },
  { label: "Research", items: RESEARCH },
  { label: "Explore", items: EXPLORE },
  { label: "Coming soon", items: SOON, muted: true },
];

// Kept for any legacy import; prefer NAV_SECTIONS.
export const PRIMARY: readonly NavLink[] = [...TODAY, ...INVEST, ...RESEARCH];
