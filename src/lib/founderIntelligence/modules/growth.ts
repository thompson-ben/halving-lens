// Growth Intelligence — subscriber growth, conversion (canonical), acquisition
// quality and the WEAS North Star, as one contract-shaped module. It WRAPS the
// existing aggregators (growthDashboard, subscriberStats, acquisitionQuality)
// and the shared canonical conversion + North Star — it does not re-query.

import { growthDashboard, subscriberStats } from "../../analytics";
import { acquisitionQuality } from "../../acquisitionAnalytics";
import { confidenceFrom, minConfidence } from "../confidence";
import { comparedFact, mkFact, mkRecommendation, reviewOn } from "./factory";
import type { Fact, IntelligenceItem, IntelligenceModule, Period, Recommendation, SharedContext } from "../types";

const MODULE_ID = "growth";
const MODULE_NAME = "Growth Intelligence";

interface GrowthInputs {
  dash: Awaited<ReturnType<typeof growthDashboard>>;
  subs: Awaited<ReturnType<typeof subscriberStats>>;
  acq: Awaited<ReturnType<typeof acquisitionQuality>>;
}

// Pure mapper — deterministic from the fetched inputs + shared context.
export function mapGrowth(i: GrowthInputs, period: Period, now: number, shared: SharedContext): IntelligenceModule {
  const { dash, subs, acq } = i;
  const ns = shared.northStar;
  const conv = shared.conversion;
  const facts: Fact[] = [];
  const intelligence: IntelligenceItem[] = [];
  const recommendations: Recommendation[] = [];
  const risks: string[] = [];
  const opportunities: string[] = [];

  // WEAS (the North Star) surfaced here as the primary growth fact.
  facts.push(
    mkFact({
      key: "weas",
      label: "Weekly Engaged Active Subscribers",
      unit: "count",
      value: ns.value,
      previous: ns.previousValue,
      absChange: ns.change,
      pctChange: ns.previousValue ? Math.round(((ns.change ?? 0) / ns.previousValue) * 1000) / 10 : null,
      trend: ns.trend,
      sampleSize: ns.value,
      observability: ns.value == null ? "unavailable" : "partial",
      confidence: ns.confidence,
      definition: "Distinct subscribers with a confirmed first-party engagement this week (see WEAS v1).",
      definitionVersion: ns.definitionVersion,
      identityCoverage: ns.identityCoverage,
      sources: ["events", "brief_subscribers"],
      notes: ns.isLowerBound ? "Confirmed lower bound — anonymous browsing and provider opens excluded." : null,
    }),
  );

  // Canonical conversion (single definition, shared).
  facts.push(
    comparedFact({
      key: "conversion_rate",
      label: "Visitor→subscriber conversion",
      unit: "pct",
      value: conv.current.rate,
      previous: conv.previous.rate,
      sampleSize: conv.current.sessions,
      observability: conv.available ? "observed" : "unavailable",
      definition: "Distinct sessions with ≥1 signup ÷ distinct sessions, last 7 days (canonical).",
      sources: ["events"],
    }),
  );

  // New signups this week (WoW).
  facts.push(
    comparedFact({
      key: "new_signups_7d",
      label: "New signups (7d)",
      unit: "count",
      value: conv.current.signupEvents,
      previous: conv.previous.signupEvents,
      sampleSize: conv.current.signupEvents,
      observability: conv.available ? "observed" : "unavailable",
      definition: "Signup events in the last 7 days vs the prior 7.",
      sources: ["events"],
    }),
  );

  // Active subscriber base + all-time signups (level facts, no prior series).
  facts.push(
    mkFact({
      key: "active_subscribers",
      label: "Active subscribers",
      unit: "count",
      value: subs.active,
      sampleSize: subs.active,
      observability: subs.active == null ? "unavailable" : "observed",
      confidence: subs.active != null ? "high" : "insufficient",
      definition: "Subscribers with status active/null (not unsubscribed).",
      sources: ["brief_subscribers"],
    }),
  );
  facts.push(
    mkFact({
      key: "total_signups",
      label: "Total signups (all-time)",
      unit: "count",
      value: dash.totals.signups,
      sampleSize: dash.totals.signups,
      observability: "observed",
      confidence: "high",
      definition: "All signup events recorded.",
      sources: ["events"],
    }),
  );

  // Acquisition cost (paid), where spend is configured.
  const cpe = acq.configured ? acq.costPerEngagedUser : null;
  facts.push(
    mkFact({
      key: "cost_per_engaged_subscriber",
      label: "Cost per engaged subscriber (paid)",
      unit: "gbp",
      value: cpe,
      observability: acq.configured && acq.totalSpend > 0 ? "observed" : "unavailable",
      confidence: acq.configured && acq.totalSpend > 0 ? "medium" : "insufficient",
      definition: "Paid spend ÷ engaged users from paid campaigns.",
      sources: ["events", "adSpend"],
      notes: acq.configured ? null : "Ad spend not configured — set it in adSpend.ts to enable acquisition-cost intelligence.",
    }),
  );

  // ── Intelligence (Layer 2 — cites facts) ──────────────────────────────────
  if (ns.value != null) {
    intelligence.push({
      id: "growth-weas-status",
      category: "growth",
      tone: ns.trend === "up" ? "good" : ns.trend === "down" ? "warn" : "info",
      statement: `WEAS is ${ns.value} (${ns.rate ?? "—"}% of active subscribers), ${ns.trend} week on week.`,
      factKeys: ["weas"],
      evidence: `WEAS ${ns.previousValue ?? "—"} → ${ns.value}; ${ns.coverage}.`,
      confidence: ns.confidence,
    });
  }
  const convFact = facts.find((f) => f.key === "conversion_rate")!;
  if (convFact.value != null) {
    intelligence.push({
      id: "growth-conversion",
      category: "growth",
      tone: convFact.trend === "up" ? "good" : convFact.trend === "down" ? "warn" : "info",
      statement: `Visitor→subscriber conversion is ${convFact.value}% (${convFact.trend} WoW).`,
      factKeys: ["conversion_rate", "new_signups_7d"],
      evidence: `${conv.current.converters} of ${conv.current.sessions} sessions converted this week; ${conv.previous.rate ?? "—"}% the week before.`,
      confidence: convFact.confidence,
    });
  }

  // ── Decisions (Layer 3 — cites intelligence) ──────────────────────────────
  // Only when conversion is measurable and soft (headroom), and traffic exists.
  if (convFact.value != null && conv.current.sessions >= 30 && convFact.value < 5) {
    recommendations.push(
      mkRecommendation({
        id: "growth-lift-conversion",
        title: "Lift visitor→subscriber conversion on the highest-traffic entry points",
        module: MODULE_ID,
        intelligenceKeys: ["growth-conversion"],
        observed: `Conversion is ${convFact.value}% across ${conv.current.sessions} sessions this week.`,
        whyItMatters: "Conversion is the top of the WEAS funnel — more subscribers is the precondition for more engaged subscribers.",
        evidence: `${conv.current.converters}/${conv.current.sessions} sessions converted (${convFact.value}%), vs ${conv.previous.rate ?? "—"}% prior week. Confidence: ${convFact.confidence}.`,
        sampleSize: conv.current.sessions,
        confidence: convFact.confidence,
        expectedImpact: "high",
        effort: "medium",
        weasRelationship: "increase",
        guardrails: ["unsubscribe rate", "subscriber quality (WEAS rate of new signups)", "spam complaints"],
        action: "Strengthen the subscribe CTA and its placement on the top landing pages; verify the offer is clear above the fold.",
        successMetric: "Canonical conversion rate up, with no rise in unsubscribe or complaint rate.",
        measurementWindow: "4 weeks",
        reviewOn: reviewOn(now, 4),
      }),
    );
    opportunities.push("Conversion has headroom on high-traffic entry points.");
  }
  if (ns.isLowerBound && (ns.identityCoverage ?? 0) < 0.4) {
    risks.push("WEAS identity coverage is low — the North Star currently undercounts engaged subscribers.");
  }

  const sampleSize = conv.current.sessions || subs.active || null;
  const confidence = minConfidence(ns.confidence, convFact.confidence);
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
    risks,
    opportunities,
    operationalWarnings: acq.configured ? [] : ["Ad spend not configured — acquisition ROI intelligence is unavailable."],
    dataQuality: [],
    sources: ["growthDashboard", "subscriberStats", "acquisitionQuality", "events", "brief_subscribers"],
    sampleSize,
    confidence,
  };
}

export async function growthModule(period: Period, now: number, shared: SharedContext): Promise<IntelligenceModule> {
  const [dash, subs, acq] = await Promise.all([growthDashboard(), subscriberStats(), acquisitionQuality()]);
  if (!dash.configured) {
    return {
      moduleId: MODULE_ID,
      moduleName: MODULE_NAME,
      schemaVersion: "1.0",
      status: "unavailable",
      reason: "Analytics store not configured — connect Supabase to enable Growth Intelligence.",
      period,
      refreshedAt: new Date(now).toISOString(),
      facts: [],
      intelligence: [],
      recommendations: [],
      risks: [],
      opportunities: [],
      operationalWarnings: [],
      dataQuality: [],
      sources: ["growthDashboard"],
      sampleSize: null,
      confidence: "insufficient",
    };
  }
  return mapGrowth({ dash, subs, acq }, period, now, shared);
}
