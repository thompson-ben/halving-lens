/* eslint-disable no-console */
/**
 * AUDIENCE EVIDENCE — the first read-only pass at "who actually uses
 * HalvingLens?" (Founder commission D2, 21 Aug 2026.)
 *
 * READ-ONLY BY CONSTRUCTION: every request is a paged GET with an exact
 * count; there is no insert, update, delete or send anywhere in this file.
 * No schema, no new tables, no new events, no scoring, no segmentation
 * models, no sensitive-attribute inference.
 *
 * Identity joins used, with their PROVEN semantics (audit, 21 Aug 2026):
 *   email      — brief_subscribers ↔ pro_waitlist (both normalised, unique)
 *   emailHash  — email_events.email_hash is emailHash(recipient); the same
 *                function recomputed over subscriber emails joins delivery/
 *                engagement to subscribers. Requires the production
 *                EMAIL_SECRET; a self-check refuses engagement figures if
 *                the secret is wrong rather than printing false zeros.
 *   props.sub  — /api/track stamps the recognised subscriber's emailHash on
 *                events carrying a member-session cookie. COVERAGE IS
 *                PARTIAL by design: only visits where the member session is
 *                present. Absence of props.sub is NOT absence of the visit.
 *   canonical message key — utm_content (ad name OR numeric ad ID, original
 *                OR refreshed) collapses through the /free alias map, so one
 *                commercial proposition is never split across alias shapes.
 *
 * Labels: FACT (a durable row), DERIVED (computed from facts with stated
 * rules), INFERENCE (plausible, marked), UNKNOWN (not measurable today).
 * Every rate prints numerator/denominator; every cohort prints N.
 *
 * Measurement discontinuities respected (no naive before/after claims):
 *   2026-08-16  Programme 1 cutover / Meta export boundary
 *   2026-08-17  PR #209 attribution-ordering repair (tag coverage improves)
 *   2026-08-20  refreshed Meta ads created (launch discontinuity)
 *
 * Run: npm run audience-evidence   (GitHub Actions workflow has the secrets)
 */

import { supabaseConfigured } from "../src/lib/supabase";
import { emailHash } from "../src/lib/emailTracking";
import { canonicalCreative } from "../src/lib/freeHeadlines";

const SB_URL = process.env.SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const PAGE = 1000;

const DISCONTINUITIES = ["2026-08-16", "2026-08-17", "2026-08-20"] as const;

interface ReadResult<T> {
  rows: T[];
  total: number | null;
  complete: boolean;
}

async function readAll<T>(query: string, orderBy: string): Promise<ReadResult<T>> {
  const rows: T[] = [];
  let total: number | null = null;
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
  console.log(`  ${label.padEnd(30)} fetched ${String(r.rows.length).padStart(6)} of ${String(r.total ?? "?").padStart(6)}   ${state}`);
}

const S = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const pct = (n: number, d: number): string => (d > 0 ? `${Math.round((n / d) * 1000) / 10}%` : "—");
const frac = (n: number, d: number): string => `${n}/${d} (${pct(n, d)})`;
const line = (c = "─") => console.log(c.repeat(78));
function head(t: string) {
  console.log("");
  line("═");
  console.log(t);
  line("═");
}
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
/** Cohorts below this N are shown but explicitly not ranked. */
const SMALL_N = 30;
const nTag = (n: number): string => (n < SMALL_N ? ` (N=${n} — small, not ranked)` : ` (N=${n})`);

// ── Row shapes ─────────────────────────────────────────────────────────────
interface SubRow {
  email: string;
  source: string | null;
  signup_at: string | null;
  status: string | null;
  unsubscribed_at: string | null;
}
interface EventRow {
  name: string;
  props: Record<string, unknown> | null;
  created_at: string;
}
interface EmailEventRow {
  category: string;
  email_hash: string | null;
  campaign: string | null;
  occurred_at: string | null;
}
interface WaitRow {
  email: string;
  source: string;
  created_at: string;
}

// ── Acquisition parsing (DERIVED, rules stated inline) ─────────────────────
// StartSignup writes source as "<surface>?<attribution-qs>" (120-char cap —
// campaign_id onward is usually truncated; utm_content survives). BriefSignup
// surfaces write a bare pathname. Anything else is unknown.
interface Acq {
  surface: string;
  channel: "paid" | "organic-surface" | "unknown";
  utmSource: string | null;
  campaign: string | null;
  adIdentity: string | null; // raw utm_content
  message: string | null; // canonical message key via the alias map
  refreshed: boolean | null; // refreshed ("b") identity vs original — null when unknowable
}
function parseAcq(source: string | null): Acq {
  const s = S(source);
  if (!s) return { surface: "(none)", channel: "unknown", utmSource: null, campaign: null, adIdentity: null, message: null, refreshed: null };
  const qIdx = s.indexOf("?");
  const surface = qIdx === -1 ? s : s.slice(0, qIdx);
  if (qIdx === -1) {
    // A bare pathname carries no attribution — an organic-surface signup, not
    // proof the visitor was organic (BriefSignup surfaces drop attribution).
    return { surface, channel: "organic-surface", utmSource: null, campaign: null, adIdentity: null, message: null, refreshed: null };
  }
  const q = new URLSearchParams(s.slice(qIdx + 1));
  const utmSource = q.get("utm_source");
  const content = q.get("utm_content");
  const message = content ? ((): string | null => {
    const key = canonicalCreative(content);
    return key === "default" ? null : key;
  })() : null;
  const paid = utmSource != null && /^(meta|fb|facebook|ig|instagram)$/i.test(utmSource);
  const refreshed = content == null ? null
    : /b_/.test(content) || /^5255/.test(content) ? true
    : /^hl_meta_001_ad\d{3}_/.test(content) || /^525[23]/.test(content) ? false
    : null;
  return {
    surface,
    channel: paid ? "paid" : utmSource ? "unknown" : "organic-surface",
    utmSource,
    campaign: q.get("utm_campaign"),
    adIdentity: content,
    message,
    refreshed,
  };
}

async function main() {
  if (!supabaseConfigured) {
    console.error("[audience-evidence] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — cannot read anything.");
    console.error("Run this from the repository's GitHub Actions workflow, which has the secrets.");
    process.exit(1);
  }

  head("AUDIENCE EVIDENCE — read-only · " + new Date().toISOString().slice(0, 16) + "Z");
  console.log("  Labels: FACT / DERIVED / INFERENCE / UNKNOWN. Every rate shows n/d.");
  console.log("  Discontinuities (no before/after claims across them): " + DISCONTINUITIES.join(", "));

  // ═══ Reads, with proven completeness ════════════════════════════════════
  const since90 = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const [subsR, waitR, mailR, eventsR] = [
    await readAll<SubRow>("brief_subscribers?select=email,source,signup_at,status,unsubscribed_at", "signup_at"),
    await readAll<WaitRow>("pro_waitlist?select=email,source,created_at", "created_at"),
    await readAll<EmailEventRow>("email_events?select=category,email_hash,campaign,occurred_at", "created_at"),
    await readAll<EventRow>(`events?select=name,props,created_at&created_at=gte.${encodeURIComponent(since90)}`, "created_at"),
  ];
  head("READ COMPLETENESS (a zero below an INCOMPLETE read is UNKNOWN, not zero)");
  completeness("brief_subscribers", subsR);
  completeness("pro_waitlist", waitR);
  completeness("email_events", mailR);
  completeness("events (90d window)", eventsR);

  const subs = subsR.rows;
  const waitlist = waitR.rows;
  const mail = mailR.rows;
  const events = eventsR.rows;

  // Hash self-check: engagement joins are only reported if the recomputed
  // subscriber hashes actually appear in email_events — otherwise the secret
  // is wrong and every join would be a false zero.
  const hashOf = new Map<string, string>();
  for (const s of subs) hashOf.set(s.email, emailHash(s.email));
  const mailHashes = new Set(mail.map((m) => m.email_hash).filter(Boolean) as string[]);
  const subHashes = new Set(hashOf.values());
  const matched = [...mailHashes].filter((h) => subHashes.has(h)).length;
  const hashJoinOk = mailHashes.size === 0 || matched > 0;
  console.log(`  hash self-check: ${matched} of ${mailHashes.size} email_events hashes match a subscriber ` +
    (hashJoinOk ? "(join usable)" : "(JOIN BROKEN — wrong EMAIL_SECRET; engagement figures withheld)"));

  const active = (s: SubRow) => s.status == null || s.status === "active";
  const isoNow = new Date().toISOString();
  const daysAgoIso = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

  // ═══ A · SUBSCRIBER BASE ════════════════════════════════════════════════
  head("A · SUBSCRIBER BASE");
  {
    const total = subs.length;
    const act = subs.filter(active).length;
    const unsub = subs.filter((s) => s.status === "unsubscribed").length;
    console.log(`  Total subscribers (all time) ......... ${total}   [FACT — durable rows${subsR.complete ? "" : "; READ INCOMPLETE"}]`);
    console.log(`  Active ............................... ${frac(act, total)}   [FACT — status null/active]`);
    console.log(`  Unsubscribed ......................... ${frac(unsub, total)}   [FACT]`);
    const in7 = subs.filter((s) => (s.signup_at ?? "") >= daysAgoIso(7)).length;
    const in30 = subs.filter((s) => (s.signup_at ?? "") >= daysAgoIso(30)).length;
    console.log(`  New · 7D ............................. ${in7}   [FACT — signup_at window]`);
    console.log(`  New · 30D ............................ ${in30}   [FACT — spans the 16–17 Aug and 20 Aug discontinuities]`);
    const ageDays = (s: SubRow) => (s.signup_at ? (Date.parse(isoNow) - Date.parse(s.signup_at)) / 86_400_000 : null);
    const cohorts: [string, (d: number) => boolean][] = [
      ["0–7 days", (d) => d <= 7],
      ["8–30 days", (d) => d > 7 && d <= 30],
      ["31–90 days", (d) => d > 30 && d <= 90],
      ["90+ days", (d) => d > 90],
    ];
    table(["age cohort (since signup)", "N", "share of total"], cohorts.map(([label, f]) => {
      const n = subs.filter((s) => { const d = ageDays(s); return d != null && f(d); }).length;
      return [label, n, pct(n, total)];
    }));
    const noDate = subs.filter((s) => !s.signup_at).length;
    if (noDate) console.log(`  (rows with no signup_at: ${noDate} — excluded from cohorts, counted in totals)`);
  }

  // ═══ B · ACQUISITION ════════════════════════════════════════════════════
  head("B · ACQUISITION (per subscriber's own durable source — first-touch, 120-char truncation caveat)");
  {
    const parsed = subs.map((s) => ({ s, a: parseAcq(s.source) }));
    const byChannel = new Map<string, number>();
    for (const { a } of parsed) byChannel.set(a.channel, (byChannel.get(a.channel) ?? 0) + 1);
    table(["channel", "subscribers", "of total"], [...byChannel.entries()]
      .sort((x, y) => y[1] - x[1])
      .map(([c, n]) => [c === "organic-surface" ? "organic-surface (no attribution recorded)" : c, n, pct(n, subs.length)]));
    console.log("  [DERIVED — parsed from brief_subscribers.source. \"organic-surface\" means the");
    console.log("   signup surface recorded no attribution (most non-landing forms drop it); it is");
    console.log("   NOT proof the visitor arrived organically. UNKNOWN populations are shown, not hidden.]");

    const paid = parsed.filter(({ a }) => a.channel === "paid");
    console.log(`\n  Paid subscribers by CANONICAL MESSAGE (aliases collapsed — one proposition, one row):`);
    const byMsg = new Map<string, { n: number; orig: number; refr: number; unk: number }>();
    for (const { a } of paid) {
      const key = a.message ?? (a.adIdentity ? `(unmatched: ${a.adIdentity})` : "(no ad identity)");
      const e = byMsg.get(key) ?? { n: 0, orig: 0, refr: 0, unk: 0 };
      e.n++;
      if (a.refreshed === true) e.refr++;
      else if (a.refreshed === false) e.orig++;
      else e.unk++;
      byMsg.set(key, e);
    }
    table(["canonical message", "subs", "via original ids", "via refreshed ids", "id shape unknown"],
      [...byMsg.entries()].sort((x, y) => y[1].n - x[1].n).map(([k, v]) => [k, v.n, v.orig, v.refr, v.unk]));
    console.log("  [DERIVED — canonical key via the /free alias map; original vs refreshed kept");
    console.log("   distinct within each message. Refreshed identities only exist from 20 Aug, so");
    console.log("   original-vs-refreshed volumes are NOT comparable performance — different eras.]");
    const camp = new Map<string, number>();
    for (const { a } of paid) if (a.campaign) camp.set(a.campaign, (camp.get(a.campaign) ?? 0) + 1);
    if (camp.size) table(["campaign", "paid subs"], [...camp.entries()].sort((x, y) => y[1] - x[1]).map(([k, n]) => [k, n]));
  }

  // ═══ C · POST-SIGNUP USE ════════════════════════════════════════════════
  head("C · POST-SIGNUP USE (observable components only — no invented engagement score)");
  const mailBySub = new Map<string, EmailEventRow[]>();
  for (const m of mail) if (m.email_hash) {
    const arr = mailBySub.get(m.email_hash) ?? [];
    arr.push(m);
    mailBySub.set(m.email_hash, arr);
  }
  const siteBySub = new Map<string, EventRow[]>();
  for (const e of events) {
    const sub = S(e.props?.sub);
    if (!sub) continue;
    const arr = siteBySub.get(sub) ?? [];
    arr.push(e);
    siteBySub.set(sub, arr);
  }
  const earliestMail = mail.reduce<string | null>((min, m) => (m.occurred_at && (!min || m.occurred_at < min) ? m.occurred_at : min), null);
  {
    if (!hashJoinOk) {
      console.log("  WITHHELD — the hash self-check failed; every figure here would be a false zero.");
    } else {
      const total = subs.length;
      const withCat = (cat: string) => subs.filter((s) => (mailBySub.get(hashOf.get(s.email)!) ?? []).some((m) => m.category === cat)).length;
      console.log(`  email_events history starts ........... ${earliestMail ?? "UNKNOWN"}   [FACT — sends before this are invisible here]`);
      console.log(`  ≥1 delivered .......................... ${frac(withCat("delivered"), total)}   [FACT via emailHash join]`);
      console.log(`  ≥1 open ............................... ${frac(withCat("opened"), total)}   [DERIVED — Apple MPP inflates opens; treat as upper bound]`);
      console.log(`  ≥1 click .............................. ${frac(withCat("clicked"), total)}   [FACT — clicks are human]`);
      const onSite = subs.filter((s) => siteBySub.has(hashOf.get(s.email)!)).length;
      const repeat = subs.filter((s) => {
        const days = new Set((siteBySub.get(hashOf.get(s.email)!) ?? []).map((e) => e.created_at.slice(0, 10)));
        return days.size >= 2;
      }).length;
      console.log(`  Recognised on site (90d) .............. ${frac(onSite, total)}   [FACT via props.sub — PARTIAL coverage: only`);
      console.log("                                            member-session visits carry the stamp; absence ≠ no visit]");
      console.log(`  Repeat site activity (≥2 days, 90d) ... ${frac(repeat, total)}   [DERIVED — distinct active days over props.sub]`);
      const recent7 = subs.filter((s) => (siteBySub.get(hashOf.get(s.email)!) ?? []).some((e) => e.created_at >= daysAgoIso(7))).length;
      console.log(`  Recognised on site · last 7D .......... ${frac(recent7, total)}   [FACT via props.sub, same coverage caveat]`);
      console.log(`  Unsubscribed .......................... ${frac(subs.filter((s) => s.status === "unsubscribed").length, total)}   [FACT]`);
      console.log("  Dashboard/product-level use per subscriber beyond the above ... UNKNOWN (page-level");
      console.log("  events carry props.sub only when the member session is present; per-surface splits");
      console.log("  would be partial-coverage guesses — not reported).");
    }
  }

  // ═══ D · ACQUISITION → USE ══════════════════════════════════════════════
  head("D · ACQUISITION → USE — which promises acquire people who then use the product?");
  {
    if (!hashJoinOk) {
      console.log("  WITHHELD — engagement joins unavailable (hash self-check failed).");
    } else {
      const groups = new Map<string, SubRow[]>();
      for (const s of subs) {
        const a = parseAcq(s.source);
        const key = a.channel === "paid"
          ? `paid · ${a.message ?? "(unmatched identity)"}`
          : a.channel === "organic-surface" ? `surface · ${a.surface}` : "unknown";
        const arr = groups.get(key) ?? [];
        arr.push(s);
        groups.set(key, arr);
      }
      const rows: (string | number)[][] = [];
      for (const [key, members] of [...groups.entries()].sort((x, y) => y[1].length - x[1].length)) {
        const n = members.length;
        const h = (s: SubRow) => hashOf.get(s.email)!;
        const del = members.filter((s) => (mailBySub.get(h(s)) ?? []).some((m) => m.category === "delivered")).length;
        const open = members.filter((s) => (mailBySub.get(h(s)) ?? []).some((m) => m.category === "opened")).length;
        const click = members.filter((s) => (mailBySub.get(h(s)) ?? []).some((m) => m.category === "clicked")).length;
        const site = members.filter((s) => siteBySub.has(h(s))).length;
        const rep = members.filter((s) => new Set((siteBySub.get(h(s)) ?? []).map((e) => e.created_at.slice(0, 10))).size >= 2).length;
        const uns = members.filter((s) => s.status === "unsubscribed").length;
        const wl = members.filter((s) => waitlist.some((w) => w.email === s.email)).length;
        rows.push([key + (n < SMALL_N ? " *" : ""), n, frac(del, n), frac(open, n), frac(click, n), frac(site, n), frac(rep, n), frac(uns, n), wl]);
      }
      table(["acquisition group", "N", "delivered≥1", "opened≥1†", "clicked≥1", "on-site‡", "repeat‡", "unsub", "waitlist"], rows);
      console.log(`  *  N < ${SMALL_N}: shown for completeness, NOT ranked — differences are noise at this size.`);
      console.log("  †  opens are MPP-inflated (upper bound).  ‡ props.sub partial coverage: absence ≠ no visit.");
      console.log("  No composite quality score is computed — read the columns, not a ranking.");
      console.log("  Refreshed-ad cohorts are days old and span the 20 Aug discontinuity: counts only, no verdicts.");
    }
  }

  // ═══ E · PRO INTENT ═════════════════════════════════════════════════════
  head("E · PRO INTENT");
  {
    console.log(`  Pro waitlist members (canonical) ...... ${waitlist.length}   [FACT — COUNT(*) of pro_waitlist${waitR.complete ? "" : "; READ INCOMPLETE"}]`);
    const subEmails = new Set(subs.map((s) => s.email));
    const both = waitlist.filter((w) => subEmails.has(w.email));
    console.log(`  Also identifiable Brief subscribers ... ${frac(both.length, waitlist.length)}   [FACT — email join]`);
    const bySrc = new Map<string, number>();
    for (const w of both) {
      const a = parseAcq(subs.find((s) => s.email === w.email)?.source ?? null);
      const key = a.channel === "paid" ? `paid · ${a.message ?? "(unmatched)"}` : a.channel === "organic-surface" ? `surface · ${a.surface}` : "unknown";
      bySrc.set(key, (bySrc.get(key) ?? 0) + 1);
    }
    if (bySrc.size) {
      table(["waitlist subscriber's acquisition", "n"], [...bySrc.entries()].sort((x, y) => y[1] - x[1]).map(([k, n]) => [k, n]));
    }
    if (hashJoinOk && subs.length > 0) {
      const wlSubs = subs.filter((s) => waitlist.some((w) => w.email === s.email));
      const nonWl = subs.filter((s) => !waitlist.some((w) => w.email === s.email));
      const rate = (pop: SubRow[], f: (s: SubRow) => boolean) => frac(pop.filter(f).length, pop.length);
      const clicked = (s: SubRow) => (mailBySub.get(hashOf.get(s.email)!) ?? []).some((m) => m.category === "clicked");
      const onSite = (s: SubRow) => siteBySub.has(hashOf.get(s.email)!);
      console.log(`\n  OBSERVATIONAL comparison (no causal claim either direction):`);
      console.log(`    waitlist subscribers${nTag(wlSubs.length)}: clicked≥1 ${rate(wlSubs, clicked)} · on-site ${rate(wlSubs, onSite)}`);
      console.log(`    other subscribers${nTag(nonWl.length)}: clicked≥1 ${rate(nonWl, clicked)} · on-site ${rate(nonWl, onSite)}`);
    }
    const nonSub = waitlist.length - both.length;
    if (nonSub > 0) console.log(`  Waitlist members who are NOT Brief subscribers: ${nonSub} — Pro intent without the newsletter [FACT]`);
  }

  // ═══ F · RETENTION / TENURE ═════════════════════════════════════════════
  head("F · RETENTION / TENURE — what the data honestly supports");
  {
    if (!hashJoinOk) {
      console.log("  WITHHELD — engagement joins unavailable.");
    } else {
      console.log("  True product retention (a defined active state per period) ... UNKNOWN — the");
      console.log("  product's engagement events do not define an activity contract per subscriber-week.");
      console.log("  Closest observable facts, per signup cohort (email history starts " + (earliestMail ?? "?") + "):");
      const windows: [string, number][] = [["D7", 7], ["D14", 14], ["D30", 30]];
      const rows: (string | number)[][] = [];
      for (const [label, days] of windows) {
        // Only subscribers whose first N days are fully inside observable email
        // history AND fully elapsed can be judged — anyone else is excluded,
        // not counted as failed.
        const eligible = subs.filter((s) => s.signup_at &&
          s.signup_at >= (earliestMail ?? "9999") &&
          Date.parse(s.signup_at) + days * 86_400_000 <= Date.now());
        const engaged = eligible.filter((s) => {
          const end = Date.parse(s.signup_at!) + days * 86_400_000;
          return (mailBySub.get(hashOf.get(s.email)!) ?? []).some((m) =>
            m.category === "clicked" && m.occurred_at != null &&
            Date.parse(m.occurred_at) >= Date.parse(s.signup_at!) && Date.parse(m.occurred_at) <= end);
        }).length;
        const stillActive = eligible.filter(active).length;
        rows.push([label, eligible.length, frac(engaged, eligible.length), frac(stillActive, eligible.length)]);
      }
      table(["window", "eligible N (fully observable + elapsed)", "clicked within window", "still subscribed today"], rows);
      console.log("  [DERIVED — clicks only (opens MPP-inflated). 'Still subscribed' is measured TODAY,");
      console.log("   not at window end (unsubscribe timestamps make a true windowed rate possible later).]");
    }
  }

  // ═══ G · FEEDBACK / TESTIMONIALS ════════════════════════════════════════
  head("G · FEEDBACK / TESTIMONIALS — joinability audit");
  {
    const fb = events.filter((e) => /feedback|vote|helpful/i.test(e.name));
    const withVid = fb.filter((e) => S(e.props?.visitorId)).length;
    const withSub = fb.filter((e) => S(e.props?.sub)).length;
    console.log(`  Feedback-class events (90d) ........... ${fb.length}   [FACT]`);
    console.log(`  … carrying visitorId .................. ${frac(withVid, fb.length)}   [FACT — joins to anonymous journeys]`);
    console.log(`  … carrying props.sub .................. ${frac(withSub, fb.length)}   [FACT — these join to subscriber status,`);
    console.log("                                            acquisition and engagement legitimately]");
    console.log("  Feedback WITHOUT props.sub cannot be tied to a subscriber — visitorId↔subscriber has");
    console.log("  no recorded link and co-occurrence guessing is not a legitimate join. UNKNOWN, by design.");
    console.log("  No sentiment scoring or trait inference is performed on free text.");
  }

  // ═══ H · DELIVERY HEALTH ════════════════════════════════════════════════
  head("H · DELIVERY HEALTH (existing provider webhooks only — nothing new added)");
  {
    const byCat = new Map<string, number>();
    for (const m of mail) byCat.set(m.category, (byCat.get(m.category) ?? 0) + 1);
    table(["category (email_events)", "events"], [...byCat.entries()].sort((x, y) => y[1] - x[1]).map(([k, n]) => [k, n]));
    console.log(`  History starts ${earliestMail ?? "UNKNOWN"} — sends before this are invisible to the webhook sink [FACT].`);
    if (hashJoinOk) {
      const act = subs.filter(active);
      const h = (s: SubRow) => hashOf.get(s.email)!;
      const bounced = act.filter((s) => (mailBySub.get(h(s)) ?? []).some((m) => m.category === "bounced"));
      const complained = act.filter((s) => (mailBySub.get(h(s)) ?? []).some((m) => m.category === "complained"));
      const neverDelivered = act.filter((s) => (mailBySub.get(h(s)) ?? []).filter((m) => m.category === "delivered").length === 0);
      const recentSilent = act.filter((s) => {
        const ms = mailBySub.get(h(s)) ?? [];
        const sent14 = ms.some((m) => (m.category === "sent" || m.category === "delivered") && (m.occurred_at ?? "") >= daysAgoIso(14));
        const delivered14 = ms.some((m) => m.category === "delivered" && (m.occurred_at ?? "") >= daysAgoIso(14));
        return sent14 && !delivered14;
      });
      console.log(`\n  Active subscribers with ≥1 bounce ..... ${frac(bounced.length, act.length)}   [FACT]`);
      console.log(`  Active subscribers with a complaint ... ${frac(complained.length, act.length)}   [FACT]`);
      console.log(`  Active with NO delivered event ever ... ${frac(neverDelivered.length, act.length)}   [DERIVED — includes anyone who`);
      console.log("                                            joined before the webhook history started; not all are broken]");
      console.log(`  Sent-but-not-delivered · last 14D ..... ${frac(recentSilent.length, act.length)}   [DERIVED — the \"subscribed but not`);
      console.log("                                            receiving\" signature the recent user report describes]");
      console.log("\n  FEASIBILITY: subscriber-level Admin delivery health IS feasible from existing data —");
      console.log("  per-subscriber category rollups via the same emailHash join used here, no new tracking.");
      console.log("  Suppression/block lists live at the provider and are NOT visible in this sink [UNKNOWN].");
    }
  }

  // ═══ NEW-TO-BITCOIN ═════════════════════════════════════════════════════
  head("NEW-TO-BITCOIN / LEARNING DEMAND");
  {
    console.log("  No existing event records a first-party answer about experience level, and the");
    console.log("  commission forbids inferring it from ads clicked, behaviour or any proxy.");
    console.log("  NEW-TO-BITCOIN AUDIENCE SIZE = UNKNOWN.");
    console.log("  (Visits to /start-here measure interest in that PAGE — deliberately not used as a");
    console.log("  proxy for who those visitors are.)");
  }

  // ═══ CLOSING SUMMARY ════════════════════════════════════════════════════
  head("CLOSING SUMMARY — the eight commissioned answers");
  console.log(`
  1. WHAT WE NOW KNOW — printed above with labels: the subscriber base and its
     age structure (A), the trustworthy acquisition split with aliases collapsed
     to propositions (B), the observable use components (C), acquisition→use by
     group with denominators (D), canonical Pro intent and its overlap (E),
     honest tenure windows (F), which feedback is legitimately joinable (G),
     and today's delivery-health picture (H).
  2. PROMISING BUT NOT PROVEN — any group in D whose columns look strong at
     N < ${SMALL_N}, and every refreshed-ad cohort (days old, spans 20 Aug).
     Observational waitlist-vs-other engagement differences (E) prove no cause.
  3. STILL CANNOT KNOW — organic-surface subscribers' true origin (attribution
     is dropped by most non-landing forms); site behaviour of subscribers
     without a member session; provider-side suppressions; retention as a
     defined active state; new-to-Bitcoin size (UNKNOWN by design).
  4. HIGHEST-VALUE MISSING SIGNALS —
       · attribution on the non-landing signup surfaces (13 forms drop it);
       · a member-session prompt so props.sub coverage becomes interpretable;
       · unsubscribe-at-window retention (timestamps exist; definition work);
       · Metric Watch behavioural events (separate D3 proposal);
       · an explicit first-party new-to-Bitcoin question, if ever wanted.
  5. RECOMMENDED ADMIN REPORTING — the D1 Pro-waitlist count (shipped for
     review); a subscriber-level delivery-health rollup (H proves feasibility);
     nothing else until this report has been read against real data.
  6. RECOMMENDED INSTRUMENTATION — none inside this commission. D3 arrives as
     a design-only proposal; the signals in (4) each need their own decision.
  7. DECISIONS THE EVIDENCE COULD SUPPORT — which propositions to keep funding
     appears in D once cohorts pass N ≥ ${SMALL_N} with full post-20-Aug eras;
     delivery-health follow-up for the sent-but-not-delivered cohort (H).
  8. DECISIONS NOT TO MAKE YET — ranking refreshed vs original creatives
     (different eras); anything from opens alone (MPP); anything causal about
     waitlist intent; any audience persona claim beyond what A–E show.
`);
  console.log("  Read-only run complete. Nothing was written, sent or changed.");
}

main().catch((e) => {
  console.error("[audience-evidence] failed:", e);
  process.exit(1);
});
