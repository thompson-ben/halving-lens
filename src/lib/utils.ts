import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatPercent(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function extractHashtags(text: string | null | undefined): string[] {
  if (!text) return [];
  const matches = text.match(/#[\p{L}0-9_]+/gu);
  return matches ? Array.from(new Set(matches.map((t) => t.toLowerCase()))) : [];
}

/**
 * Best-effort detection of a car make/model from free-form caption text.
 * Returns the first match against a curated list. For production accuracy
 * we'd swap this for an LLM call, but the list-based approach is fast,
 * deterministic, and good enough for tagging incoming items.
 */
const CAR_MAKES: Record<string, string[]> = {
  Ferrari: ["488", "f8", "sf90", "296", "812", "laferrari", "purosangue", "roma", "portofino", "f40", "f50"],
  Lamborghini: ["huracan", "aventador", "urus", "revuelto", "countach", "diablo", "gallardo"],
  Porsche: ["911", "gt3", "gt2", "carrera", "cayman", "panamera", "taycan", "918", "959"],
  McLaren: ["720s", "750s", "765lt", "p1", "senna", "artura", "speedtail"],
  Bugatti: ["chiron", "veyron", "tourbillon", "mistral", "centodieci"],
  Pagani: ["huayra", "zonda", "utopia"],
  "Aston Martin": ["valkyrie", "valhalla", "vantage", "db11", "db12", "dbs", "victor"],
  "Rolls-Royce": ["phantom", "ghost", "wraith", "cullinan", "spectre"],
  Bentley: ["continental", "bentayga", "flying spur", "mulsanne"],
  Mercedes: ["amg", "gt", "g63", "g-wagon", "sls", "slr", "g-class"],
  BMW: ["m3", "m4", "m5", "m8", "i8", "xm"],
  Audi: ["r8", "rs6", "rs7", "e-tron gt"],
};

export function detectCar(text: string | null | undefined): { make?: string; model?: string } {
  if (!text) return {};
  const lower = text.toLowerCase();
  for (const [make, models] of Object.entries(CAR_MAKES)) {
    if (lower.includes(make.toLowerCase())) {
      const model = models.find((m) => lower.includes(m));
      return { make, model: model ? model.toUpperCase() : undefined };
    }
    const model = models.find((m) => lower.includes(m));
    if (model) return { make, model: model.toUpperCase() };
  }
  return {};
}

export function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
