// StaticEvidenceClaims — fixed historical conclusions, single-sourced here and
// reusable across questions. The CANONICAL text is what renders (founder-
// reviewed wording); verifyStaticClaims() RECOMPUTES every figure from the
// committed archive / cycle data / protocol constants under each claim's
// pinned definition, and CI fails on any mismatch — so a methodology or
// archive change surfaces as a red build, never as a stale published claim.

import { PRICE_ARCHIVE } from "../../data/priceArchiveData";
import { CYCLES, CURRENT_CYCLE, HALVINGS } from "../../btcData";
import { athDaySharePct } from "./atoms";

export const CLAIMS: Record<string, string> = {
  "post-halving-year":
    "+8,069% (2012), +284% (2016), +559% (2020) and +31% (2024)",
  "first-new-high":
    "After the last three halvings, the first new all-time high came 229, 203 and 200 days later; after the 2012 halving it took just 83 days.",
  "gain-to-peaks":
    "+9,103% (2012 cycle), +2,913% (2016 cycle) and +686% to the November 2021 high (2020 cycle)",
  "peak-timing":
    "In the 2012 cycle the highest close came 371 days after the halving; in 2016, 525 days. In the 2020 cycle the November 2021 high came about 18 months after the halving — though that cycle's single highest close actually came later, in March 2024, weeks before the next halving.",
  "bear-after-peaks":
    "Each completed bull-market peak was followed by a decline of 85% (from December 2013, over 406 days), 84% (from December 2017, over 364 days) and 77% (from November 2021, over 366 days) to the following low.",
  "deepest-drawdown":
    "The deepest fall in the record is 93%, reached in November 2011.",
  "mid-cycle-recoveries":
    "In every completed cycle, price fell at least 35% from a cycle high and later made a new high within the same cycle — including a 71% fall into July 2013 that preceded a new cycle high five months later, and a 53% fall in mid-2021 that preceded the November 2021 high.",
  "peaks-later-exceeded":
    "Every completed cycle's highest close was eventually exceeded in a later cycle.",
  "halving-mechanics":
    "The block reward has fallen from 50 bitcoin at launch to 3.125 today, halving roughly every four years (every 210,000 blocks).",
  "small-sample":
    "Three completed cycles is a very small sample — far too small to treat any of these patterns as a law.",
};

// ── Verification (pinned definitions) ────────────────────────────────────────

interface Check {
  id: string;
  ok: boolean;
  detail: string;
}

const HALVING_DATES = [HALVINGS[2], HALVINGS[3], HALVINGS[4], HALVINGS[5]];
const day = (iso: string): number => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
const daysBetween = (a: string, b: string): number => Math.round(day(b) - day(a));

function closeOn(iso: string): number | null {
  const d = day(iso);
  // Nearest close on/before the date, within a week (weekend/outage tolerance).
  for (let k = 0; k <= 6; k++) {
    const hit = PRICE_ARCHIVE.find((p) => day(p.date) === d - k);
    if (hit) return hit.value;
  }
  return null;
}

const inWindow = (from: string, to: string) => PRICE_ARCHIVE.filter((p) => p.date >= from && p.date < to);
const maxIn = (pts: { date: string; value: number }[]) => pts.reduce((a, b) => (b.value > a.value ? b : a));
const minIn = (pts: { date: string; value: number }[]) => pts.reduce((a, b) => (b.value < a.value ? b : a));
const pct = (fromV: number, toV: number): number => Math.round((toV / fromV - 1) * 100);
const fmtGain = (n: number): string => `+${n.toLocaleString("en-US")}%`;

// The three completed bull-market peaks: the 2012 and 2016 cycles' highest
// closes, and the 2020 cycle's calendar-2021 high (its single highest close
// came later, pre-halving — stated honestly in "peak-timing").
function bullPeaks(): Array<{ peakDate: string; end: string }> {
  const c2 = maxIn(inWindow(HALVING_DATES[0], HALVING_DATES[1]));
  const c3 = maxIn(inWindow(HALVING_DATES[1], HALVING_DATES[2]));
  const c4 = maxIn(PRICE_ARCHIVE.filter((p) => p.date.startsWith("2021")));
  return [
    { peakDate: c2.date, end: HALVING_DATES[1] },
    { peakDate: c3.date, end: HALVING_DATES[2] },
    { peakDate: c4.date, end: HALVING_DATES[3] },
  ];
}

export function verifyStaticClaims(): Check[] {
  const out: Check[] = [];
  const claim = (id: string, expected: string, contains = false) => {
    const canonical = CLAIMS[id] ?? "";
    const ok = contains ? canonical.includes(expected) : canonical === expected;
    out.push({ id, ok, detail: expected });
  };

  // post-halving-year — halving-day close to close 365 days later.
  const yearGains = HALVING_DATES.map((h) => {
    const at = closeOn(h);
    const later = closeOn(new Date((day(h) + 365) * 86_400_000).toISOString().slice(0, 10));
    return at != null && later != null ? pct(at, later) : NaN;
  });
  claim(
    "post-halving-year",
    `${fmtGain(yearGains[0])} (2012), ${fmtGain(yearGains[1])} (2016), ${fmtGain(yearGains[2])} (2020) and ${fmtGain(yearGains[3])} (2024)`,
  );

  // first-new-high — first close above the pre-halving all-time close.
  const athDelays = HALVING_DATES.map((h) => {
    const prior = maxIn(PRICE_ARCHIVE.filter((p) => p.date < h)).value;
    const hit = PRICE_ARCHIVE.find((p) => p.date >= h && p.value > prior);
    return hit ? daysBetween(h, hit.date) : NaN;
  });
  claim(
    "first-new-high",
    `After the last three halvings, the first new all-time high came ${athDelays[1]}, ${athDelays[2]} and ${athDelays[3]} days later; after the 2012 halving it took just ${athDelays[0]} days.`,
  );

  // gain-to-peaks — halving close to the bull peak's close.
  const peaks = bullPeaks();
  const gains = peaks.map(({ peakDate }, i) => {
    const at = closeOn(HALVING_DATES[i]);
    const pk = closeOn(peakDate);
    return at != null && pk != null ? pct(at, pk) : NaN;
  });
  claim(
    "gain-to-peaks",
    `${fmtGain(gains[0])} (2012 cycle), ${fmtGain(gains[1])} (2016 cycle) and ${fmtGain(gains[2])} to the November 2021 high (2020 cycle)`,
  );

  // peak-timing — days from halving to each cycle's highest close, plus the
  // 2020-cycle nuance: Nov-2021 high ~18 months (500–580 days), absolute
  // highest close in March 2024.
  const t2 = daysBetween(HALVING_DATES[0], maxIn(inWindow(HALVING_DATES[0], HALVING_DATES[1])).date);
  const t3 = daysBetween(HALVING_DATES[1], maxIn(inWindow(HALVING_DATES[1], HALVING_DATES[2])).date);
  const nov21 = daysBetween(HALVING_DATES[2], peaks[2].peakDate);
  const c4abs = maxIn(inWindow(HALVING_DATES[2], HALVING_DATES[3])).date;
  claim("peak-timing", `${t2} days after the halving; in 2016, ${t3} days`, true);
  out.push({ id: "peak-timing/nov21", ok: nov21 >= 500 && nov21 <= 580 && peaks[2].peakDate.startsWith("2021-11"), detail: `Nov-2021 high ${nov21} days after halving` });
  out.push({ id: "peak-timing/march24", ok: c4abs.startsWith("2024-03") && CLAIMS["peak-timing"].includes("March 2024"), detail: `2020-cycle absolute peak close ${c4abs}` });

  // bear-after-peaks — each bull peak's close to the lowest close before the
  // next halving.
  const bears = peaks.map(({ peakDate, end }) => {
    const pk = closeOn(peakDate)!;
    const lows = PRICE_ARCHIVE.filter((p) => p.date > peakDate && p.date < end);
    const lo = minIn(lows);
    return { drop: Math.abs(pct(pk, lo.value)), days: daysBetween(peakDate, lo.date) };
  });
  claim(
    "bear-after-peaks",
    `Each completed bull-market peak was followed by a decline of ${bears[0].drop}% (from December 2013, over ${bears[0].days} days), ${bears[1].drop}% (from December 2017, over ${bears[1].days} days) and ${bears[2].drop}% (from November 2021, over ${bears[2].days} days) to the following low.`,
  );

  // deepest-drawdown — deepest running-peak drawdown over the full archive.
  let runPeak = 0;
  let worst = 0;
  let worstDate = "";
  for (const p of PRICE_ARCHIVE) {
    if (p.value > runPeak) runPeak = p.value;
    const dd = (p.value / runPeak - 1) * 100;
    if (dd < worst) {
      worst = dd;
      worstDate = p.date;
    }
  }
  claim("deepest-drawdown", `The deepest fall in the record is ${Math.abs(Math.round(worst))}%, reached in November 2011.`);
  out.push({ id: "deepest-drawdown/date", ok: worstDate.startsWith("2011-11"), detail: worstDate });

  // mid-cycle-recoveries — per completed cycle, the deepest running-peak
  // drawdown strictly BEFORE the cycle's highest-close date; all ≥35%, with
  // the two cited examples recomputed.
  const mids = [0, 1, 2].map((i) => {
    const seg = inWindow(HALVING_DATES[i], HALVING_DATES[i + 1]);
    const finalHighDate = maxIn(seg).date;
    let rp = 0;
    let w = 0;
    for (const p of seg) {
      if (p.date >= finalHighDate) break;
      if (p.value > rp) rp = p.value;
      w = Math.min(w, (p.value / rp - 1) * 100);
    }
    return Math.abs(Math.round(w));
  });
  const july13 = mids[0];
  const hi21 = maxIn(PRICE_ARCHIVE.filter((p) => p.date >= "2021-01-01" && p.date <= "2021-08-01"));
  const lo21 = minIn(PRICE_ARCHIVE.filter((p) => p.date > hi21.date && p.date <= "2021-08-01"));
  const fall21 = Math.abs(pct(hi21.value, lo21.value));
  out.push({ id: "mid-cycle-recoveries/floor", ok: mids.every((m) => m >= 35), detail: `deepest pre-high drawdowns ${mids.join(", ")}%` });
  claim("mid-cycle-recoveries", `including a ${july13}% fall into July 2013`, true);
  claim("mid-cycle-recoveries", `a ${fall21}% fall in mid-2021`, true);

  // peaks-later-exceeded — every completed cycle's max close later exceeded.
  const exceeded = [0, 1, 2].every((i) => {
    const pk = maxIn(inWindow(HALVING_DATES[i], HALVING_DATES[i + 1])).value;
    return PRICE_ARCHIVE.some((p) => p.date >= HALVING_DATES[i + 1] && p.value > pk);
  });
  out.push({ id: "peaks-later-exceeded", ok: exceeded, detail: "each completed cycle's peak exceeded later" });

  // halving-mechanics — protocol constants: 50 / 2^4 = 3.125 for the current
  // (fifth-reward-era) cycle.
  out.push({
    id: "halving-mechanics",
    ok: CURRENT_CYCLE.rewardBtc === 3.125 && CLAIMS["halving-mechanics"].includes("3.125") && CLAIMS["halving-mechanics"].includes("210,000"),
    detail: `current reward ${CURRENT_CYCLE.rewardBtc}`,
  });

  // small-sample — "three completed cycles" stays true only while three
  // cycles have actually completed; a fourth completing must force review.
  const completed = CYCLES.filter((c) => c.endDate && c.endDate <= (PRICE_ARCHIVE[PRICE_ARCHIVE.length - 1]?.date ?? "")).length;
  out.push({ id: "small-sample", ok: completed === 3, detail: `${completed} completed cycles` });

  // athSharePct atom sanity — one decimal, plausible bounds.
  const share = athDaySharePct();
  out.push({ id: "atom/athSharePct", ok: share > 0 && share < 20, detail: `${share}%` });

  return out;
}
