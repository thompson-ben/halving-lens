// The live-block registry (PR-Q1) — BlockId → an existing HalvingLens
// component. The questions layer OWNS NO DATA and duplicates NO ANALYSIS:
// every block renders the same component (or the same engine read) its home
// page renders. Each block declares a probe so the template can degrade a
// stale/failed source to a calm unavailable card without taking the page
// down (commission §3), and a home link so every block is also a doorway.

import type { ReactNode } from "react";
import { TodaysConfigurationCard } from "@/components/TodaysConfigurationCard";
import { AccumulationIndexModule } from "@/components/AccumulationIndexModule";
import { CycleScorecard } from "@/components/CycleScorecard";
import { DownsidePreview } from "@/components/DownsidePreview";
import { SimilarMomentsExplorer } from "@/components/SimilarMomentsExplorer";
import { MarketHealthTimelineChart } from "@/components/MarketHealthTimelineChart";
import { todaysConfigurationPack } from "@/lib/fourReferencePrices";
import { accumulationRead } from "@/lib/accumulation";
import { cycleScorecard } from "@/lib/cycleSummary";
import { drawdownAnalysis } from "@/lib/drawdowns";
import { similarMoments } from "@/lib/similarity";
import { marketHealthRead } from "@/lib/marketHealth";
import { SOURCE } from "@/lib/btcData";
import type { BlockId } from "./types";

export interface BlockProbe {
  ok: boolean;
  /** Last reliable data date for the unavailable card (best effort). */
  lastDate: string | null;
}

export interface BlockDef {
  id: BlockId;
  label: string;
  homeHref: string;
  homeLabel: string;
  probe: () => BlockProbe;
  render: () => ReactNode;
}

const snapshotDate = (): string | null => SOURCE.fetchedAt?.slice(0, 10) ?? null;

// Probes never throw — a crashing source reads as unavailable, not as a
// broken page.
const safe = (fn: () => BlockProbe): BlockProbe => {
  try {
    return fn();
  } catch {
    return { ok: false, lastDate: null };
  }
};

export const QUESTION_BLOCKS: Record<BlockId, BlockDef> = {
  "todays-configuration": {
    id: "todays-configuration",
    label: "Today's Configuration",
    homeHref: "/four-reference-prices",
    homeLabel: "Four Reference Prices",
    probe: () => safe(() => ({ ok: todaysConfigurationPack().available, lastDate: snapshotDate() })),
    render: () => <TodaysConfigurationCard />,
  },
  "accumulation-index": {
    id: "accumulation-index",
    label: "Accumulation Index",
    homeHref: "/accumulation",
    homeLabel: "Accumulation Index",
    probe: () =>
      safe(() => {
        const r = accumulationRead();
        return { ok: r != null && Number.isFinite(r.score), lastDate: r?.date ?? snapshotDate() };
      }),
    render: () => <AccumulationIndexModule />,
  },
  "similar-moments-preview": {
    id: "similar-moments-preview",
    label: "Similar Moments",
    homeHref: "/similar-moments",
    homeLabel: "Similar Moments",
    probe: () => safe(() => ({ ok: similarMoments(3).length > 0, lastDate: snapshotDate() })),
    render: () => <SimilarMomentsExplorer limit={3} />,
  },
  "market-health": {
    id: "market-health",
    label: "Market Health",
    homeHref: "/market-health",
    homeLabel: "Market Health",
    probe: () =>
      safe(() => {
        const h = marketHealthRead();
        return {
          ok: h.timeline.length > 0,
          lastDate: h.timeline.length
            ? new Date(h.timeline[h.timeline.length - 1].ts).toISOString().slice(0, 10)
            : snapshotDate(),
        };
      }),
    render: () => {
      const h = marketHealthRead();
      return (
        <div>
          <p className="text-[12.5px] text-ink-300 leading-relaxed mb-3">
            Composite health reads <span className="text-ink-100">{h.score}/100 — {h.label}</span>, tracked daily across
            the published record.
          </p>
          <MarketHealthTimelineChart data={h.timeline} height={280} />
        </div>
      );
    },
  },
  "cycle-scorecard": {
    id: "cycle-scorecard",
    label: "Cycle Scorecard",
    homeHref: "/cycles",
    homeLabel: "Cycle comparison",
    probe: () => safe(() => ({ ok: cycleScorecard() != null, lastDate: snapshotDate() })),
    render: () => <CycleScorecard />,
  },
  "downside-context": {
    id: "downside-context",
    label: "Drawdown Context",
    homeHref: "/historical-price-paths",
    homeLabel: "Historical Price Paths",
    probe: () => safe(() => ({ ok: drawdownAnalysis().available, lastDate: snapshotDate() })),
    render: () => <DownsidePreview />,
  },
};
