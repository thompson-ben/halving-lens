// B-1 — canonical card caption link (founder-only attribution helper).
//
// Pins the approved convention so it can never drift:
//   utm_source=social · utm_medium=card
//   utm_content=card_<metricId>_p<period>_<yyyymmdd>
//   destination = the existing public landing destination (/cycle-dashboard)
// and the refusal rule: malformed card identity can never silently generate
// a mislabelled attribution URL — the helper returns null instead.
//
// Also pins the commission's hard boundaries: no state parameter in the
// link, no analytics event fired by the helper or the picker's copy action,
// and the helper stays a pure founder-tool (no consumer surface change).

import { readFileSync } from "node:fs";
import {
  CARD_CAPTION_DESTINATION,
  CARD_UTM_MEDIUM,
  CARD_UTM_SOURCE,
  cardCaptionLink,
  cardUtmContent,
} from "../src/lib/cardCaption";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// Strip comments so a banned pattern named in prose can never trip a scan.
const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

console.log("Card caption link — canonical convention");
{
  const c = cardUtmContent("fear_greed", 7, "2026-08-22");
  check("utm_content is card_<metricId>_p<period>_<yyyymmdd>", c === "card_fear_greed_p7_20260822", String(c));
  check("period 1 pins as p1", cardUtmContent("etf_flows", 1, "2026-08-22") === "card_etf_flows_p1_20260822");
  check("period 30 pins as p30", cardUtmContent("mayer_multiple", 30, "2026-01-05") === "card_mayer_multiple_p30_20260105");

  const link = cardCaptionLink("fear_greed", 7, "2026-08-22");
  check("link exists for a well-formed card identity", link != null);
  if (link) {
    const u = new URL(link);
    check("utm_source pinned to social", u.searchParams.get("utm_source") === CARD_UTM_SOURCE && CARD_UTM_SOURCE === "social");
    check("utm_medium pinned to card", u.searchParams.get("utm_medium") === CARD_UTM_MEDIUM && CARD_UTM_MEDIUM === "card");
    check("utm_content carried verbatim", u.searchParams.get("utm_content") === "card_fear_greed_p7_20260822");
    check(
      "destination is the existing public landing destination",
      u.pathname === CARD_CAPTION_DESTINATION && CARD_CAPTION_DESTINATION === "/cycle-dashboard",
      u.pathname,
    );
    check("no state parameter — the deterministic engine reconstructs state", !u.searchParams.has("state") && !link.includes("state="));
    check("absolute https URL from the canonical site source", /^https:\/\//.test(link), link);
  }
}

console.log("Refusal rule — malformed identity never yields a mislabelled URL");
{
  const bad: Array<[string, string | null]> = [
    ["uppercase metricId", cardUtmContent("Fear_Greed", 7, "2026-08-22")],
    ["hyphenated metricId", cardUtmContent("fear-greed", 7, "2026-08-22")],
    ["empty metricId", cardUtmContent("", 7, "2026-08-22")],
    ["metricId with query injection", cardUtmContent("x&utm_source=evil", 7, "2026-08-22")],
    ["unsupported period", cardUtmContent("fear_greed", 14, "2026-08-22")],
    ["non-ISO date", cardUtmContent("fear_greed", 7, "20260822")],
    ["short date", cardUtmContent("fear_greed", 7, "2026-8-2")],
    ["impossible calendar date", cardUtmContent("fear_greed", 7, "2026-02-30")],
  ];
  for (const [name, value] of bad) check(`${name} → null`, value === null, String(value));
  check("cardCaptionLink refuses the same inputs", cardCaptionLink("fear-greed", 7, "2026-08-22") === null);
}

console.log("Boundaries — founder tool only, no new measurement");
{
  const lib = strip(readFileSync("src/lib/cardCaption.ts", "utf8"));
  check("helper fires no analytics (no track import/call)", !/from ["'][^"']*track["']/.test(lib) && !/\btrack(PageView|Engagement)?\s*\(/.test(lib));
  check("helper imports only the canonical site source", /from "\.\/site"/.test(lib) && !/from "\.\/(analytics|analyticsEvents|freeHeadlines)/.test(lib));

  const picker = strip(readFileSync("src/components/MetricCardPicker.tsx", "utf8"));
  check("picker derives links from the helper (no hand-built UTM)", /cardCaptionLink\(/.test(picker) && !/utm_source=/.test(picker));
  check("picker copy action fires no analytics event", !/\btrack(PageView|Engagement)?\s*\(/.test(picker) && !/from ["'][^"']*\/track["']/.test(picker));
  check("no card_export event anywhere in the picker", !/card_export/.test(picker));
  check("no URL shortener", !/\/r\/|shorten|bitly|tinyurl/i.test(picker) && !/\/r\/|shorten/i.test(lib));

  const route = strip(readFileSync("src/app/cards/metric/[metricId]/route.tsx", "utf8"));
  check("public card image route untouched by B-1 (no caption/UTM logic)", !/cardCaption|utm_/.test(route));
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll card-caption checks passed.");
