// Lifecycle / onboarding analytics — the data engine behind /admin/lifecycle.
//
// Everything here is derived from real first-party data: the onboarding sequence
// (LIFECYCLE_STEPS), per-subscriber send progress (lifecycle_sends), the email
// open/click events (campaign-tagged `lifecycle-<step>`), the subscriber base
// (brief_subscribers) and the send log (email_sends). No estimates are invented:
// where a signal isn't captured (bounces, spam, per-subscriber site behaviour),
// this module simply doesn't return it, and the page shows an honest gap panel.
//
// Two joins to know about:
//   • lifecycle_sends + brief_subscribers are keyed by raw email.
//   • email_open/email_click events are keyed by emailHash(email) in props.sub.
// So subscriber-level joins hash the email first (see cohort analysis). Counts
// that only need "how many unique people" work directly on either key.

import { sbSelect, supabaseConfigured } from "./supabase";
import { LIFECYCLE_STEPS } from "./lifecycleEmails";
import { enrolAnchorMs } from "./lifecycle";
import { LIFECYCLE_CATCHUP_DAYS, LIFECYCLE_LAUNCH } from "./lifecycleConfig";
import { emailHash } from "./emailTracking";

const DAY = 86_400_000;

// Short human labels for the sequence (the subject line is the formal name).
const STEP_LABEL: Record<string, string> = {
  tour: "Welcome · The 5-minute tour",
  different: "Why HalvingLens is different",
  youtube: "Prefer watching? (YouTube)",
  referral: "Unlock more with referrals",
  advanced: "Get even more from HalvingLens",
};

// Health-score weightings — deliberately configurable in one place. Each maps a
// real metric to a 0–100 sub-score; the overall score is the weighted average
// over whichever components have data (weights renormalise when one is missing).
export const HEALTH_WEIGHTS = {
  openRate: 0.3, // engagement: are they opening?
  ctr: 0.2, // action: are they clicking through?
  completion: 0.25, // do they finish the journey?
  sendSuccess: 0.15, // operational: are sends succeeding?
  retention: 0.1, // low unsubscribe = staying subscribed
} as const;

// Targets that define a "100" for each rate-based component. Chosen to be
// demanding but realistic for lifecycle email (opens are pixel-estimated).
const HEALTH_TARGETS = { openRate: 55, ctr: 12 } as const;

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const pct = (num: number, den: number): number | null => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);

export interface StepStat {
  id: string;
  label: string;
  subject: string;
  dayOffset: number;
  eligible: number; // active subs whose journey has reached this step's due date
  sent: number; // distinct subscribers actually sent this step
  opened: number; // distinct subscribers who opened it (pixel — estimated)
  clicked: number; // distinct subscribers who clicked (confirmed)
  openRate: number | null; // opened / sent, %
  ctr: number | null; // clicked / sent, %
  ctor: number | null; // clicked / opened, %
  topCta: string | null;
  lastSendISO: string | null;
}

export interface StatusBucket {
  key: string;
  label: string;
  count: number;
}

export interface CohortRow {
  cohort: string; // YYYY-MM
  label: string; // "Jul 2026"
  subscribers: number;
  tourSent: number;
  tourOpenRate: number | null;
  completionRate: number | null;
}

export interface HealthComponent {
  key: string;
  label: string;
  value: string; // the raw metric, formatted
  score: number; // 0–100 sub-score
  weight: number; // applied (renormalised) weight
}

export interface Insight {
  tone: "good" | "warn" | "info";
  text: string;
}

export interface LifecycleAnalytics {
  configured: boolean;
  generatedAt: string;
  launchISO: string;
  kpis: {
    subscribers: number;
    active: number;
    onboarding: number;
    completed: number;
    completionRate: number | null;
    avgDurationDays: number | null;
    avgOpenRate: number | null;
    avgCtr: number | null;
    healthScore: number | null;
    healthBand: string | null;
  };
  steps: StepStat[];
  enrolled: number; // active subscribers in the programme (funnel top)
  status: StatusBucket[];
  cohorts: CohortRow[];
  health: { score: number | null; band: string | null; components: HealthComponent[] };
  insights: Insight[];
  ops: {
    attempted: number;
    delivered: number;
    failed: number;
    successRate: number | null;
    lifecycleSends: number;
    lastSendISO: string | null;
  };
}

interface SubRow {
  email: string;
  source: string | null;
  status: string | null;
  signup_at: string | null;
}
interface SendRow {
  email: string;
  step: string;
  sent_at: string;
}
interface PropRow {
  props: Record<string, unknown> | null;
}
interface EmailSendRow {
  email_status: string | null;
  sent_at: string | null;
}

function healthBand(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Needs attention";
}

const monthLabel = (ym: string): string => {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
};

export interface LifecycleInput {
  subs: SubRow[];
  sends: SendRow[];
  opens: PropRow[];
  clicks: PropRow[];
  emailSends: EmailSendRow[];
}

export async function lifecycleAnalytics(): Promise<LifecycleAnalytics> {
  if (!supabaseConfigured) return emptyAnalytics();

  const [subsRaw, sendsRaw, openRaw, clickRaw, emailSendsRaw] = await Promise.all([
    sbSelect<SubRow[]>("brief_subscribers?select=email,source,status,signup_at&limit=100000"),
    sbSelect<SendRow[]>("lifecycle_sends?select=email,step,sent_at&limit=100000"),
    sbSelect<PropRow[]>("events?select=props&name=eq.email_open&props->>campaign=like.lifecycle-*&limit=100000"),
    sbSelect<PropRow[]>("events?select=props&name=eq.email_click&props->>campaign=like.lifecycle-*&limit=100000"),
    sbSelect<EmailSendRow[]>("email_sends?select=email_status,sent_at&limit=100000"),
  ]);

  if (subsRaw == null && sendsRaw == null) return emptyAnalytics();

  return computeLifecycle(
    {
      subs: subsRaw ?? [],
      sends: sendsRaw ?? [],
      opens: openRaw ?? [],
      clicks: clickRaw ?? [],
      emailSends: emailSendsRaw ?? [],
    },
    Date.now(),
  );
}

function emptyAnalytics(): LifecycleAnalytics {
  return {
    configured: false,
    generatedAt: new Date().toISOString(),
    launchISO: LIFECYCLE_LAUNCH,
    kpis: {
      subscribers: 0,
      active: 0,
      onboarding: 0,
      completed: 0,
      completionRate: null,
      avgDurationDays: null,
      avgOpenRate: null,
      avgCtr: null,
      healthScore: null,
      healthBand: null,
    },
    steps: [],
    enrolled: 0,
    status: [],
    cohorts: [],
    health: { score: null, band: null, components: [] },
    insights: [],
    ops: { attempted: 0, delivered: 0, failed: 0, successRate: null, lifecycleSends: 0, lastSendISO: null },
  };
}

// Pure, deterministic core — takes the fetched rows + a fixed `now`, so the whole
// dashboard is unit-testable against a fixture without a database.
export function computeLifecycle(input: LifecycleInput, now: number): LifecycleAnalytics {
  const generatedAt = new Date(now).toISOString();
  const { emailSends } = input;
  const subs = input.subs;
  const sends = input.sends;
  const opens = input.opens;
  const clicks = input.clicks;

  const steps = [...LIFECYCLE_STEPS].filter((s) => s.enabled ?? true).sort((a, b) => a.dayOffset - b.dayOffset);
  const finalStep = steps[steps.length - 1];

  // Active subscribers = the send pipeline's own filter (status null or 'active').
  const active = subs.filter((s) => s.status == null || s.status === "active");
  const activeEmails = new Set(active.map((s) => s.email.trim().toLowerCase()));

  // ── Per-subscriber send map (email -> step -> sent_at ms) ───────────────────
  const sentByEmail = new Map<string, Map<string, number>>();
  for (const r of sends) {
    const key = r.email.trim().toLowerCase();
    const m = sentByEmail.get(key) ?? new Map<string, number>();
    m.set(r.step, Date.parse(r.sent_at));
    sentByEmail.set(key, m);
  }

  // ── Engagement events grouped by campaign -> set of subscriber hashes ───────
  const openedByCampaign = new Map<string, Set<string>>();
  const clickedByCampaign = new Map<string, Set<string>>();
  const ctaByCampaign = new Map<string, Map<string, number>>();
  const addTo = (map: Map<string, Set<string>>, camp: string, sub: string) => {
    if (!camp || !sub) return;
    (map.get(camp) ?? map.set(camp, new Set()).get(camp)!).add(sub);
  };
  for (const r of opens) addTo(openedByCampaign, String(r.props?.campaign ?? ""), String(r.props?.sub ?? ""));
  for (const r of clicks) {
    const camp = String(r.props?.campaign ?? "");
    addTo(clickedByCampaign, camp, String(r.props?.sub ?? ""));
    if (camp) {
      const cta = String(r.props?.cta ?? "link");
      const t = ctaByCampaign.get(camp) ?? new Map<string, number>();
      t.set(cta, (t.get(cta) ?? 0) + 1);
      ctaByCampaign.set(camp, t);
    }
  }

  // ── Per-step stats ──────────────────────────────────────────────────────────
  const stepStats: StepStat[] = steps.map((step) => {
    const campaign = `lifecycle-${step.id}`;
    let eligible = 0;
    let lastSend = 0;
    // eligibility: active subscribers whose anchor + dayOffset has passed.
    for (const s of active) {
      const anchor = enrolAnchorMs(s.signup_at, now);
      if (now >= anchor + step.dayOffset * DAY) eligible += 1;
    }
    let sent = 0;
    for (const [email, m] of sentByEmail) {
      if (m.has(step.id) && activeEmails.has(email)) {
        sent += 1;
        const ts = m.get(step.id)!;
        if (ts > lastSend) lastSend = ts;
      }
    }
    const opened = openedByCampaign.get(campaign)?.size ?? 0;
    const clicked = clickedByCampaign.get(campaign)?.size ?? 0;
    const cta = ctaByCampaign.get(campaign);
    const topCta = cta ? [...cta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null : null;
    return {
      id: step.id,
      label: STEP_LABEL[step.id] ?? step.id,
      subject: step.subject,
      dayOffset: step.dayOffset,
      eligible,
      sent,
      opened,
      clicked,
      openRate: pct(opened, sent),
      ctr: pct(clicked, sent),
      ctor: pct(clicked, opened),
      topCta,
      lastSendISO: lastSend ? new Date(lastSend).toISOString() : null,
    };
  });

  // ── Completion / onboarding / status ────────────────────────────────────────
  const finalOffsetMs = finalStep ? finalStep.dayOffset * DAY : 0;
  const catchupMs = LIFECYCLE_CATCHUP_DAYS * DAY;

  let completed = 0;
  let onboarding = 0;
  let eligibleToComplete = 0;
  const durations: number[] = [];

  // Status buckets: awaiting first email, then furthest step reached, then completed.
  const statusCounts = new Map<string, number>();
  const bump = (k: string) => statusCounts.set(k, (statusCounts.get(k) ?? 0) + 1);

  for (const s of active) {
    const email = s.email.trim().toLowerCase();
    const m = sentByEmail.get(email);
    const anchor = enrolAnchorMs(s.signup_at, now);
    const hasFinal = !!m?.has(finalStep?.id ?? "__none__");

    if (now >= anchor + finalOffsetMs) eligibleToComplete += 1;

    if (hasFinal) {
      completed += 1;
      bump("completed");
      // duration = final send - first (tour) send, if both known.
      const first = m?.get(steps[0]?.id ?? "");
      const last = m?.get(finalStep!.id);
      if (first && last && last >= first) durations.push((last - first) / DAY);
      continue;
    }

    // Not completed: still onboarding if the journey window hasn't fully elapsed.
    const windowOpen = now <= anchor + finalOffsetMs + catchupMs;
    if (windowOpen) onboarding += 1;

    if (!m || m.size === 0) {
      bump("awaiting");
    } else {
      // Furthest step reached by dayOffset.
      let furthest = steps[0];
      for (const st of steps) if (m.has(st.id) && st.dayOffset >= furthest.dayOffset) furthest = st;
      bump(`step:${furthest.id}`);
    }
  }

  const status: StatusBucket[] = [
    { key: "awaiting", label: "Awaiting first email", count: statusCounts.get("awaiting") ?? 0 },
    ...steps
      .filter((s) => s.id !== finalStep?.id)
      .map((s) => ({ key: `step:${s.id}`, label: `On: ${STEP_LABEL[s.id] ?? s.id}`, count: statusCounts.get(`step:${s.id}`) ?? 0 })),
    { key: "completed", label: "Completed onboarding", count: statusCounts.get("completed") ?? 0 },
  ].filter((b) => b.count > 0);

  const completionRate = pct(completed, eligibleToComplete);
  const avgDurationDays = durations.length ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10 : null;

  // ── Aggregate open/CTR across the whole sequence ────────────────────────────
  const totalSent = stepStats.reduce((a, s) => a + s.sent, 0);
  const totalOpened = stepStats.reduce((a, s) => a + s.opened, 0);
  const totalClicked = stepStats.reduce((a, s) => a + s.clicked, 0);
  const avgOpenRate = pct(totalOpened, totalSent);
  const avgCtr = pct(totalClicked, totalSent);

  // ── Ops (platform-wide send log; lifecycle is a subset) ─────────────────────
  const attempted = emailSends.length;
  const failed = emailSends.filter((e) => e.email_status === "failed").length;
  const delivered = emailSends.filter((e) => e.email_status === "delivered").length;
  const successRate = attempted > 0 ? Math.round(((attempted - failed) / attempted) * 1000) / 10 : null;
  let lastSendMs = 0;
  for (const r of sends) {
    const ts = Date.parse(r.sent_at);
    if (ts > lastSendMs) lastSendMs = ts;
  }

  // ── Unsubscribe rate (for the health score's retention component) ────────────
  const totalSubs = subs.length;
  const unsubscribed = subs.filter((s) => s.status === "unsubscribed").length;
  const unsubRate = totalSubs > 0 ? Math.round((unsubscribed / totalSubs) * 1000) / 10 : null;

  // ── Cohort analysis by signup month (hash-join opens back to subscribers) ────
  const tourOpenedHashes = openedByCampaign.get("lifecycle-tour") ?? new Set<string>();
  const cohortMap = new Map<string, { subs: number; tourSent: number; tourOpened: number; eligible: number; completed: number }>();
  for (const s of active) {
    if (!s.signup_at) continue;
    const anchor = enrolAnchorMs(s.signup_at, now);
    const ym = new Date(anchor).toISOString().slice(0, 7);
    const c = cohortMap.get(ym) ?? { subs: 0, tourSent: 0, tourOpened: 0, eligible: 0, completed: 0 };
    c.subs += 1;
    const email = s.email.trim().toLowerCase();
    const m = sentByEmail.get(email);
    if (m?.has("tour")) {
      c.tourSent += 1;
      if (tourOpenedHashes.has(emailHash(email))) c.tourOpened += 1;
    }
    if (now >= anchor + finalOffsetMs) c.eligible += 1;
    if (m?.has(finalStep?.id ?? "__none__")) c.completed += 1;
    cohortMap.set(ym, c);
  }
  const cohorts: CohortRow[] = [...cohortMap.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 6)
    .map(([ym, c]) => ({
      cohort: ym,
      label: monthLabel(ym),
      subscribers: c.subs,
      tourSent: c.tourSent,
      tourOpenRate: pct(c.tourOpened, c.tourSent),
      completionRate: pct(c.completed, c.eligible),
    }));

  // ── Health score (weighted over available components) ───────────────────────
  const rawComponents: { key: string; label: string; value: string; score: number; weight: number }[] = [];
  if (avgOpenRate != null)
    rawComponents.push({ key: "openRate", label: "Open rate", value: `${avgOpenRate}%`, score: clamp((avgOpenRate / HEALTH_TARGETS.openRate) * 100), weight: HEALTH_WEIGHTS.openRate });
  if (avgCtr != null)
    rawComponents.push({ key: "ctr", label: "Click-through", value: `${avgCtr}%`, score: clamp((avgCtr / HEALTH_TARGETS.ctr) * 100), weight: HEALTH_WEIGHTS.ctr });
  if (completionRate != null)
    rawComponents.push({ key: "completion", label: "Completion", value: `${completionRate}%`, score: clamp(completionRate), weight: HEALTH_WEIGHTS.completion });
  if (successRate != null)
    rawComponents.push({ key: "sendSuccess", label: "Send success", value: `${successRate}%`, score: clamp(successRate), weight: HEALTH_WEIGHTS.sendSuccess });
  if (unsubRate != null)
    rawComponents.push({ key: "retention", label: "Staying subscribed", value: `${(100 - unsubRate).toFixed(1)}%`, score: clamp(100 - unsubRate * 20), weight: HEALTH_WEIGHTS.retention });

  const weightSum = rawComponents.reduce((a, c) => a + c.weight, 0);
  const components: HealthComponent[] = rawComponents.map((c) => ({ ...c, weight: weightSum > 0 ? c.weight / weightSum : 0 }));
  const healthScore = components.length ? Math.round(components.reduce((a, c) => a + c.score * c.weight, 0)) : null;
  const band = healthScore != null ? healthBand(healthScore) : null;

  // ── Deterministic founder insights (evidence-backed only) ───────────────────
  const insights: Insight[] = [];
  const MIN_SAMPLE = 5; // don't call a trend on a handful of sends

  const rated = stepStats.filter((s) => s.sent >= MIN_SAMPLE && s.openRate != null);
  if (rated.length >= 2) {
    const weakest = [...rated].sort((a, b) => (a.openRate! - b.openRate!))[0];
    insights.push({
      tone: "warn",
      text: `The “${weakest.label}” email (day ${weakest.dayOffset}) has the lowest open rate at ${weakest.openRate}% — the weakest point in the sequence.`,
    });
    const bestClick = [...stepStats].filter((s) => s.sent >= MIN_SAMPLE && s.ctr != null).sort((a, b) => b.ctr! - a.ctr!)[0];
    if (bestClick && bestClick.ctr != null)
      insights.push({ tone: "good", text: `The “${bestClick.label}” email drives the most action at ${bestClick.ctr}% click-through.` });

    // Biggest open-rate drop between consecutive steps.
    let biggestDrop = { from: "", to: "", delta: 0, day: 0 };
    for (let i = 1; i < rated.length; i++) {
      const prev = rated[i - 1];
      const cur = rated[i];
      const delta = prev.openRate! - cur.openRate!;
      if (delta > biggestDrop.delta) biggestDrop = { from: prev.label, to: cur.label, delta, day: cur.dayOffset };
    }
    if (biggestDrop.delta >= 15)
      insights.push({ tone: "warn", text: `Open rate falls ${Math.round(biggestDrop.delta)} points from “${biggestDrop.from}” to “${biggestDrop.to}” — the clearest drop-off in the journey.` });
  }
  if (completionRate != null)
    insights.push({
      tone: completionRate >= 60 ? "good" : "info",
      text: `${completionRate}% of subscribers who have had time to finish completed all ${steps.length} onboarding emails.`,
    });
  if (onboarding > 0 || completed > 0)
    insights.push({
      tone: "info",
      text: `${onboarding.toLocaleString()} ${onboarding === 1 ? "subscriber is" : "subscribers are"} currently mid-onboarding; ${completed.toLocaleString()} ${completed === 1 ? "has" : "have"} completed the sequence.`,
    });
  if (failed > 0)
    insights.push({ tone: "warn", text: `${failed.toLocaleString()} of ${attempted.toLocaleString()} email sends failed — worth checking delivery health.` });
  if (!insights.length)
    insights.push({ tone: "info", text: "Not enough onboarding data yet to surface trends — insights appear as the sequence sends and engagement is recorded." });

  return {
    configured: true,
    generatedAt,
    launchISO: LIFECYCLE_LAUNCH,
    kpis: {
      subscribers: totalSubs,
      active: active.length,
      onboarding,
      completed,
      completionRate,
      avgDurationDays,
      avgOpenRate,
      avgCtr,
      healthScore,
      healthBand: band,
    },
    steps: stepStats,
    enrolled: active.length,
    status,
    cohorts,
    health: { score: healthScore, band, components },
    insights,
    ops: {
      attempted,
      delivered,
      failed,
      successRate,
      lifecycleSends: sends.length,
      lastSendISO: lastSendMs ? new Date(lastSendMs).toISOString() : null,
    },
  };
}
