// The Founder Intelligence composer — assembles ONE versioned, structured feed
// from the registered modules + the WEAS North Star. This is what every consumer
// reads: the Executive dashboard, Growth OS, Founder reports, and the AI Review
// Feed / future MCP/ChatGPT connector. Missing modules appear as explicit
// `not_implemented` stubs — never empty data dressed up as real.

import { weekPeriod } from "./period";
import { weasNorthStar } from "./northStar";
import { factToDataQuality, dedupeDataQuality } from "./dataQuality";
import {
  FOUNDER_INTELLIGENCE_SCHEMA_VERSION,
  type Confidence,
  type DataQualityNote,
  type FounderIntelligenceFeed,
  type FounderReview,
  type IntelligenceModule,
  type ModuleProvider,
  type ModuleStub,
  type NorthStar,
  type Recommendation,
} from "./types";

// The Phase-1 module registry. In PR2 the `planned` stubs are replaced with real
// `build` functions — the composer and every consumer stay unchanged.
export const PHASE1_PROVIDERS: ModuleProvider[] = [
  { moduleId: "growth", moduleName: "Growth Intelligence", planned: { status: "not_implemented", reason: "Arrives in Phase 1 · PR2" } },
  { moduleId: "journeys", moduleName: "Journey Intelligence", planned: { status: "not_implemented", reason: "Arrives in Phase 1 · PR2" } },
  { moduleId: "daily_briefs", moduleName: "Daily Brief Intelligence", planned: { status: "not_implemented", reason: "Arrives in Phase 1 · PR2" } },
];

const IMPACT_RANK = { high: 3, medium: 2, low: 1 } as const;
const CONF_RANK: Record<Confidence, number> = { high: 3, medium: 2, early: 1, insufficient: 0 };
const EFFORT_RANK = { low: 3, medium: 2, high: 1 } as const;

// Rank recommendations: impact, then confidence, then lower effort first.
export function rankRecommendations(recs: Recommendation[]): Recommendation[] {
  return [...recs].sort(
    (a, b) =>
      IMPACT_RANK[b.expectedImpact] - IMPACT_RANK[a.expectedImpact] ||
      CONF_RANK[b.confidence] - CONF_RANK[a.confidence] ||
      EFFORT_RANK[b.effort] - EFFORT_RANK[a.effort],
  );
}

function isModule(m: IntelligenceModule | ModuleStub): m is IntelligenceModule {
  return (m as IntelligenceModule).status === "ok";
}

// Build the concise Founder Review — one prioritised action, evidence-backed.
export function buildFounderReview(northStar: NorthStar, modules: (IntelligenceModule | ModuleStub)[], ranked: Recommendation[]): FounderReview {
  const okModules = modules.filter(isModule) as IntelligenceModule[];
  const improved: string[] = [];
  const deteriorated: string[] = [];

  // North Star movement leads.
  if (northStar.value != null && northStar.previousValue != null) {
    const line = `WEAS ${northStar.previousValue} → ${northStar.value}`;
    if (northStar.trend === "up") improved.push(line);
    else if (northStar.trend === "down") deteriorated.push(line);
  }
  // Notable module facts.
  for (const m of okModules) {
    for (const f of m.facts) {
      if (f.trend === "up" && f.pctChange != null && f.pctChange >= 5) improved.push(`${f.label} ${f.pctChange > 0 ? "+" : ""}${f.pctChange}%`);
      if (f.trend === "down" && f.pctChange != null && f.pctChange <= -5) deteriorated.push(`${f.label} ${f.pctChange}%`);
    }
  }

  const opportunities = okModules.flatMap((m) => m.opportunities);
  const risks = okModules.flatMap((m) => m.risks);
  const top = ranked[0] ?? null;

  const nsStatus =
    northStar.value == null
      ? `WEAS unavailable — ${northStar.coverage}`
      : `WEAS ${northStar.value}${northStar.rate != null ? ` (${northStar.rate}% of active subscribers)` : ""}, ${northStar.trend} vs the prior week · ${northStar.confidence} confidence${northStar.isLowerBound ? " · confirmed lower bound" : ""}`;

  const verdict =
    northStar.value == null
      ? "Not enough connected instrumentation yet to issue a verdict — see data-quality notes."
      : okModules.length === 0
        ? `North Star tracked (WEAS ${northStar.value}); domain modules arrive in PR2. Feed is live and consumable now.`
        : `${ranked.length} evidence-backed recommendation${ranked.length === 1 ? "" : "s"} this week; lead with the prioritised action below.`;

  return {
    verdict,
    northStarStatus: nsStatus,
    improved,
    deteriorated,
    topOpportunity: opportunities[0] ?? null,
    topRisk: risks[0] ?? null,
    recommendedAction: top,
    evidence: top ? top.evidence : northStar.notes.join(" "),
    confidence: top ? top.confidence : northStar.confidence,
    dataQualityNotes: northStar.notes,
  };
}

export async function composeFeed(now: number = Date.now(), providers: ModuleProvider[] = PHASE1_PROVIDERS): Promise<FounderIntelligenceFeed> {
  const period = weekPeriod(now);
  const northStar = await weasNorthStar(now);

  const modulesArr: (IntelligenceModule | ModuleStub)[] = await Promise.all(
    providers.map(async (p): Promise<IntelligenceModule | ModuleStub> => {
      if (p.build) {
        try {
          return await p.build(period, now);
        } catch {
          return { moduleId: p.moduleId, moduleName: p.moduleName, status: "unavailable", reason: "Module failed to build this refresh." };
        }
      }
      const planned = p.planned ?? { status: "not_implemented" as const, reason: "Not yet implemented." };
      return { moduleId: p.moduleId, moduleName: p.moduleName, status: planned.status, reason: planned.reason };
    }),
  );

  const modules: Record<string, IntelligenceModule | ModuleStub> = {};
  for (const m of modulesArr) modules[m.moduleId] = m;

  const okModules = modulesArr.filter(isModule) as IntelligenceModule[];
  const ranked = rankRecommendations(okModules.flatMap((m) => m.recommendations));
  const risks = okModules.flatMap((m) => m.risks);
  const opportunities = okModules.flatMap((m) => m.opportunities);
  const dataQuality: DataQualityNote[] = dedupeDataQuality([
    ...okModules.flatMap((m) => m.dataQuality),
    ...okModules.flatMap((m) => m.facts.map(factToDataQuality)),
    {
      metric: "weekly_engaged_active_subscribers",
      source: "events (email_click, recognised on-site actions), brief_subscribers",
      observability: northStar.value == null ? "unavailable" : "partial",
      identityCoverage: northStar.identityCoverage,
      coverageStart: null,
      limitation: northStar.isLowerBound ? "Confirmed lower bound — anonymous browsing and provider-reported opens are excluded." : null,
      confidence: northStar.confidence,
      definitionVersion: northStar.definitionVersion,
    },
  ]);

  const review = buildFounderReview(northStar, modulesArr, ranked);

  return {
    schemaVersion: FOUNDER_INTELLIGENCE_SCHEMA_VERSION,
    generatedAt: new Date(now).toISOString(),
    period,
    northStar,
    modules,
    recommendations: ranked,
    risks,
    opportunities,
    dataQuality,
    review,
  };
}
