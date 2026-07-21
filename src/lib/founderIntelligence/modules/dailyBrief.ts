// Daily Brief Intelligence — foundation. Wraps the existing email-engagement
// aggregator into the module contract, weighting CONFIRMED clicks over
// provider-reported opens (Apple MPP inflates opens). Per-edition attribution
// (subject/theme performance, bounces, complaints, brief-attributed WEAS)
// arrives with PR4 (Resend webhooks) — surfaced here honestly as "collecting",
// never faked.

import { emailEngagement } from "../../growthInsights";
import { confidenceFrom } from "../confidence";
import { mkFact, mkRecommendation, reviewOn } from "./factory";
import type { Fact, IntelligenceItem, IntelligenceModule, Period, Recommendation, SharedContext } from "../types";

const MODULE_ID = "daily_briefs";
const MODULE_NAME = "Daily Brief Intelligence";

type EmailEngagement = Awaited<ReturnType<typeof emailEngagement>>;

export function mapDailyBrief(e: EmailEngagement, period: Period, now: number): IntelligenceModule {
  const facts: Fact[] = [];
  const intelligence: IntelligenceItem[] = [];
  const recommendations: Recommendation[] = [];
  const delivered = e.delivered;
  const conf = confidenceFrom({ sampleSize: delivered, periods: 1, observed: true });

  facts.push(
    mkFact({ key: "emails_delivered", label: "Emails delivered", unit: "count", value: delivered, sampleSize: delivered, observability: "observed", confidence: conf, definition: "Delivered daily + weekly emails (open-rate denominator).", sources: ["email_deliveries", "weekly_email_deliveries"] }),
    mkFact({ key: "unique_clicks", label: "Unique clicks (confirmed)", unit: "count", value: e.uniqueClicks, sampleSize: e.uniqueClicks, observability: "observed", confidence: conf, definition: "Distinct subscriber×campaign email clicks — a confirmed engagement signal.", sources: ["events (email_click)"] }),
    mkFact({ key: "ctr", label: "Click-through rate (confirmed)", unit: "pct", value: e.ctr, sampleSize: delivered, observability: "observed", confidence: conf, definition: "Unique clicks ÷ delivered.", sources: ["events", "email_deliveries"] }),
    mkFact({ key: "ctor", label: "Click-to-open rate", unit: "pct", value: e.ctor, sampleSize: e.uniqueOpens, observability: "partial", confidence: e.uniqueOpens >= 30 ? "medium" : "early", definition: "Unique clicks ÷ unique opens. Denominator is provider-reported opens (MPP-inflated) — read directionally.", sources: ["events"], notes: "Open denominator is provider-reported (Apple MPP / image proxies inflate opens)." }),
    mkFact({ key: "unique_opens", label: "Unique opens (provider-reported)", unit: "count", value: e.uniqueOpens, sampleSize: e.uniqueOpens, observability: "partial", confidence: "early", definition: "Distinct subscriber×campaign opens — SUPPORTING signal only.", sources: ["events (email_open)"], notes: "Provider-reported; inflated by Apple Mail Privacy Protection. Not counted toward WEAS." }),
  );

  if (e.configured && delivered > 0 && e.ctor != null) {
    intelligence.push({
      id: "brief-ctor",
      category: "email",
      tone: "info",
      statement: `Click-to-open rate is ${e.ctor}% on ${e.uniqueClicks} confirmed clicks — the confirmed measure of whether the content earns the click.`,
      factKeys: ["ctor", "unique_clicks", "ctr"],
      evidence: `${e.uniqueClicks} unique clicks across ${delivered} delivered emails; opens are provider-reported and read directionally only.`,
      confidence: conf,
    });
    // A conservative recommendation only when clicks give a real signal.
    if (e.uniqueClicks >= 20 && e.ctr != null) {
      recommendations.push(
        mkRecommendation({
          id: "brief-editorial-style",
          title: "Double down on the Daily Brief editorial styles that earn confirmed clicks",
          module: MODULE_ID,
          intelligenceKeys: ["brief-ctor"],
          observed: `CTR ${e.ctr}% / CTOR ${e.ctor}% across ${delivered} delivered emails (${e.uniqueClicks} confirmed clicks).`,
          whyItMatters: "Confirmed email clicks are a first-party WEAS signal; briefs that reliably earn clicks directly grow engaged subscribers.",
          evidence: `${e.uniqueClicks} confirmed clicks, ${delivered} delivered. Confidence: ${conf}. (Per-edition subject/theme breakdown lands with PR4 webhooks.)`,
          sampleSize: delivered,
          confidence: conf,
          expectedImpact: "medium",
          effort: "low",
          weasRelationship: "increase",
          guardrails: ["unsubscribe rate", "spam complaints", "theme diversity / subject fatigue"],
          action: "Once per-edition attribution is live (PR4), lean editorial mix toward the highest confirmed-CTR themes; until then, keep subject/CTA experiments running.",
          successMetric: "Higher confirmed CTR and Daily-Brief-attributed WEAS, with no rise in unsubscribes or complaints.",
          measurementWindow: "4 weeks",
          reviewOn: reviewOn(now, 4),
        }),
      );
    }
  }

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
    risks: [],
    opportunities: [],
    operationalWarnings: [
      "Per-edition performance (subject, theme, bounces, complaints, attributed sessions & WEAS) is not yet ingested — it arrives with PR4 (Resend webhooks). Provider-reported opens shown are MPP-inflated.",
    ],
    dataQuality: [
      { metric: "unique_opens", source: "events (email_open)", observability: "partial", identityCoverage: null, coverageStart: null, limitation: "Provider-reported; Apple MPP inflates opens. Supporting signal only.", confidence: "early", definitionVersion: "1.0" },
      { metric: "brief_bounces_complaints", source: "resend webhooks (PR4)", observability: "unavailable", identityCoverage: null, coverageStart: null, limitation: "Not yet ingested — collecting once Resend webhooks ship.", confidence: "insufficient", definitionVersion: "1.0" },
    ],
    sources: ["emailEngagement", "events", "email_deliveries"],
    sampleSize: delivered || null,
    confidence: conf,
  };
}

export async function dailyBriefModule(period: Period, now: number, _shared: SharedContext): Promise<IntelligenceModule> {
  void _shared;
  const e = await emailEngagement();
  if (!e.configured) {
    return {
      moduleId: MODULE_ID,
      moduleName: MODULE_NAME,
      schemaVersion: "1.0",
      status: "unavailable",
      reason: "Email analytics not configured — connect Supabase + email events to enable Daily Brief Intelligence.",
      period,
      refreshedAt: new Date(now).toISOString(),
      facts: [],
      intelligence: [],
      recommendations: [],
      risks: [],
      opportunities: [],
      operationalWarnings: [],
      dataQuality: [],
      sources: ["emailEngagement"],
      sampleSize: null,
      confidence: "insufficient",
    };
  }
  return mapDailyBrief(e, period, now);
}
