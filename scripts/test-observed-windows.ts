// Deterministic tests for PR141 — the observed-window registry.
// Invariant-based (never date-literal) so the daily snapshot commit can't
// break CI: the registry must faithfully mirror whatever the committed
// snapshot actually holds. Run: npm run test-observed-windows

import { SNAPSHOT } from "../src/lib/data/snapshot";
import { observedWindows, seriesWindow, intersectWindows } from "../src/lib/data/observedWindows";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };

const all = observedWindows();
const NATURES = new Set(["observed", "derived", "estimated", "synthetic"]);

// ── Well-formedness ──────────────────────────────────────────────────────────

assert(all.length >= 13, `registry covers the audited series (${all.length} registered)`);
assert(new Set(all.map((w) => w.id)).size === all.length, "series ids are unique");
assert(all.every((w) => NATURES.has(w.nature)), "every nature is a valid classification");
assert(
  all.every((w) => (w.points > 0) === (w.firstObserved != null && w.lastObserved != null)),
  "dates are present exactly when points exist",
);
assert(
  all.every((w) => w.firstObserved == null || w.lastObserved == null || w.firstObserved <= w.lastObserved),
  "firstObserved never exceeds lastObserved",
);
assert(
  all.every((w) => !w.firstObserved || /^\d{4}-\d{2}-\d{2}$/.test(w.firstObserved)),
  "dates are ISO yyyy-mm-dd",
);

// ── Faithfulness to the snapshot (spot checks on the key series) ─────────────

{
  const rp = seriesWindow("realizedPrice");
  const raw = SNAPSHOT.onchain?.series?.realizedPrice ?? [];
  assert(!!rp && rp.points === raw.length, "realised-price window matches the archive point count");
  assert(!!rp && rp.firstObserved === (raw[0]?.date ?? null), "realised-price floor matches the archive's first point");
  assert(!!rp && rp.nature === "observed", "realised price is classified observed");
}
{
  const mc = seriesWindow("miningCost");
  const raw = SNAPSHOT.productionCost?.points ?? [];
  assert(!!mc && mc.points === raw.length && mc.firstObserved === (raw[0]?.date ?? null), "mining-cost window matches the model series");
  assert(!!mc && mc.nature === "estimated", "Estimated Mining Cost is classified estimated — never observed");
}
{
  const ma = seriesWindow("ma200");
  const price = seriesWindow("price-daily");
  assert(!!ma && ma.nature === "derived", "200DMA is classified derived");
  assert(
    !!ma && !!price && (ma.points === 0 || ma.points === Math.max(0, price.points - 199)),
    "200DMA window accounts for its 200-day warm-up",
  );
}
assert(seriesWindow("price-weekly")?.nature === "observed", "weekly price is observed");
assert(seriesWindow("nonexistent-series") === null, "unknown ids resolve to null, never a guess");

// No registered series may claim prior-cycle on-chain history — the synthetic
// fallback must be unreachable through the registry.
{
  const rp = seriesWindow("realizedPrice");
  const firstCycleStart = SNAPSHOT.cycles[0]?.halvingDate ?? "2012-11-28";
  assert(
    !!rp && (rp.firstObserved == null || rp.firstObserved > firstCycleStart),
    "registry never exposes synthetic prior-cycle realised-price history",
  );
}

// ── Intersection (the Four Reference Prices consumer) ────────────────────────

{
  const frp = intersectWindows(["price-daily", "ma200", "realizedPrice", "miningCost"]);
  const rp = seriesWindow("realizedPrice");
  if (rp && rp.points > 0 && frp) {
    assert(frp.first >= rp.firstObserved!, "full-configuration window starts no earlier than the narrowest series");
    assert(frp.first <= frp.last, "full-configuration window is coherent");
    console.log(`  info  full-configuration window today: ${frp.first} → ${frp.last}`);
  } else {
    assert(frp === null, "intersection is null when a series is absent");
  }
  assert(intersectWindows(["price-daily", "nonexistent-series"]) === null, "intersection with an unknown series is null");
}

console.log(failures === 0 ? "\nAll observed-window tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
