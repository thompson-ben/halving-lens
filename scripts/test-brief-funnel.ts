// Daily Brief v2 (PR2) — the Brief → Dashboard qualified-visit join, pinned.
//
// Covers the commission's §8 validation list: the signed click still works,
// the redirect carries the correct NON-PERSONAL campaign/edition marker, no
// recipient identity ever reaches a destination URL, /api/track ingests an
// allowed marker and scrubs forged ones, attribution survives via the
// existing session model, the canonical qualified-visit predicate (≥60s OR
// ≥2 allowlisted interactions), non-Brief sessions unaffected, social UTMs
// separate, PR1 click labels intact, and existing dashboard/email
// measurement untouched.

import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  BRIEF_MARKER_PARAM,
  BRIEF_MARKER_RE,
  BRIEF_INTERACTION_EVENTS,
  QUALIFIED_ENGAGED_SECONDS,
  QUALIFIED_INTERACTIONS,
  appendBriefMarker,
  isQualifyingInteraction,
  parseBriefMarker,
  qualifiesVisit,
  scrubBriefProp,
} from "../src/lib/briefFunnel";
import { isTrackedEvent } from "../src/lib/analyticsEvents";

let failures = 0;
const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) console.log(`  ✓ ${name}`);
  else {
    failures++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
};
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

async function main() {
  // ═══ 1 · Marker shape: non-personal by construction ══════════════════════
  console.log("1 · The non-personal campaign/edition marker");
  {
    check("valid daily markers parse (all three activity classes)",
      ["daily-2026-08-29-active", "daily-2026-08-29-quiet", "daily-2026-08-29-mostly_quiet"].every((m) => parseBriefMarker(m) === m));
    const forged = [
      "daily-2026-08-29-active-x",
      "weekly-2026-W35",
      "daily-2026-08-29",
      "daily-2026-08-29-ACTIVE",
      "e=reader@example.com",
      "a".repeat(64),
      "daily-2026-08-29-active&sub=abc123",
      "", 42, null, undefined, { x: 1 },
    ];
    check("forged/malformed markers all fail safely (parse to null)", forged.every((m) => parseBriefMarker(m as never) == null));
    check("the marker grammar is campaign/edition ONLY (date + canonical class)", BRIEF_MARKER_RE.source.includes("daily-") && BRIEF_MARKER_RE.source.includes("quiet|mostly_quiet|active"));

    const u = new URL("https://halvinglens.com/cycle-dashboard#dashboard-market-board");
    appendBriefMarker(u, "daily-2026-08-29-active");
    check("appendBriefMarker sets hlb on the destination", u.searchParams.get(BRIEF_MARKER_PARAM) === "daily-2026-08-29-active");
    const u2 = new URL("https://halvinglens.com/cycle-dashboard");
    appendBriefMarker(u2, "weekly-2026-W35");
    check("non-daily campaigns append nothing", u2.searchParams.get(BRIEF_MARKER_PARAM) == null);
    appendBriefMarker(u, "daily-2026-08-30-quiet");
    check("an existing marker is never overwritten", u.searchParams.get(BRIEF_MARKER_PARAM) === "daily-2026-08-29-active");
  }

  // ═══ 2 · The signed click redirect (live route, PII-free destinations) ═══
  console.log("2 · Signed click → redirect → marker (no recipient identity)");
  {
    process.env.EMAIL_SECRET = "pr2-funnel-test-secret";
    const { unsubToken } = await import("../src/lib/emailToken");
    const { GET } = await import("../src/app/api/email/click/route");
    const email = "reader@example.com";
    const t = unsubToken(email);
    const call = async (campaign: string, u: string) => {
      const q = `e=${encodeURIComponent(email)}&t=${t}&c=${encodeURIComponent(campaign)}&cta=primary-cta&u=${encodeURIComponent(u)}`;
      const res = await GET(new Request(`https://halvinglens.com/api/email/click?${q}`));
      return { status: res.status, location: res.headers.get("location") ?? "" };
    };

    const daily = await call("daily-2026-08-29-active", "https://halvinglens.com/cycle-dashboard#dashboard-market-board");
    check("signed Brief click still redirects (302)", daily.status === 302, String(daily.status));
    check("same-host Daily Brief destination carries the marker", daily.location.includes("hlb=daily-2026-08-29-active"), daily.location);
    check("the fragment anchor survives the marker append", daily.location.includes("#dashboard-market-board"));
    const noPII = (loc: string) =>
      !loc.includes(encodeURIComponent(email)) && !/e=|t=|sub=|email/i.test(new URL(loc).search.replace(/hlb=[^&]*/, "")) && !/[0-9a-f]{16}/.test(new URL(loc).search);
    check("destination URL carries NO email/token/hash/recipient identifier", noPII(daily.location), daily.location);

    const weekly = await call("weekly-2026-W35", "https://halvinglens.com/cycle-dashboard");
    check("non-daily campaigns redirect unchanged (no marker)", weekly.status === 302 && !weekly.location.includes("hlb="));
    const forged = await call("daily-2026-08-29-active&x=1", "https://halvinglens.com/cycle-dashboard");
    check("a forged campaign appends nothing and still redirects safely", forged.status === 302 && !forged.location.includes("hlb="), forged.location);
    const external = await call("daily-2026-08-29-active", "https://www.youtube.com/@halvinglens");
    check("allowlisted external destinations never receive the marker", external.status === 302 && !external.location.includes("hlb="));
    const offsite = await call("daily-2026-08-29-active", "https://evil.example.com/x");
    check("open-redirect safety unchanged (off-site falls back to root)", offsite.status === 302 && new URL(offsite.location).host === "halvinglens.com");
    delete process.env.EMAIL_SECRET;
  }

  // ═══ 3 · Ingestion: /api/track accepts valid markers, scrubs forged ══════
  console.log("3 · Collection: valid markers ingest; forged markers scrubbed");
  {
    const good: Record<string, unknown> = { entry: true, brief: "daily-2026-08-29-active" };
    scrubBriefProp(good);
    check("a valid marker prop survives ingestion scrubbing", good.brief === "daily-2026-08-29-active");
    const bad: Record<string, unknown> = { entry: true, brief: "daily-2026-08-29-active\" onmouseover=alert(1)" };
    scrubBriefProp(bad);
    check("a forged marker prop is scrubbed; the event survives", !("brief" in bad) && bad.entry === true);
    const none: Record<string, unknown> = { entry: true };
    scrubBriefProp(none);
    check("non-Brief events are untouched by the scrub", none.entry === true && Object.keys(none).length === 1);

    const route = strip(readFileSync("src/app/api/track/route.ts", "utf8"));
    check("/api/track applies the scrub before storage", /scrubBriefProp\(props\)/.test(route) && route.indexOf("scrubBriefProp(props)") < route.indexOf('sbInsert("events"'));

    const { POST } = await import("../src/app/api/track/route");
    const res = await POST(
      new Request("https://halvinglens.com/api/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "page_view", path: "/cycle-dashboard", props: { entry: true, brief: "daily-2026-08-29-active" }, sessionId: "s-pr2-test", isNew: false }),
      }) as never,
    );
    check("a session-entry page_view carrying a valid marker is accepted (2xx)", (res as Response).status === 200);
  }

  // ═══ 4 · Session attribution + the canonical qualified-visit predicate ═══
  console.log("4 · Attribution survives the session; qualification predicate");
  {
    const track = strip(readFileSync("src/lib/track.ts", "utf8"));
    check("marker is captured at SESSION ENTRY via the existing session model (entryContext)", /parseBriefMarker\(q\.get\(BRIEF_MARKER_PARAM\)\)/.test(track) && /out\.brief = brief/.test(track));
    check("no parallel session model was created (hl.sid remains the boundary)", /hl\.sid/.test(track) && !/hl\.briefsid|briefSession/i.test(track));

    check("≥60s engagement qualifies (clause A)", qualifiesVisit({ engagedSeconds: 60, interactions: 0 }) && QUALIFIED_ENGAGED_SECONDS === 60);
    check("59s + one interaction does NOT qualify", !qualifiesVisit({ engagedSeconds: 59, interactions: 1 }));
    check("two allowlisted interactions qualify (clause B)", qualifiesVisit({ engagedSeconds: 0, interactions: 2 }) && QUALIFIED_INTERACTIONS === 2);
    check("one interaction alone does NOT qualify", !qualifiesVisit({ engagedSeconds: 0, interactions: 1 }));
    check("zero engagement, zero interactions never qualifies", !qualifiesVisit({ engagedSeconds: 0, interactions: 0 }));

    check("the interaction allowlist is exactly [section_click, lens_interact]", JSON.stringify(BRIEF_INTERACTION_EVENTS) === JSON.stringify(["section_click", "lens_interact"]));
    check("allowlisted interactions count only on the dashboard surface", isQualifyingInteraction("section_click", "/cycle-dashboard") && !isQualifyingInteraction("section_click", "/research"));
    check("passive events never count as interactions", !isQualifyingInteraction("section_view", "/cycle-dashboard") && !isQualifyingInteraction("section_dwell", "/cycle-dashboard") && !isQualifyingInteraction("page_view", "/cycle-dashboard") && !isQualifyingInteraction("engagement", "/cycle-dashboard"));
    check("lens_interact is a registered taxonomy event with a real call site", isTrackedEvent("lens_interact") && /lens_interact/.test(readFileSync("src/components/lens/CycleLensExplorer.tsx", "utf8")));
    check("the lens call site is throttled (one event per burst, not a stream)", /10_000/.test(readFileSync("src/components/lens/CycleLensExplorer.tsx", "utf8")));
  }

  // ═══ 5 · Channel separation + PR1 contracts intact ═══════════════════════
  console.log("5 · Brief channel separate; UTMs and PR1 labels intact");
  {
    const attribution = strip(readFileSync("src/lib/attribution.ts", "utf8"));
    check("first-touch acquisition attribution ignores the Brief marker (hlb not in FIELDS)", !/hlb/.test(attribution));
    check("the marker is not a UTM and social UTMs remain their own convention", BRIEF_MARKER_PARAM === "hlb" && !BRIEF_MARKER_PARAM.startsWith("utm"));

    const renderer = readFileSync("src/lib/briefEditionEmail.ts", "utf8");
    check("PR1 first-party labels remain exactly intact", /"primary-cta"/.test(renderer) && /"hero-card"/.test(renderer) && /supporting-\$\{d\.metricId\}/.test(renderer) && /"state-table"/.test(renderer));
    check("no email UTMs were introduced", !/utm_/.test(strip(renderer)) && !/utm_/.test(strip(readFileSync("src/lib/briefFunnel.ts", "utf8"))));

    const clickRoute = strip(readFileSync("src/app/api/email/click/route.ts", "utf8"));
    check("the signed click event recording is untouched (email_click with campaign/sub/cta)", /email_click/.test(clickRoute) && /emailHash\(email\)/.test(clickRoute));
    check("marker append is scoped to same-host targets in the redirect", /t\.host === SAME_HOST \|\| t\.host === SITE_HOST/.test(clickRoute));

    const funnel = strip(readFileSync("src/lib/briefFunnel.ts", "utf8"));
    check("no recipient identifier can enter the marker module (no email/hash imports)", !/emailHash|emailTracking|unsubToken/.test(funnel));

    const analytics = strip(readFileSync("src/lib/analytics.ts", "utf8"));
    check("reporting joins content labels from existing email_click events (aggregate), never URLs", /email_click/.test(analytics) && /clicksByLabel/.test(analytics));
    check("reporting computes qualification with the canonical predicate (no second definition)", /qualifiesVisit\(/.test(analytics) && !/>=\s*60|>=\s*2\b/.test(analytics.slice(analytics.indexOf("briefFunnel"))));
  }

  // ═══ 6 · Existing measurement operational ════════════════════════════════
  console.log("6 · Existing dashboard + email measurement untouched");
  {
    const events = strip(readFileSync("src/lib/analyticsEvents.ts", "utf8"));
    check("existing core events unchanged (page_view/engagement/section_*)", /"page_view"/.test(events) && /"engagement"/.test(events) && /"section_click"/.test(events) && /"section_dwell"/.test(events));
    const webhook = readFileSync("src/app/api/webhooks/resend/route.ts", "utf8");
    check("email_events webhook path untouched by PR2", !/briefFunnel|hlb/.test(webhook));
    const open = readFileSync("src/app/api/email/open/route.ts", "utf8");
    check("open-pixel measurement untouched", !/briefFunnel|hlb/.test(open));
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll brief-funnel checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
