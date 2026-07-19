import { lifecycleAnalytics, type StepStat, type Insight } from "@/lib/lifecycleAnalytics";
import { AdminLogin } from "@/components/AdminLogin";
import { isAdmin, adminConfigured } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lifecycle Analytics — halvinglens.com", robots: { index: false } };

// Lifecycle Analytics — the onboarding journey as a measurable funnel. Every
// figure is live first-party data (lifecycle_sends + email open/click events +
// the subscriber base); anything not yet instrumented is shown as an honest gap
// panel, never a fabricated number. Admin-gated exactly like /admin/executive.

const GOLD = "#d9b96a";

// Open-rate colour thresholds (configurable) — green / amber / red.
const OPEN_GOOD = 50;
const OPEN_OK = 30;

function rateTone(rate: number | null): string {
  if (rate == null) return "text-ink-500";
  if (rate >= OPEN_GOOD) return "text-signal-green";
  if (rate >= OPEN_OK) return "text-signal-amber";
  return "text-signal-red";
}
function rateBar(rate: number | null): string {
  if (rate == null) return "rgba(255,255,255,0.12)";
  if (rate >= OPEN_GOOD) return "rgba(52,211,153,0.55)";
  if (rate >= OPEN_OK) return "rgba(245,185,66,0.55)";
  return "rgba(255,93,93,0.55)";
}
const fmt = (n: number) => n.toLocaleString();
const rate = (r: number | null) => (r == null ? "—" : `${r}%`);

export default async function AdminLifecyclePage() {
  if (!adminConfigured())
    return (
      <Shell>
        <p className="text-[14px] text-ink-300 max-w-xl leading-relaxed">
          Set <code className="text-accent">ANALYTICS_DASHBOARD_KEY</code> in the environment to enable the dashboard.
        </p>
      </Shell>
    );
  if (!isAdmin())
    return (
      <Shell>
        <AdminLogin />
      </Shell>
    );

  const a = await lifecycleAnalytics();
  if (!a.configured)
    return (
      <Shell>
        <p className="text-[14px] text-ink-300 max-w-xl">
          Supabase isn&apos;t configured yet — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY and run{" "}
          <code className="text-accent">supabase/lifecycle.sql</code>. Once onboarding emails send, this dashboard fills in.
        </p>
      </Shell>
    );

  const asOf = new Date(a.generatedAt).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  const k = a.kpis;
  const maxStepBase = Math.max(a.enrolled, ...a.steps.map((s) => s.sent), 1);

  return (
    <Shell asOf={asOf}>
      {/* ── KPI header ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        <Kpi label="Subscribers" value={fmt(k.subscribers)} available />
        <Kpi label="Active" value={fmt(k.active)} available />
        <Kpi label="Onboarding" value={fmt(k.onboarding)} available />
        <Kpi label="Completed" value={fmt(k.completed)} available />
        <Kpi label="Completion" value={rate(k.completionRate)} available={k.completionRate != null} />
        <Kpi label="Avg open rate" value={rate(k.avgOpenRate)} available={k.avgOpenRate != null} />
        <Kpi label="Avg CTR" value={rate(k.avgCtr)} available={k.avgCtr != null} />
        <Kpi label="Lifecycle health" value={k.healthScore != null ? `${k.healthScore}/100` : "—"} available={k.healthScore != null} sub={k.healthBand ?? undefined} />
      </div>

      {/* ── Health score breakdown ── */}
      {a.health.score != null && (
        <Panel title="Lifecycle Health Score" hint="Weighted average of live signals — weightings configurable in lifecycleAnalytics.ts.">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="shrink-0">
              <div className="font-display text-[52px] leading-none text-ink-50">
                {a.health.score}
                <span className="text-[20px] text-ink-500">/100</span>
              </div>
              <div className="mt-1 text-[12px]" style={{ color: GOLD }}>{a.health.band}</div>
            </div>
            <div className="flex-1 space-y-2 w-full">
              {a.health.components.map((c) => (
                <div key={c.key} className="flex items-center gap-3">
                  <div className="w-28 shrink-0 text-[11.5px] text-ink-400">{c.label}</div>
                  <div className="flex-1 h-4 rounded bg-white/[0.04] overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${Math.max(c.score, 2)}%`, background: "rgba(94,234,212,0.4)" }} />
                  </div>
                  <div className="w-24 shrink-0 text-right font-mono text-[11.5px] text-ink-200 tabular-nums">
                    {c.value} <span className="text-ink-600">·{Math.round(c.weight * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      )}

      {/* ── Onboarding funnel (the hero) ── */}
      <Panel title="Onboarding Funnel" hint="Each email in the sequence: reached, opened, clicked. Colour = open rate against thresholds. Later steps also include subscribers not yet due — see 'eligible'.">
        <div className="space-y-3">
          <FunnelTop enrolled={a.enrolled} />
          {a.steps.map((s, i) => (
            <FunnelRow key={s.id} step={s} prev={i > 0 ? a.steps[i - 1] : null} base={maxStepBase} />
          ))}
        </div>
      </Panel>

      {/* ── Individual email performance ── */}
      <Panel title="Email Performance" hint="Per onboarding email. Replies, spam complaints and average read-time are not captured yet (see gaps below).">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px] min-w-[720px]">
            <thead>
              <tr className="text-ink-500 text-[10px] uppercase tracking-[0.12em] text-left">
                <th className="font-normal pb-2">Email</th>
                <th className="font-normal pb-2">Day</th>
                <th className="font-normal pb-2 text-right">Sent</th>
                <th className="font-normal pb-2 text-right">Opened</th>
                <th className="font-normal pb-2 text-right">Open %</th>
                <th className="font-normal pb-2 text-right">Clicked</th>
                <th className="font-normal pb-2 text-right">CTR</th>
                <th className="font-normal pb-2 text-right">CTOR</th>
                <th className="font-normal pb-2">Top link</th>
                <th className="font-normal pb-2">Last sent</th>
              </tr>
            </thead>
            <tbody>
              {a.steps.map((s) => (
                <tr key={s.id} className="border-t border-white/[0.06]">
                  <td className="py-2.5 text-ink-100">
                    {s.label}
                    <div className="text-[10.5px] text-ink-500 truncate max-w-[220px]">{s.subject}</div>
                  </td>
                  <td className="py-2.5 text-ink-400 font-mono tabular-nums">{s.dayOffset}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-ink-200">{fmt(s.sent)}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-ink-200">{fmt(s.opened)}</td>
                  <td className={`py-2.5 text-right font-mono tabular-nums ${rateTone(s.openRate)}`}>{rate(s.openRate)}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-ink-200">{fmt(s.clicked)}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-ink-200">{rate(s.ctr)}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-ink-400">{rate(s.ctor)}</td>
                  <td className="py-2.5 text-ink-400 truncate max-w-[140px]">{s.topCta ?? "—"}</td>
                  <td className="py-2.5 text-ink-500 font-mono tabular-nums">
                    {s.lastSendISO ? new Date(s.lastSendISO).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-ink-600">
          Opens are pixel-estimated (inflated by Apple Mail Privacy &amp; proxies); clicks are confirmed. Open % = opened ÷ sent.
        </p>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Current status ── */}
        <Panel title="Current Onboarding Status" hint="Where active subscribers sit in the journey right now.">
          <div className="space-y-2">
            {a.status.map((b) => {
              const w = (b.count / Math.max(...a.status.map((x) => x.count), 1)) * 100;
              return (
                <div key={b.key} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 text-[12px] text-ink-300 truncate">{b.label}</div>
                  <div className="flex-1 h-5 rounded bg-white/[0.04] overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${Math.max(w, 3)}%`, background: b.key === "completed" ? "rgba(52,211,153,0.45)" : "rgba(94,234,212,0.3)" }} />
                  </div>
                  <div className="w-12 shrink-0 text-right font-mono text-[12px] text-ink-100 tabular-nums">{fmt(b.count)}</div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* ── Founder insights ── */}
        <Panel title="AI Founder Insights" hint="Deterministic, evidence-backed — no speculation. Each is derived directly from the numbers above.">
          <ul className="space-y-2.5">
            {a.insights.map((ins, i) => (
              <InsightRow key={i} ins={ins} />
            ))}
          </ul>
        </Panel>
      </div>

      {/* ── Cohorts ── */}
      <Panel title="Signup Cohorts" hint="By enrolment month. Open rate and completion are real; per-cohort retention needs the identity bridge below.">
        {a.cohorts.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[520px]">
              <thead>
                <tr className="text-ink-500 text-[10px] uppercase tracking-[0.12em] text-left">
                  <th className="font-normal pb-2">Cohort</th>
                  <th className="font-normal pb-2 text-right">Subscribers</th>
                  <th className="font-normal pb-2 text-right">Tour open rate</th>
                  <th className="font-normal pb-2 text-right">Completion</th>
                  <th className="font-normal pb-2 text-right">Weekly retention</th>
                </tr>
              </thead>
              <tbody>
                {a.cohorts.map((c) => (
                  <tr key={c.cohort} className="border-t border-white/[0.06]">
                    <td className="py-2.5 text-ink-100">{c.label}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-ink-200">{fmt(c.subscribers)}</td>
                    <td className={`py-2.5 text-right font-mono tabular-nums ${rateTone(c.tourOpenRate)}`}>{rate(c.tourOpenRate)}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-ink-200">{rate(c.completionRate)}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-ink-600">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[13px] text-ink-400">No cohorts yet — they appear as subscribers enrol and receive the sequence.</p>
        )}
      </Panel>

      {/* ── Operational monitoring ── */}
      <Panel title="Operational Monitoring" hint="Platform-wide email send health (daily brief, weekly and lifecycle share one send log).">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
          <Kpi label="Sends attempted" value={fmt(a.ops.attempted)} available />
          <Kpi label="Accepted" value={fmt(a.ops.delivered)} available />
          <Kpi label="Failed" value={fmt(a.ops.failed)} available />
          <Kpi label="Success rate" value={rate(a.ops.successRate)} available={a.ops.successRate != null} />
          <Kpi label="Lifecycle sends" value={fmt(a.ops.lifecycleSends)} available />
          <Kpi
            label="Last send"
            value={a.ops.lastSendISO ? new Date(a.ops.lastSendISO).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
            available={!!a.ops.lastSendISO}
          />
        </div>
        <p className="mt-3 text-[11px] text-ink-600">
          &ldquo;Accepted&rdquo; means accepted by Resend, not confirmed inbox delivery. True delivery, bounces and spam complaints need Resend webhooks (see gaps).
        </p>
      </Panel>

      {/* ── Honest gap panels ── */}
      <section>
        <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-ink-500 mb-2">Not yet measured — what each needs</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Gap
            title="Engagement trigger analysis"
            shows="For each email: what % of recipients then read the Daily Brief, viewed State of Bitcoin, opened Research, or watched YouTube."
            needs="Web behaviour is anonymous by design (hashed, no PII, opt-out). Tying it to a subscriber needs the identity bridge — available today only for signed-in Profile members via profile_visit. A values decision, not just engineering."
          />
          <Gap
            title="Retention curves (D1/D7/D30)"
            shows="The share of each signup cohort still active over time, overlaid with onboarding events."
            needs="A per-subscriber return signal. Session analytics are anonymous; only signed-in Profiles resolve to a subscriber. Extend the identity bridge to unlock."
          />
          <Gap
            title="Deliverability signals"
            shows="True delivered, hard/soft bounces, spam complaints and replies per email."
            needs="A Resend webhook endpoint + a table to store the events. Discrete, high-value; needs a Resend signing secret."
          />
          <Gap
            title="A/B testing"
            shows="Subject / timing / CTA variants with winner, confidence, open %, CTR and completion."
            needs="A variant field on lifecycle_sends and a variant tag on the campaign. Architecture is ready; not wired this pass."
          />
          <Gap
            title="Per-email read time & heatmap"
            shows="Average reading time and click heatmaps per email."
            needs="Read-time beacons and positional click tracking in the email — not currently captured."
          />
          <Gap
            title="Source / channel cohorts"
            shows="Onboarding performance split by acquisition channel (organic, Meta, referral)."
            needs="Structured UTM/campaign on the subscriber row. Today source is free-text and campaign lives only on anonymous events."
          />
        </div>
      </section>

      <p className="mt-8 pt-5 border-t border-white/[0.06] text-[11px] text-ink-500 max-w-2xl leading-relaxed">
        Live first-party data only — no fabricated figures. Onboarding progress comes from <code className="text-ink-400">lifecycle_sends</code>;
        opens/clicks from campaign-tagged email events; the base from <code className="text-ink-400">brief_subscribers</code>. An em-dash means
        no source is connected yet, not zero. Measure. Learn. Improve.
      </p>
    </Shell>
  );
}

// ── Pieces ─────────────────────────────────────────────────────────────────
function FunnelTop({ enrolled }: { enrolled: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-44 shrink-0">
        <div className="text-[12.5px] text-ink-100">Enrolled subscribers</div>
        <div className="text-[10.5px] text-ink-500">Top of the funnel</div>
      </div>
      <div className="flex-1 h-9 rounded-lg bg-white/[0.05] flex items-center px-3">
        <span className="font-mono text-[13px] text-ink-100 tabular-nums">{enrolled.toLocaleString()}</span>
      </div>
      <div className="w-40 shrink-0" />
    </div>
  );
}

function FunnelRow({ step, prev, base }: { step: StepStat; prev: StepStat | null; base: number }) {
  const sentW = (step.sent / base) * 100;
  const openW = (step.opened / base) * 100;
  const drop = prev && prev.opened > 0 ? Math.round((1 - step.opened / prev.opened) * 100) : null;
  return (
    <div className="flex items-center gap-3">
      <div className="w-44 shrink-0">
        <div className="text-[12.5px] text-ink-100 truncate">{step.label}</div>
        <div className="text-[10.5px] text-ink-500">Day {step.dayOffset} · {step.eligible.toLocaleString()} eligible</div>
      </div>
      <div className="flex-1 relative h-9 rounded-lg bg-white/[0.03] overflow-hidden">
        {/* sent */}
        <div className="absolute inset-y-0 left-0 rounded-lg bg-white/[0.07]" style={{ width: `${Math.max(sentW, 1)}%` }} />
        {/* opened (coloured by rate) */}
        <div className="absolute inset-y-0 left-0 rounded-lg" style={{ width: `${Math.max(openW, 0.5)}%`, background: rateBar(step.openRate) }} />
        <div className="absolute inset-0 flex items-center px-3 gap-3">
          <span className="font-mono text-[12px] text-ink-100 tabular-nums">{step.sent.toLocaleString()} sent</span>
          <span className={`font-mono text-[11.5px] tabular-nums ${rateTone(step.openRate)}`}>{rate(step.openRate)} open</span>
          <span className="font-mono text-[11px] text-ink-400 tabular-nums hidden sm:inline">{rate(step.ctr)} CTR</span>
        </div>
      </div>
      <div className="w-40 shrink-0 text-[11px] text-ink-400">
        {step.opened.toLocaleString()} opened
        {drop != null && <span className={drop > 0 ? "text-signal-red ml-1.5" : "text-signal-green ml-1.5"}>{drop > 0 ? `▼${drop}%` : `▲${-drop}%`}</span>}
      </div>
    </div>
  );
}

function InsightRow({ ins }: { ins: Insight }) {
  const dot = ins.tone === "good" ? "bg-signal-green" : ins.tone === "warn" ? "bg-signal-amber" : "bg-ink-500";
  return (
    <li className="flex gap-2.5 text-[13px] leading-relaxed text-ink-200">
      <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${dot}`} />
      <span>{ins.text}</span>
    </li>
  );
}

function Gap({ title, shows, needs }: { title: string; shows: string; needs: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/[0.12] p-4">
      <div className="flex items-center gap-2">
        <span className="text-[9.5px] uppercase tracking-[0.14em] text-ink-600 border border-white/[0.1] rounded-full px-2 py-0.5">Instrument to unlock</span>
        <span className="text-[13px] font-medium text-ink-200">{title}</span>
      </div>
      <p className="mt-2 text-[12px] text-ink-400 leading-relaxed"><span className="text-ink-300">Will show:</span> {shows}</p>
      <p className="mt-1.5 text-[12px] text-ink-500 leading-relaxed"><span className="text-ink-400">Needs:</span> {needs}</p>
    </div>
  );
}

function Kpi({ label, value, sub, available }: { label: string; value: string; sub?: string; available: boolean }) {
  return (
    <div className="bg-[#0b0f15] px-4 py-3.5">
      <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-400">{label}</div>
      <div className={`mt-1.5 font-mono text-[20px] tabular-nums leading-none ${available ? "text-ink-50" : "text-ink-500"}`}>{value}</div>
      <div className="mt-1 min-h-[13px] text-[10px] text-ink-500 truncate">{sub ?? ""}</div>
    </div>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-4">
        <h2 className="text-[13px] font-medium text-ink-100">{title}</h2>
        {hint && <p className="mt-0.5 text-[11px] text-ink-500 leading-relaxed max-w-2xl">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Shell({ children, asOf }: { children: React.ReactNode; asOf?: string }) {
  return (
    <div className="space-y-5">
      <header className="pt-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-3">Internal · Lifecycle</div>
        <h1 className="font-display text-[32px] lg:text-[40px] font-medium tracking-tightest text-ink-50">Lifecycle Analytics</h1>
        <p className="mt-3 text-[12.5px] text-ink-400">
          {asOf ? (
            <>
              onboarding as a measurable journey · as of <span className="text-ink-200 tabular-nums">{asOf} UTC</span> · live first-party data, no estimates.
            </>
          ) : (
            "Turn onboarding from a series of emails into a measurable customer journey."
          )}
        </p>
      </header>
      {children}
    </div>
  );
}
