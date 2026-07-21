// Journey Intelligence — wraps the existing Visitor Journey system (the richest
// business aggregator) into the module contract. It reuses journeyAnalytics'
// established calculations, opportunities and insights verbatim; it does NOT
// rebuild them. Canonical conversion comes from the shared context so there is
// one conversion number platform-wide.

import { journeyAnalytics, type JourneyAnalytics, type JourneyInsight, type GrowthOpportunity, type PeriodComparison } from "../../journeyAnalytics";
import { comparedFact, mkRecommendation, reviewOn } from "./factory";
import { minConfidence } from "../confidence";
import type { Confidence, Fact, IntelligenceItem, IntelligenceModule, Period, Recommendation, SharedContext } from "../types";

const MODULE_ID = "journeys";
const MODULE_NAME = "Journey Intelligence";

// journeyAnalytics uses high|medium|low; map to the shared 4-level framework.
function mapConf(c: "high" | "medium" | "low" | undefined): Confidence {
  return c === "high" ? "high" : c === "medium" ? "medium" : c === "low" ? "early" : "insufficient";
}
function mapTone(t: JourneyInsight["tone"]): IntelligenceItem["tone"] {
  return t === "good" ? "good" : t === "warn" ? "warn" : "info";
}

export function mapJourney(j: JourneyAnalytics, period: Period, now: number, shared: SharedContext): IntelligenceModule {
  const cmp7: PeriodComparison | undefined = j.comparisons.find((c) => c.label.toLowerCase().startsWith("last 7")) ?? j.comparisons[1];
  const cur = cmp7?.current;
  const prev = cmp7?.previous;
  const n = cur?.sessions ?? j.kpis.sessions;
  const conv = shared.conversion;

  const facts: Fact[] = [
    comparedFact({ key: "sessions_7d", label: "Sessions (7d)", unit: "count", value: cur?.sessions ?? null, previous: prev?.sessions ?? null, sampleSize: cur?.sessions ?? null, definition: "Distinct visitor sessions in the last 7 days.", sources: ["events"] }),
    comparedFact({ key: "value_discovery_rate", label: "Value Discovery Rate", unit: "pct", value: cur?.valueDiscoveryRate ?? j.valueDiscovery.reachedPct, previous: prev?.valueDiscoveryRate ?? null, sampleSize: cur?.sessions ?? null, definition: "% of sessions reaching a flagship page before leaving.", sources: ["events"] }),
    comparedFact({ key: "explorer_rate", label: "Explorer Rate", unit: "pct", value: cur?.explorerRate ?? j.kpis.explorerRate, previous: prev?.explorerRate ?? null, sampleSize: cur?.sessions ?? null, definition: "% of sessions viewing ≥3 unique pages.", sources: ["events"] }),
    comparedFact({ key: "conversion_rate", label: "Visitor→subscriber conversion", unit: "pct", value: conv.current.rate, previous: conv.previous.rate, sampleSize: conv.current.sessions, observability: conv.available ? "observed" : "unavailable", definition: "Distinct converting sessions ÷ distinct sessions, 7d (canonical, shared).", sources: ["events"] }),
    comparedFact({ key: "journey_depth", label: "Avg journey depth", unit: "ratio", value: cur?.avgDepth ?? j.kpis.avgJourneyDepth, previous: prev?.avgDepth ?? null, sampleSize: cur?.sessions ?? null, definition: "Mean unique pages per session.", sources: ["events"] }),
    comparedFact({ key: "lost_visitor_rate", label: "Lost-visitor rate", unit: "pct", value: cur?.lostPct ?? j.exitOutcomes.lostPct, previous: prev?.lostPct ?? null, sampleSize: cur?.sessions ?? null, definition: "% of sessions leaving without ever subscribing.", sources: ["events"] }),
  ];

  // Intelligence: reuse journeyAnalytics insights + the value-discovery lift.
  const intelligence: IntelligenceItem[] = j.insights.map((ins, i) => ({
    id: `journey-insight-${i}`,
    category: "journey" as const,
    tone: mapTone(ins.tone),
    statement: ins.text,
    factKeys: ["value_discovery_rate", "conversion_rate", "lost_visitor_rate", "explorer_rate"],
    evidence: ins.impact ? `Estimated impact: ${ins.impact}.` : "Derived from this week's journey data.",
    confidence: mapConf(ins.confidence),
  }));
  if (j.valueDiscovery.liftX != null) {
    intelligence.unshift({
      id: "journey-value-lift",
      category: "journey",
      tone: "good",
      statement: `Subscribers who reach flagship content convert ${j.valueDiscovery.liftX}× more often (${j.valueDiscovery.convReachedPct}% vs ${j.valueDiscovery.convNotReachedPct}%).`,
      factKeys: ["value_discovery_rate", "conversion_rate"],
      evidence: `${j.valueDiscovery.reached} of ${j.valueDiscovery.sessions} sessions reached flagship content this period.`,
      confidence: mapConf(undefined) === "insufficient" ? (j.valueDiscovery.reached >= 30 ? "high" : j.valueDiscovery.reached >= 10 ? "medium" : "early") : "medium",
    });
  }

  // Decisions: reuse journeyAnalytics opportunities (skip the "healthy" callout).
  const recommendations: Recommendation[] = j.opportunities
    .filter((o: GrowthOpportunity) => o.level !== "healthy")
    .slice(0, 3)
    .map((o) =>
      mkRecommendation({
        id: `journey-opp-${o.path.replace(/[^a-z0-9]+/gi, "-")}`,
        title: `Improve onward journeys from ${o.label}`,
        module: MODULE_ID,
        intelligenceKeys: ["journey-value-lift"],
        observed: o.evidence,
        whyItMatters: "Deeper journeys reach flagship content, which converts far better — feeding WEAS at the top of the funnel.",
        evidence: `${o.evidence} Modeled impact ≈ +${o.estSubsPerMonth} subscribers/month (estimate, for prioritising).`,
        sampleSize: n,
        confidence: mapConf(o.confidence),
        expectedImpact: o.level === "high" ? "high" : "medium",
        effort: "medium",
        weasRelationship: "increase",
        guardrails: ["unsubscribe rate", "bounce rate", "subscriber quality (WEAS rate)"],
        action: o.recommendation,
        successMetric: "Higher onward-navigation and Value Discovery Rate from this page, lifting conversion — no rise in unsubscribes.",
        measurementWindow: "4 weeks",
        reviewOn: reviewOn(now, 4),
      }),
    );

  const confidence = minConfidence(...facts.map((f) => f.confidence));
  return {
    moduleId: MODULE_ID,
    moduleName: MODULE_NAME,
    schemaVersion: "1.0",
    status: "ok",
    reason: null,
    period,
    refreshedAt: new Date(now).toISOString(),
    facts,
    intelligence,
    recommendations,
    risks: (j.exitOutcomes.lostPct ?? 0) >= 60 ? [`${j.exitOutcomes.lostPct}% of sessions leave without subscribing.`] : [],
    opportunities: j.opportunities.filter((o) => o.level !== "healthy").map((o) => `${o.label}: est +${o.estSubsPerMonth}/mo`),
    operationalWarnings: [],
    dataQuality: [],
    sources: ["journeyAnalytics", "events"],
    sampleSize: n,
    confidence,
  };
}

export async function journeyModule(period: Period, now: number, shared: SharedContext): Promise<IntelligenceModule> {
  const j = await journeyAnalytics();
  if (!j.configured) {
    return {
      moduleId: MODULE_ID,
      moduleName: MODULE_NAME,
      schemaVersion: "1.0",
      status: "unavailable",
      reason: "Journey analytics not configured — connect Supabase to enable Journey Intelligence.",
      period,
      refreshedAt: new Date(now).toISOString(),
      facts: [],
      intelligence: [],
      recommendations: [],
      risks: [],
      opportunities: [],
      operationalWarnings: [],
      dataQuality: [],
      sources: ["journeyAnalytics"],
      sampleSize: null,
      confidence: "insufficient",
    };
  }
  return mapJourney(j, period, now, shared);
}
