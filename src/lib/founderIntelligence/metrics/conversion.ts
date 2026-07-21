// Canonical visitor→subscriber conversion — the ONE headline conversion metric
// for the whole platform. Defined once here (owned by the intelligence layer, not
// a dashboard) so the 4 divergent definitions the audit found never reappear.
//
//   conversion = distinct sessions with >=1 signup  ÷  distinct sessions   (windowed)
//
// Session-based and first-party (matches Journey Intelligence's basis). Other
// conversion notions (landing-only, all-time) may still exist elsewhere but must
// be renamed; this is the headline number every module references.

import { sbSelect, supabaseConfigured } from "../../supabase";
import { weekPeriod, priorPeriod, inWindow, compare, type Comparison } from "../period";
import type { Period } from "../types";

const DAY = 86_400_000;

export interface ConversionWindow {
  sessions: number; // distinct sessions in the window
  converters: number; // distinct sessions with >=1 signup
  signupEvents: number; // raw signup events (for "new signups")
  rate: number | null; // converters ÷ sessions, %
}
export interface CanonicalConversion {
  current: ConversionWindow;
  previous: ConversionWindow;
  comparison: Comparison; // rate current vs previous
  available: boolean;
}

interface Row {
  name: string;
  session_id: string | null;
  created_at: string;
}

function windowStats(rows: Row[], period: Period): ConversionWindow {
  const sessions = new Set<string>();
  const converters = new Set<string>();
  let signupEvents = 0;
  for (const r of rows) {
    if (!r.session_id || !inWindow(Date.parse(r.created_at), period)) continue;
    if (r.name === "page_view") sessions.add(r.session_id);
    else if (r.name === "signup") {
      signupEvents += 1;
      converters.add(r.session_id);
      sessions.add(r.session_id); // a signup implies a session, even if the page_view fell outside the fetch
    }
  }
  const s = sessions.size;
  return { sessions: s, converters: converters.size, signupEvents, rate: s > 0 ? Math.round((converters.size / s) * 1000) / 10 : null };
}

// Pure core — deterministic from the event rows + now.
export function computeConversion(rows: Row[], now: number): CanonicalConversion {
  const period = weekPeriod(now);
  const prior = priorPeriod(period);
  const current = windowStats(rows, period);
  const previous = windowStats(rows, prior);
  return { current, previous, comparison: compare(current.rate, previous.rate, 0.05), available: current.sessions > 0 };
}

// Async source — one small, bounded windowed query (14 days of page_view+signup).
export async function canonicalConversion(now: number = Date.now()): Promise<CanonicalConversion> {
  const empty: ConversionWindow = { sessions: 0, converters: 0, signupEvents: 0, rate: null };
  if (!supabaseConfigured) return { current: empty, previous: empty, comparison: compare(null, null), available: false };
  const sinceIso = new Date(now - 14 * DAY).toISOString();
  const rows = await sbSelect<Row[]>(
    `events?select=name,session_id,created_at&name=in.(page_view,signup)&created_at=gte.${sinceIso}&limit=200000`,
  );
  if (rows == null) return { current: empty, previous: empty, comparison: compare(null, null), available: false };
  return computeConversion(rows, now);
}
