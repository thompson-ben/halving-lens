// Local-first personalization store for the anonymous dashboard (Phase 1).
// Everything lives in localStorage keyed to the device — no account, no friction.
//
// Phase 2 (magic-link auth) upgrades this cleanly: the same item shapes can be
// synced to a per-subscriber server store and merged with the local copy, so
// nothing here needs to change for users — only a sync layer is added on top.

export interface PersonalItem {
  kind: string; // "research" | "finding" | "metric" | "brief" | "weekly" | "tool"
  title: string;
  href: string;
  ts: number; // last interaction (ms)
}

const RECENT_KEY = "hl.recent";
const SAVED_KEY = "hl.saved";
const VISIT_KEY = "hl.lastvisit";
const RECENT_CAP = 40;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore */
  }
}

// Record a content view (deduped by href, newest first, capped).
export function recordView(item: Omit<PersonalItem, "ts">): void {
  const list = read<PersonalItem[]>(RECENT_KEY, []).filter((x) => x.href !== item.href);
  list.unshift({ ...item, ts: Date.now() });
  write(RECENT_KEY, list.slice(0, RECENT_CAP));
}

export function getRecent(kind?: string): PersonalItem[] {
  const list = read<PersonalItem[]>(RECENT_KEY, []);
  return kind ? list.filter((x) => x.kind === kind) : list;
}

export function isSaved(href: string): boolean {
  return read<PersonalItem[]>(SAVED_KEY, []).some((x) => x.href === href);
}

// Toggle a saved/favourite item; returns the new saved state.
export function toggleSave(item: Omit<PersonalItem, "ts">): boolean {
  const list = read<PersonalItem[]>(SAVED_KEY, []);
  const exists = list.some((x) => x.href === item.href);
  const next = exists ? list.filter((x) => x.href !== item.href) : [{ ...item, ts: Date.now() }, ...list];
  write(SAVED_KEY, next);
  return !exists;
}

export function getSaved(): PersonalItem[] {
  return read<PersonalItem[]>(SAVED_KEY, []);
}

// Read the previous visit timestamp WITHOUT updating it (for "since your last visit").
export function peekLastVisit(): number | null {
  const v = read<number | null>(VISIT_KEY, null);
  return typeof v === "number" ? v : null;
}

// Stamp "now" as the latest visit.
export function markVisit(): void {
  write(VISIT_KEY, Date.now());
}

// ── Visit-day log → streaks (for loyalty badges) ─────────────────────────────
const DAYS_KEY = "hl.visitdays";

export function recordVisitDay(): void {
  if (typeof window === "undefined") return;
  const today = new Date().toISOString().slice(0, 10);
  const list = read<string[]>(DAYS_KEY, []);
  if (!list.includes(today)) write(DAYS_KEY, [...list, today].slice(-400));
}

// Current consecutive-day streak ending today (inclusive).
export function getStreak(): number {
  const set = new Set(read<string[]>(DAYS_KEY, []));
  let streak = 0;
  const d = new Date();
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (!set.has(key)) break;
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function getVisitDayCount(): number {
  return read<string[]>(DAYS_KEY, []).length;
}
