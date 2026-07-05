// Reading-streak statistics — pure functions over the visit-day log
// (ISO YYYY-MM-DD strings), safe on both server and client. The visit days are
// captured on device and synced to the profile (see personalize.ts), so a
// signed-in member's streak is consistent across devices.

export interface StreakStats {
  current: number; // consecutive days ending today (or yesterday) — see note
  longest: number; // longest consecutive run ever
  totalDays: number; // distinct days active
  activeToday: boolean;
}

// `nowISO` is the reference "today" (injectable for tests). The current streak
// counts back from today; if today isn't logged yet but yesterday is, the streak
// is still considered live (it only breaks once a full day is missed).
export function streakStats(days: string[] | undefined | null, nowISO: string): StreakStats {
  const set = new Set((days ?? []).filter(Boolean));
  const totalDays = set.size;
  if (totalDays === 0) return { current: 0, longest: 0, totalDays: 0, activeToday: false };

  const dayMs = 86_400_000;
  const today = Date.parse(`${nowISO}T00:00:00Z`);
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const activeToday = set.has(nowISO);

  // Current streak: start from today if logged, else yesterday (grace), then
  // walk backwards while consecutive days are present.
  let current = 0;
  let cursor = activeToday ? today : today - dayMs;
  if (set.has(iso(cursor))) {
    while (set.has(iso(cursor))) {
      current += 1;
      cursor -= dayMs;
    }
  }

  // Longest run across the whole sorted history.
  const sorted = [...set].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = Date.parse(`${sorted[i - 1]}T00:00:00Z`);
    const cur = Date.parse(`${sorted[i]}T00:00:00Z`);
    if (cur - prev === dayMs) run += 1;
    else run = 1;
    if (run > longest) longest = run;
  }

  return { current, longest: Math.max(longest, current), totalDays, activeToday };
}
