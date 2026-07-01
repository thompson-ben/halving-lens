// Computes live results for every experiment from the first-party events store:
// per-variant visitors, conversions, conversion rate, lift, and a real
// statistical-confidence figure (two-proportion z-test). No fabricated numbers.

import { sbSelect } from "./supabase";
import { allExperiments, type ExperimentSpec } from "./data/experimentRegistry";

export interface VariantResult {
  key: string;
  label: string;
  visitors: number;
  conversions: number;
  conversionRate: number | null; // %
}

export interface ExperimentResult {
  spec: ExperimentSpec;
  results: VariantResult[];
  controlKey: string;
  bestKey: string | null;
  liftPct: number | null; // best vs control
  confidence: number | null; // % (two-proportion z-test, best vs control)
  significant: boolean; // confidence >= 95
  totalVisitors: number;
}

// Abramowitz–Stegun erf, → normal CDF, → two-sided confidence.
function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
function confidenceFor(c1: number, n1: number, c2: number, n2: number): number | null {
  if (n1 < 1 || n2 < 1) return null;
  const p1 = c1 / n1;
  const p2 = c2 / n2;
  const pPool = (c1 + c2) / (n1 + n2);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
  if (se === 0) return null;
  const z = Math.abs((p2 - p1) / se);
  const conf = (2 * (0.5 * (1 + erf(z / Math.SQRT2))) - 1) * 100; // two-sided
  return Math.round(conf * 10) / 10;
}

export async function experimentResults(): Promise<ExperimentResult[]> {
  const specs = allExperiments();
  const [views, signups] = await Promise.all([
    sbSelect<{ props: Record<string, unknown> | null }[]>("events?select=props&name=eq.landing_view&limit=50000"),
    sbSelect<{ props: Record<string, unknown> | null }[]>("events?select=props&name=eq.signup&limit=50000"),
  ]);
  const tally = (rows: { props: Record<string, unknown> | null }[] | null, keys: string[], propKey: string) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) {
      const v = String(r.props?.[propKey] ?? "");
      if (keys.includes(v)) m.set(v, (m.get(v) ?? 0) + 1);
    }
    return m;
  };

  return specs.map((spec) => {
    const keys = spec.variants.map((v) => v.key);
    const propKey = spec.measure === "campaign" ? "utm_campaign" : "variant";
    const vMap = tally(views, keys, propKey);
    const cMap = tally(signups, keys, propKey);
    const results: VariantResult[] = spec.variants.map((v) => {
      const visitors = vMap.get(v.key) ?? 0;
      const conversions = cMap.get(v.key) ?? 0;
      return { key: v.key, label: v.label, visitors, conversions, conversionRate: visitors > 0 ? Math.round((conversions / visitors) * 1000) / 10 : null };
    });
    const controlKey = spec.variants[0].key;
    const control = results.find((r) => r.key === controlKey)!;
    const challengers = results.filter((r) => r.key !== controlKey && r.conversionRate != null);
    const best = challengers.sort((a, b) => (b.conversionRate ?? 0) - (a.conversionRate ?? 0))[0] ?? null;
    const liftPct =
      best && control.conversionRate != null && control.conversionRate > 0
        ? Math.round(((best.conversionRate! - control.conversionRate) / control.conversionRate) * 1000) / 10
        : null;
    const confidence = best ? confidenceFor(control.conversions, control.visitors, best.conversions, best.visitors) : null;
    const significant = confidence != null && confidence >= 95;
    return {
      spec,
      results,
      controlKey,
      bestKey: best?.key ?? null,
      liftPct,
      confidence,
      significant,
      totalVisitors: results.reduce((s, r) => s + r.visitors, 0),
    };
  });
}
