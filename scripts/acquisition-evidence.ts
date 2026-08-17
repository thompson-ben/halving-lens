#!/usr/bin/env tsx
/**
 * Acquisition Evidence — a READ-ONLY analysis run, authorised at Founder Gate 1.
 *
 * Answers Q1–Q5 of the Acquisition Evidence Review plus the 90-day attribution
 * integrity report, the subscriber-behaviour-by-creative report and the live
 * /start headline A/B, using ONLY data that already exists.
 *
 * SAFETY — this script writes nothing, ever:
 *   · every request is an HTTP GET against PostgREST; there is no POST, PATCH,
 *     PUT or DELETE anywhere in this file, and no write helper is imported;
 *   · no new table, no new event, no persisted identity join, no score;
 *   · emailHash() is computed IN MEMORY to match subscribers to their own
 *     engagement events and is never written anywhere;
 *   · no email is sent and no Meta configuration is read or changed.
 *
 * MEASUREMENT DISCONTINUITY — Programme 1 changed the acquisition experience on
 * 2026-08-16 (merge a09bccd). Landing figures are therefore reported PRE-P1,
 * POST-P1 and FULL WINDOW, and the full window is labelled descriptive-only so
 * it can never be read as a causal comparison.
 *
 * ATTRIBUTION — every creative figure here is FIRST-TOUCH. The attribution a
 * visitor arrived with is captured once and never overwritten, so a returning
 * visitor's signup is credited to the ad that FIRST brought them, not the one
 * they last clicked. That is the model the product implements and this script
 * reports it as-is; it does not retrofit last-click.
 *
 *   npm run acquisition-evidence
 */
import { supabaseConfigured } from "../src/lib/supabase";
import { canonicalCreative } from "../src/lib/freeHeadlines";

// ── Completeness-proving reader (defect E-1) ───────────────────────────────
//
// The first production run used sbSelect, which issues no ORDER BY, no
// exact-count request and no pagination. PostgREST silently caps a response at
// the project's db-max-rows, so a TRUNCATED result was indistinguishable from
// an EMPTY one — every zero the report printed was ambiguous. That ambiguity is
// precisely what made "0 signup events" and "0 opens" unreadable.
//
// readAll() fixes that and nothing else: it asks for the exact total, orders
// deterministically so pages can neither overlap nor skip, pages until it holds
// everything, and returns the total so the report can state fetched-vs-total
// for every query. Still GET-only.
const SB_URL = process.env.SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const PAGE = 1000;

interface ReadResult<T> {
  rows: T[];
  total: number | null;
  complete: boolean;
}

async function readAll<T>(query: string): Promise<ReadResult<T>> {
  const rows: T[] = [];
  let total: number | null = null;
  const orderBy = query.startsWith("brief_subscribers") ? "signup_at" : "created_at";
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${SB_URL}/rest/v1/${query}&order=${orderBy}.asc`, {
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        Prefer: "count=exact",
        Range: `${from}-${from + PAGE - 1}`,
        "Range-Unit": "items",
      },
    });
    if (!res.ok && res.status !== 206) break;
    const t = res.headers.get("content-range")?.split("/")?.[1];
    if (t && t !== "*") total = Number(t);
    const page = (await res.json()) as T[];
    rows.push(...page);
    if (page.length < PAGE) break;
    if (total != null && rows.length >= total) break;
    if (from > 500_000) break; // hard stop; never loop forever
  }
  return { rows, total, complete: total == null ? false : rows.length >= total };
}

/** A zero is only meaningful when the fetch is provably complete. */
function completeness(label: string, r: ReadResult<unknown>) {
  const state = r.complete ? "COMPLETE" : "INCOMPLETE — treat zeros as UNKNOWN";
  console.log(`  ${label.padEnd(34)} fetched ${String(r.rows.length).padStart(6)} of ${String(r.total ?? "?").padStart(6)}   ${state}`);
}
import { emailHash } from "../src/lib/emailTracking";
import { AD_SPEND, usableSpend } from "../src/lib/data/adSpend";

// ── Windows ────────────────────────────────────────────────────────────────
const P1_CUTOVER = "2026-08-16"; // Programme 1 merged (a09bccd)
const DAY = 86_400_000;
const isoDaysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

interface EventRow {
  name: string;
  props: Record<string, unknown> | null;
  created_at: string;
}
interface SubRow {
  email: string;
  source: string | null;
  signup_at: string | null;
  status: string | null;
  unsubscribed_at: string | null;
}

const S = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const pct = (n: number, d: number): string => (d > 0 ? `${Math.round((n / d) * 1000) / 10}%` : "—");
const line = (c = "─") => console.log(c.repeat(78));
function head(t: string) {
  console.log("");
  line("═");
  console.log(t);
  line("═");
}
/** Every count is printed with its denominator — never a bare percentage. */
const frac = (n: number, d: number): string => `${n}/${d} (${pct(n, d)})`;

function table(headers: string[], rows: (string | number)[][]) {
  if (rows.length === 0) {
    console.log("  (no rows)");
    return;
  }
  const all = [headers, ...rows.map((r) => r.map(String))];
  const w = headers.map((_, i) => Math.max(...all.map((r) => String(r[i] ?? "").length)));
  const fmt = (r: (string | number)[]) => "  " + r.map((c, i) => String(c ?? "").padEnd(w[i])).join("  ");
  console.log(fmt(headers));
  console.log("  " + w.map((n) => "-".repeat(n)).join("  "));
  for (const r of rows) console.log(fmt(r));
}

async function main() {
  if (!supabaseConfigured) {
    console.error("[acquisition-evidence] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — cannot read anything.");
    console.error("Run this from the repository's GitHub Actions workflow, which has the secrets.");
    process.exit(1);
  }

  const since30 = isoDaysAgo(30);
  const since90 = isoDaysAgo(90);

  console.log("HALVINGLENS — ACQUISITION EVIDENCE (read-only)");
  console.log(`generated              : ${new Date().toISOString()}`);
  console.log(`30-day window from     : ${since30}`);
  console.log(`90-day window from     : ${since90}`);
  console.log(`Programme 1 cutover    : ${P1_CUTOVER} — landing figures split PRE / POST`);
  console.log(`attribution model      : FIRST-TOUCH (never last-click)`);

  // ── Load once, slice many. Funnel events over 90 days. ───────────────────
  const FUNNEL = ["landing_view", "subscription_submit_attempt", "signup", "subscription_failure", "subscription_existing", "landing_cta"];
  const funnelRead = await readAll<EventRow>(
    `events?select=name,props,created_at&name=in.(${FUNNEL.join(",")})&created_at=gte.${since90}`,
  );
  const events = funnelRead.rows;

  // Completeness FIRST. Per-name totals are requested independently so that
  // "0 signup events" is provable rather than inferred from a capped page.
  head("QUERY COMPLETENESS — read this before believing any zero");
  completeness("funnel events (90d)", funnelRead);
  for (const n of FUNNEL) {
    const r = await readAll<EventRow>(`events?select=created_at&name=eq.${n}&created_at=gte.${since90}`);
    console.log(`    ${n.padEnd(30)} total in 90d: ${r.total ?? "?"}`);
  }
  {
    const all = await readAll<EventRow>(`events?select=created_at&created_at=gte.${since90}`);
    console.log(`    ${"ALL events".padEnd(30)} total in 90d: ${all.total ?? "?"}`);
  }
  const inWindow = (r: EventRow, from: string, to?: string) => r.created_at >= from && (!to || r.created_at < to);
  const named = (rows: EventRow[], n: string) => rows.filter((r) => r.name === n);

  // ═══ Q1 · 30-day funnel by landing ══════════════════════════════════════
  head("Q1 · 30-DAY FUNNEL BY LANDING");
  const q1 = (from: string, to: string | undefined, label: string) => {
    const rows = events.filter((r) => inWindow(r, from, to));
    const keys = new Set<string>();
    for (const r of rows) if (S(r.props?.source)) keys.add(S(r.props?.source));
    const out = [...keys]
      .map((k) => {
        const of = (n: string) => rows.filter((r) => r.name === n && S(r.props?.source) === k).length;
        const views = of("landing_view");
        const attempts = of("subscription_submit_attempt");
        const signups = of("signup");
        return [k, views, attempts, signups, of("subscription_failure"), of("subscription_existing"),
          views > 0 ? pct(signups, views) : "—", attempts > 0 ? pct(signups, attempts) : "—"];
      })
      .sort((a, b) => Number(b[1]) - Number(a[1]));
    console.log(`\n${label}`);
    table(["landing", "views", "attempts", "signups", "fails", "existing", "view→signup", "attempt→signup"], out);
  };
  q1(since30, P1_CUTOVER, "PRE-P1 (30-day window up to the cutover)");
  q1(P1_CUTOVER, undefined, "POST-P1 (cutover to now)");
  q1(since30, undefined, "FULL 30-DAY WINDOW — DESCRIPTIVE ONLY, spans the cutover; not a causal comparison");

  // ═══ Q2 · Creative conversion by canonical creative ═════════════════════
  head("Q2 · CREATIVE CONVERSION BY CANONICAL CREATIVE — FIRST-TOUCH");
  {
    // `utm_content` arrives as either the Meta ad NAME or the ad ID, and one
    // creative angle can carry several ad IDs. Grouping on the raw value split
    // a single creative across two or three rows and made every one of them
    // look smaller than it was. Known identities are collapsed onto their
    // message key; anything unrecognised is still shown verbatim, never guessed
    // at and never silently merged.
    const rows = events.filter((r) => inWindow(r, since30));
    const groupOf = (r: EventRow): string => {
      const raw = S(r.props?.utm_content);
      if (!raw) return "(none)";
      const key = canonicalCreative(raw);
      return key ? `${key} (canonical)` : `${raw} (unmatched)`;
    };
    const keys = new Set<string>();
    for (const r of rows) keys.add(groupOf(r));
    const out = [...keys]
      .map((k) => {
        const match = (r: EventRow) => groupOf(r) === k;
        const views = rows.filter((r) => r.name === "landing_view" && match(r)).length;
        const signups = rows.filter((r) => r.name === "signup" && match(r)).length;
        return [k, views, signups, views > 0 ? pct(signups, views) : "—"];
      })
      .sort((a, b) => Number(b[1]) - Number(a[1]));
    table(["creative (canonical message)", "views", "signups", "view→signup"], out);
    console.log("\n  Small denominators are shown deliberately. A creative with <200 views");
    console.log("  cannot separate a 5% from a 7% conversion rate — read counts, not rates.");
    console.log("  Rows marked (unmatched) are ad identities with no entry in the alias map:");
    console.log("  they arrive tagged but cannot be message-matched on the landing page.");
  }

  // ═══ Q3 · /free message-match integrity ════════════════════════════════
  head("Q3 · /free MESSAGE-MATCH INTEGRITY");
  {
    const rows = events.filter((r) => r.name === "landing_view" && S(r.props?.source) === "/free" && inWindow(r, since30));
    // THREE states, not two. A row is MATCHED, a DROPPED PROMISE, or NOT
    // INSTRUMENTED — the `headline` prop only exists from 2026-07-28 (#155), so
    // earlier rows carry no headline at all and cannot be classified either way.
    // The first version counted only headline === "default" as dropped while
    // keeping every un-instrumented row in the denominator: the rate was
    // understated by construction and "0/222" was an artefact of the classifier,
    // not a finding about the ads.
    const cells = new Map<string, { ad: string; shown: string; n: number }>();
    for (const r of rows) {
      const ad = S(r.props?.utm_content) || "(no utm_content)";
      const shown = r.props && "headline" in r.props ? S(r.props.headline) || "(empty)" : "(not instrumented)";
      const key = JSON.stringify([ad, shown]);
      const cur = cells.get(key) ?? { ad, shown, n: 0 };
      cur.n += 1;
      cells.set(key, cur);
    }
    const classify = (c: { ad: string; shown: string }): string =>
      c.shown === "(not instrumented)"
        ? "PRE-INSTRUMENTATION — unclassifiable"
        : c.ad === "(no utm_content)"
          ? "no ad tag — nothing to match"
          : c.shown === "default"
            ? "PROMISE DROPPED"
            : "matched";
    const out = [...cells.values()]
      .map((c) => [c.ad, c.shown, c.n, classify(c)] as (string | number)[])
      .sort((x, y) => Number(y[2]) - Number(x[2]));
    table(["ad creative", "headline shown", "views", "classification"], out);

    const total = rows.length;
    const sum = (label: string) => out.filter((r) => r[3] === label).reduce((n, r) => n + Number(r[2]), 0);
    const preInstr = sum("PRE-INSTRUMENTATION — unclassifiable");
    const dropped = sum("PROMISE DROPPED");
    const matched = sum("matched");
    const noTag = sum("no ad tag — nothing to match");
    const instrumented = total - preInstr;
    console.log("");
    console.log(`  /free landing views in window ....... ${total}`);
    console.log(`  PRE-INSTRUMENTATION (before 28 Jul) . ${frac(preInstr, total)}  ← unclassifiable, EXCLUDED below`);
    console.log(`  instrumented denominator ............ ${instrumented}`);
    if (instrumented > 0) {
      console.log(`    · matched (promise continued) ..... ${frac(matched, instrumented)}`);
      console.log(`    · PROMISE DROPPED ................. ${frac(dropped, instrumented)}   ← THE CEILING`);
      console.log(`    · arrived with no ad tag .......... ${frac(noTag, instrumented)}`);
    } else {
      console.log("    NO INSTRUMENTED ROWS IN WINDOW — the message-match opportunity is UNKNOWN,");
      console.log("    not zero. Do not size an experiment from this.");
    }
  }

  // ═══ Q4 · Where signups fail ═══════════════════════════════════════════
  head("Q4 · SIGNUP FAILURES BY CATEGORY");
  {
    const rows = events.filter((r) => r.name === "subscription_failure" && inWindow(r, since30));
    const m = new Map<string, { landing: string; category: string; n: number }>();
    for (const r of rows) {
      const landing = S(r.props?.source) || "(none)";
      const category = S(r.props?.category) || "(none)";
      const key = JSON.stringify([landing, category]);
      const cur = m.get(key) ?? { landing, category, n: 0 };
      cur.n += 1;
      m.set(key, cur);
    }
    table(["landing", "failure category", "count"],
      [...m.values()].map((v) => [v.landing, v.category, v.n]).sort((x, y) => Number(y[2]) - Number(x[2])));
    console.log(`\n  Total failures in window: ${rows.length}`);
  }

  // ═══ Q5 + D · Subscriber ground truth and attribution integrity ═════════
  head("Q5 + ATTRIBUTION INTEGRITY · 90-DAY SUBSCRIBERS");
  const subsRead = await readAll<SubRow>(
    `brief_subscribers?select=email,source,signup_at,status,unsubscribed_at&signup_at=gte.${since90}`,
  );
  const subs = subsRead.rows;
  completeness("brief_subscribers (90d)", subsRead);
  const n90 = subs.length;
  const hasQuery = (s: SubRow) => (s.source ?? "").includes("?");
  const creativeOf = (s: SubRow): string | null => {
    const q = (s.source ?? "").split("?")[1];
    if (!q) return null;
    const v = new URLSearchParams(q).get("utm_content");
    return v && v.trim() !== "" ? v.trim() : null;
  };
  const landingOf = (s: SubRow) => ((s.source ?? "").split("?")[0] || "(none)");

  const attributable = subs.filter((s) => creativeOf(s) != null);
  const truncated = subs.filter((s) => (s.source ?? "").length >= 120);
  console.log(`  subscribers acquired in window ....... ${n90}`);
  console.log(`  carry an attribution query string .... ${frac(subs.filter(hasQuery).length, n90)}`);
  console.log(`  retain utm_content (the creative) .... ${frac(attributable.length, n90)}`);
  console.log(`  NOT attributable to a creative ....... ${frac(n90 - attributable.length, n90)}`);
  console.log(`  at/over the 120-char truncation ...... ${frac(truncated.length, n90)}`);
  console.log(`  unsubscribed .......................... ${frac(subs.filter((s) => s.status === "unsubscribed").length, n90)}`);

  const byLanding = new Map<string, number>();
  for (const s of subs) byLanding.set(landingOf(s), (byLanding.get(landingOf(s)) ?? 0) + 1);
  console.log("\n  Landing paths observed on the subscriber row:");
  table(["landing", "subscribers"], [...byLanding.entries()].sort((a, b) => b[1] - a[1]));

  const byCreative = new Map<string, SubRow[]>();
  for (const s of attributable) {
    const k = creativeOf(s) as string;
    (byCreative.get(k) ?? byCreative.set(k, []).get(k)!).push(s);
  }
  console.log("\n  Creative keys observed:");
  table(["creative", "subscribers"], [...byCreative.entries()].map(([k, v]) => [k, v.length]).sort((a, b) => Number(b[1]) - Number(a[1])));

  // ═══ G · signup events vs durable subscriber rows ══════════════════════
  head("G · SIGNUP EVENTS vs DURABLE SUBSCRIBER ROWS");
  {
    const evSignups = events.filter((r) => r.name === "signup" && inWindow(r, since30)).length;
    const rowsIn30 = subs.filter((s) => (s.signup_at ?? "") >= since30).length;
    console.log(`  signup events (30d) .................. ${evSignups}`);
    console.log(`  brief_subscribers rows (30d) ......... ${rowsIn30}`);
    const delta = rowsIn30 - evSignups;
    console.log(`  discrepancy .......................... ${delta > 0 ? "+" : ""}${delta}`);
    console.log("");
    console.log("  The subscriber table is GROUND TRUTH — the event only fires on confirmed");
    console.log("  durable capture, so it can never overstate. A shortfall of events means");
    console.log("  beacons were blocked or dropped; an excess would indicate a real defect.");
  }

  // ═══ E · Subscriber behaviour by creative (the authorised join) ════════
  head("E · 90-DAY SUBSCRIBER BEHAVIOUR BY CREATIVE — observable behaviour only, no score");
  {
    const engageRead = await readAll<EventRow>(
      `events?select=name,props,created_at&name=in.(email_open,email_click)&created_at=gte.${since90}`,
    );
    const engage = engageRead.rows;
    completeness("email engagement events (90d)", engageRead);
    // If opens really are zero, PROVE it here rather than inferring it from a
    // set that may have been capped.
    for (const n of ["email_open", "email_click"]) {
      const r = await readAll<EventRow>(`events?select=created_at&name=eq.${n}&created_at=gte.${since90}`);
      console.log(`    ${n.padEnd(30)} total in 90d: ${r.total ?? "?"}`);
    }
    const opens = named(engage, "email_open");
    const clicks = named(engage, "email_click");

    // Self-check: if the hashing secret here differs from the one used at send
    // time, NOTHING will match and every figure below would read as zero
    // engagement. Verify before interpreting.
    const knownSubs = new Set<string>();
    for (const r of engage) if (S(r.props?.sub)) knownSubs.add(S(r.props?.sub));
    const hashes = new Map<string, SubRow>();
    for (const s of subs) hashes.set(emailHash(s.email), s);
    const matched = [...hashes.keys()].filter((h) => knownSubs.has(h)).length;
    console.log(`  distinct sub hashes seen in events ... ${knownSubs.size}`);
    console.log(`  our subscribers matching one ......... ${frac(matched, n90)}`);
    if (matched === 0 && n90 > 0 && knownSubs.size > 0) {
      console.log("");
      console.log("  ⚠ ZERO MATCHES. The EMAIL_SECRET used here is NOT the one used when the");
      console.log("    emails were sent, so every figure below would be a false zero.");
      console.log("    STOPPING this section rather than reporting misleading numbers.");
      return;
    }

    const openedBy = new Map<string, Set<string>>(); // hash → campaigns opened
    const nonProxiedBy = new Map<string, Set<string>>();
    const clickedBy = new Map<string, Set<string>>();
    const dashCtaBy = new Set<string>();
    for (const r of opens) {
      const h = S(r.props?.sub);
      if (!h) continue;
      (openedBy.get(h) ?? openedBy.set(h, new Set()).get(h)!).add(S(r.props?.campaign));
      if (r.props?.proxied !== true) (nonProxiedBy.get(h) ?? nonProxiedBy.set(h, new Set()).get(h)!).add(S(r.props?.campaign));
    }
    for (const r of clicks) {
      const h = S(r.props?.sub);
      if (!h) continue;
      (clickedBy.get(h) ?? clickedBy.set(h, new Set()).get(h)!).add(S(r.props?.campaign));
      if (S(r.props?.cta) === "v2_dashboard_cta") dashCtaBy.add(h);
    }
    const dailyEditions = (h: string) => [...(clickedBy.get(h) ?? new Set<string>()), ...(openedBy.get(h) ?? new Set<string>())]
      .filter((c) => c.startsWith("daily-")).length;

    const cohortRow = (label: string, rows: SubRow[]) => {
      const n = rows.length;
      const hs = rows.map((s) => emailHash(s.email));
      const opened = hs.filter((h) => (openedBy.get(h)?.size ?? 0) > 0).length;
      const nonProx = hs.filter((h) => (nonProxiedBy.get(h)?.size ?? 0) > 0).length;
      const clicked = hs.filter((h) => (clickedBy.get(h)?.size ?? 0) > 0).length;
      const dash = hs.filter((h) => dashCtaBy.has(h)).length;
      const multi = hs.filter((h) => dailyEditions(h) >= 3).length;
      const unsub = rows.filter((s) => s.status === "unsubscribed").length;
      const days = rows
        .filter((s) => s.status === "unsubscribed" && s.signup_at && s.unsubscribed_at)
        .map((s) => (Date.parse(s.unsubscribed_at as string) - Date.parse(s.signup_at as string)) / DAY)
        .sort((a, b) => a - b);
      const median = days.length ? `${Math.round(days[Math.floor(days.length / 2)])}d` : "—";
      return [label, n, frac(opened, n), frac(nonProx, n), frac(clicked, n), frac(dash, n), frac(multi, n), frac(unsub, n), median];
    };

    const rows = [...byCreative.entries()].sort((a, b) => b[1].length - a[1].length).map(([k, v]) => cohortRow(k, v));
    if (attributable.length > 0) rows.push(cohortRow("— ALL ATTRIBUTABLE —", attributable));
    rows.push(cohortRow("— UNATTRIBUTABLE —", subs.filter((s) => creativeOf(s) == null)));
    table(["creative", "n", "≥1 open", "≥1 non-proxied open", "≥1 click", "clicked dashboard CTA", "≥3 editions", "unsubscribed", "median t-to-unsub"], rows);

    console.log("");
    console.log("  READING THIS TABLE:");
    console.log("  · Opens are proxy-inflated (Apple MPP, corporate image proxies). The");
    console.log("    non-proxied column is the more honest open measure; clicks and the");
    console.log("    ≥3-editions column deserve the most interpretive weight.");
    console.log("  · No score is computed and none should be. These are separate behaviours.");
    console.log("  · Any cohort with n < 30 cannot support a comparison. Read the counts.");
    console.log("  · Every figure is FIRST-TOUCH attributed.");
  }

  // ═══ F · The live /start headline A/B ══════════════════════════════════
  head("F · /start HEADLINE A/B — clarity (a) vs 'before you check the price' (b)");
  {
    const rows = events.filter((r) => inWindow(r, since90));
    const arm = (k: string) => {
      const m = (r: EventRow) => S(r.props?.variant) === k;
      const views = rows.filter((r) => r.name === "landing_view" && m(r)).length;
      const attempts = rows.filter((r) => r.name === "subscription_submit_attempt" && m(r)).length;
      const signups = rows.filter((r) => r.name === "signup" && m(r)).length;
      return { k, views, attempts, signups, cvr: views > 0 ? signups / views : null };
    };
    const a = arm("a");
    const b = arm("b");
    table(["arm", "headline", "views", "attempts", "signups", "CVR"], [
      ["a", "The clearest view of the Bitcoin cycle.", a.views, a.attempts, a.signups, a.cvr != null ? pct(a.signups, a.views) : "—"],
      ["b", "Know where Bitcoin sits — before you check the price.", b.views, b.attempts, b.signups, b.cvr != null ? pct(b.signups, b.views) : "—"],
    ]);

    if (a.views > 0 && b.views > 0) {
      const p1 = a.signups / a.views;
      const p2 = b.signups / b.views;
      const pPool = (a.signups + b.signups) / (a.views + b.views);
      const se = Math.sqrt(pPool * (1 - pPool) * (1 / a.views + 1 / b.views));
      const z = se > 0 ? Math.abs((p2 - p1) / se) : 0;
      const erf = (x: number) => {
        const t = 1 / (1 + 0.3275911 * Math.abs(x));
        const y = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) * Math.exp(-x * x);
        return x >= 0 ? y : -y;
      };
      const conf = se > 0 ? (2 * (0.5 * (1 + erf(z / Math.SQRT2))) - 1) * 100 : 0;
      console.log(`\n  absolute difference (b − a) .......... ${(100 * (p2 - p1)).toFixed(2)} pp`);
      console.log(`  relative difference .................. ${p1 > 0 ? `${Math.round(((p2 - p1) / p1) * 1000) / 10}%` : "—"}`);
      console.log(`  confidence (two-proportion z-test) ... ${Math.round(conf * 10) / 10}%`);
      console.log(`  significant at 95% ................... ${conf >= 95 ? "YES" : "NO"}`);
      console.log(`  sample sufficient for a decision ..... ${conf >= 95 ? "YES" : "NO — do not call it"}`);
    }
    console.log("\n  Experiment start 2026-06-01, status 'running' in the registry.");
    console.log("  A LANDING-HEADLINE RESULT IS NOT VALIDATION OF A MASTER PROPOSITION.");
    console.log("  Arm b shares vocabulary with the proposition under consideration; it");
    console.log("  measures a headline's effect on one paid landing, nothing more.");
  }

  // ═══ Spend ═════════════════════════════════════════════════════════════
  head("SPEND");
  {
    const usable = AD_SPEND.filter((a) => usableSpend(a.spend) != null);
    console.log(`  campaigns in adSpend.ts .............. ${AD_SPEND.length}`);
    console.log(`  with usable (positive) spend ......... ${usable.length}`);
    console.log(`  expected utm_campaign join keys ...... ${AD_SPEND.map((a) => a.campaign).join(", ") || "(none)"}`);
    const seen = new Set<string>();
    for (const r of events) if (S(r.props?.utm_campaign)) seen.add(S(r.props?.utm_campaign));
    console.log(`  utm_campaign values seen in events ... ${[...seen].join(", ") || "(none)"}`);
    const matchedKeys = AD_SPEND.filter((a) => seen.has(a.campaign)).map((a) => a.campaign);
    console.log(`  join keys that actually match ........ ${matchedKeys.join(", ") || "NONE — the spend join would return nothing"}`);
    if (usable.length === 0) {
      console.log("\n  No usable spend is recorded, so NO first-party cost per subscriber can be");
      console.log("  computed. Nothing here estimates, defaults or infers a figure.");
    }
  }

  console.log("");
  line("═");
  console.log("END — read-only. Nothing was written, sent or changed.");
  line("═");
}

main().catch((e) => {
  console.error(`[acquisition-evidence] failed: ${(e as Error).message}`);
  process.exit(1);
});
