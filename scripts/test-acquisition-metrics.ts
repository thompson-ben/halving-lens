// Regression cover for the two acquisition-measurement defects found by the
// Acquisition Evidence Review. Both were silent: they produced confident,
// precise, wrong numbers in the founder dashboard rather than errors.
//
//   D-1  spend: 0 (the ad-spend file's own default, meaning "not entered yet")
//        was not null, so cost-per-subscriber divided it by the signup count
//        and reported "£0.00 per subscriber".
//
//   D-2  landing conversion counted landing views from EVERY landing but only
//        signups whose source was "/start". /free — the primary paid landing —
//        contributed visitors and no conversions, and reported a structural 0%.
//        The A/B variant table carried the same filter, so the "free" arm was
//        permanently 0%.
//
// The tests below fail if either pattern returns, and a source sweep looks for
// the same shapes anywhere else in the analytics layer.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { usableSpend } from "../src/lib/data/adSpend";
import { landingFunnel, variantFunnel } from "../src/lib/acquisitionMetrics";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const code = (p: string) =>
  read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

let failures = 0;
function check(name: string, ok: boolean, extra?: unknown) {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}`, extra ?? "");
  }
}

const P = (props: Record<string, unknown>) => ({ props });

// ── D-1 · unusable spend is UNKNOWN, never a real cost ──────────────────────
console.log("D-1 · spend validity:");
{
  check("zero is not a cost", usableSpend(0) === null);
  check("negative is not a cost", usableSpend(-5) === null);
  check("null is not a cost", usableSpend(null) === null);
  check("undefined is not a cost", usableSpend(undefined) === null);
  check("NaN is not a cost", usableSpend(Number.NaN) === null);
  check("Infinity is not a cost", usableSpend(Number.POSITIVE_INFINITY) === null);
  check("a real positive figure passes through untouched", usableSpend(137.42) === 137.42);
  check("a small positive figure still passes", usableSpend(0.01) === 0.01);

  // The exact defect: 0 spend across N signups must not become £0.00 / sub.
  const spend = usableSpend(0);
  const signups = 42;
  const cps = spend != null && signups > 0 ? spend / signups : null;
  check("0 spend over 42 signups reports UNKNOWN, not £0.00", cps === null);

  // Nothing may divide by raw spend again.
  for (const f of ["src/lib/analytics.ts", "src/lib/acquisitionAnalytics.ts"]) {
    const src = code(f);
    check(`${f} routes every spend through usableSpend`, /usableSpend\(/.test(src));
    check(`${f} no longer reads a raw spend straight from the map`,
      !/spendByCamp\.get\([^)]*\) \?\? null/.test(src));
    check(`${f} totals only usable spend`, !/reduce\(\(s, a\) => s \+ a\.spend, 0\)/.test(src));
  }
  check("the ad-spend file documents the utm_campaign join key",
    /must equal, character for character, the `utm_campaign`/.test(read("src/lib/data/adSpend.ts")));
  check("no spend figure was invented — the file still holds a single zero row",
    /spend: 0,/.test(read("src/lib/data/adSpend.ts")) && !/2\.74/.test(read("src/lib/data/adSpend.ts")));
}

// ── D-2 · matched numerator and denominator ────────────────────────────────
console.log("D-2 · landing funnel population:");
{
  // The exact production shape: two landings, signups from both, plus signups
  // from surfaces that never produce a landing_view.
  const views = [
    ...Array(100).fill(0).map(() => P({ source: "/free" })),
    ...Array(40).fill(0).map(() => P({ source: "/start" })),
  ];
  const signups = [
    ...Array(7).fill(0).map(() => P({ source: "/free" })),
    ...Array(2).fill(0).map(() => P({ source: "/start" })),
    ...Array(5).fill(0).map(() => P({ source: "/" })), // homepage block — no landing_view
  ];
  const f = landingFunnel(views, signups);

  const free = f.byLanding.find((r) => r.landing === "/free");
  const start = f.byLanding.find((r) => r.landing === "/start");
  check("/free is measured against its OWN signups", free?.views === 100 && free?.signups === 7);
  check("/free's conversion is 7%, not 0%", free?.conversionRate === 7);
  check("/start is measured against its OWN signups", start?.views === 40 && start?.signups === 2);
  check("/start's conversion is 5%", start?.conversionRate === 5);
  check("the total pairs the same landings on both sides", f.views === 140 && f.signups === 9);
  check("the blended rate is 6.4%, not 1.4%", f.conversionRate === 6.4);
  check("signups from non-landing surfaces are reported, not folded in", f.signupsOutsideLandings === 5);

  // The defect itself, reconstructed: had we kept the /start-only filter the
  // blended rate would have been 2/140 = 1.4% and /free would read 0%.
  const buggy = signups.filter((r) => r.props.source === "/start").length / views.length;
  check("the repaired rate differs from the buggy one", Math.round(buggy * 1000) / 10 !== f.conversionRate);

  // Degenerate inputs must not throw or divide by zero.
  const empty = landingFunnel([], []);
  check("no views ⇒ null rate, never 0% and never NaN",
    empty.conversionRate === null && empty.views === 0 && empty.byLanding.length === 0);
  const noSignups = landingFunnel([P({ source: "/free" })], []);
  check("views with no signups ⇒ an honest 0%", noSignups.conversionRate === 0);
  check("rows with no source are ignored, not bucketed as empty string",
    landingFunnel([P({}), P({ source: "" })], []).byLanding.length === 0);
}

console.log("D-2 · A/B arm population:");
{
  const views = [
    ...Array(60).fill(0).map(() => P({ source: "/start", variant: "a" })),
    ...Array(60).fill(0).map(() => P({ source: "/start", variant: "b" })),
    ...Array(80).fill(0).map(() => P({ source: "/free", variant: "free" })),
  ];
  const signups = [
    ...Array(3).fill(0).map(() => P({ source: "/start", variant: "a" })),
    ...Array(6).fill(0).map(() => P({ source: "/start", variant: "b" })),
    ...Array(8).fill(0).map(() => P({ source: "/free", variant: "free" })),
  ];
  const rows = variantFunnel(views, [], signups);
  const arm = (k: string) => rows.find((r) => r.variant === k);

  check("the /free arm records its conversions — the defect's signature",
    arm("free")?.views === 80 && arm("free")?.signups === 8 && arm("free")?.cvr === 10);
  check("the /start arms are unaffected",
    arm("a")?.cvr === 5 && arm("b")?.cvr === 10);
  const variantBody = code("src/lib/acquisitionMetrics.ts").split("export function variantFunnel")[1] ?? "";
  check("arms are selected by variant alone, on both sides",
    variantBody.length > 0 && !/props\?\.source/.test(variantBody) && /r\.props\?\.variant/.test(variantBody));
  check("analytics.ts no longer filters variant signups by landing source",
    !/r\.props\?\.source !== "\/start"/.test(code("src/lib/analytics.ts")));
  check("analytics.ts no longer filters landing signups by landing source",
    !/\(r\.props\?\.source as string\) === "\/start"/.test(code("src/lib/analytics.ts")));
}

// ── Adjacent-pattern sweep ─────────────────────────────────────────────────
// Look for the same two shapes anywhere else before calling the repair closed.
console.log("Adjacent-pattern sweep:");
{
  function srcFiles(dir: string): string[] {
    const out: string[] = [];
    for (const e of readdirSync(join(root, dir))) {
      const rel = `${dir}/${e}`;
      if (statSync(join(root, rel)).isDirectory()) out.push(...srcFiles(rel));
      else if (/\.tsx?$/.test(e)) out.push(rel);
    }
    return out;
  }
  const files = srcFiles("src/lib").concat(srcFiles("src/app/admin"));

  // Pattern A: any other division by a spend value that skipped the rule.
  const rawSpendDivision = files.filter((f) => {
    const c = code(f);
    return /\/\s*(v\.signups|signups)\b/.test(c) && /spend/.test(c) && !/usableSpend/.test(c);
  });
  check("no other cost calculation divides by an unvalidated spend", rawSpendDivision.length === 0, rawSpendDivision);

  // Pattern B: a source-filtered signup COUNT is fine; a source-filtered
  // signup count used as the NUMERATOR of a rate whose denominator is not
  // filtered the same way is the D-2 defect. Enumerate every survivor and
  // require it to be a plain count.
  const survivors: { file: string; expr: string }[] = [];
  for (const f of files) {
    for (const line of code(f).split("\n")) {
      if (/signupRows[\s\S]*props\?\.source[\s\S]*===/.test(line)) {
        const name = /const\s+(\w+)\s*=/.exec(line)?.[1] ?? "(anonymous)";
        survivors.push({ file: f, expr: name });
      }
    }
  }
  // The single documented exception: /accumulation's signup COUNT, reported as
  // a number beside that page's stats and never divided by anything.
  check("every surviving source-filtered signup selector is a plain count",
    survivors.every((v) => v.file === "src/lib/analytics.ts" && v.expr === "accSignups"),
    survivors);
  const analyticsSrc = code("src/lib/analytics.ts");
  check("that count is never used as a conversion numerator",
    !/accSignups\s*\//.test(analyticsSrc) && !/\/\s*accSignups/.test(analyticsSrc));
  check("no rate in the analytics layer divides by an unrelated view total",
    !/\(landingSignups \/ landingViews\)/.test(analyticsSrc));

  // Known-good neighbours: these already pair their populations correctly and
  // must keep doing so.
  const exp = code("src/lib/experimentAnalytics.ts");
  check("experimentAnalytics tallies views and conversions on the same key",
    /tally\(views/.test(exp) && /tally\(signups/.test(exp) && !/props\?\.source/.test(exp));
  const acq = code("src/lib/acquisitionAnalytics.ts");
  check("acquisitionAnalytics groups creatives without a source filter",
    /byDimension\(landingRows, signupRows, "utm_content"\)/.test(acq));
  check("WAES still declares its click-bridged basis rather than overclaiming",
    /click-bridged/.test(read("src/lib/growthInsights.ts")));
}

// ── Nothing else moved ─────────────────────────────────────────────────────
console.log("Boundaries:");
{
  check("no new analytics event was introduced",
    !/acquisition_|spend_|landing_conv/.test(read("src/lib/analyticsEvents.ts")));
  check("attribution remains FIRST-TOUCH, untouched",
    /first-touch wins — never overwrite/.test(read("src/lib/attribution.ts")));
  check("subscriber capture behaviour is untouched",
    /source: placement/.test(read("src/app/api/subscribe/route.ts")));
  check("the 13 unattributed signup surfaces were NOT repaired here (deferred item)",
    /body: JSON\.stringify\(\{ email, source: pathname, consent \}\)/.test(read("src/components/BriefSignup.tsx")));
}

// ── The read-only analysis tooling is genuinely read-only ──────────────────
console.log("Analysis tooling safety:");
{
  const script = read("scripts/acquisition-evidence.ts");
  check("the evidence script only ever READS", !/sbInsert|sbUpdate|sbDelete|sendEmail/.test(script));
  check("it computes hashes in memory and persists nothing", /emailHash/.test(script) && !/sbInsert/.test(script));
  check("it splits PRE-P1 / POST-P1 and labels the blended window descriptive-only",
    /PRE-P1/.test(script) && /POST-P1/.test(script) && /DESCRIPTIVE ONLY/.test(script));
  check("it labels every creative figure FIRST-TOUCH", /FIRST-TOUCH/.test(script));
  check("it refuses to report engagement when the hashing secret is wrong",
    /ZERO MATCHES/.test(script) && /STOPPING this section/.test(script));
  check("it prints absolute counts beside every percentage", /const frac =/.test(script));
  check("it computes no composite score", !/score/i.test(script.replace(/no score|a score|synthetic score/gi, "")));
  check("it invents no spend", /Nothing here estimates, defaults or infers a figure/.test(script));
  const wf = read(".github/workflows/acquisition-evidence.yml");
  check("its workflow is dispatch-only", /workflow_dispatch:/.test(wf) && !/^\s*schedule:/m.test(wf) && !/^\s*push:/m.test(wf));
  // Strip YAML comments — the file explains WHY no send key is provided.
  const wfCode = wf.replace(/^\s*#.*$/gm, "");
  check("its workflow cannot send email — no RESEND key is provided", !/RESEND_API_KEY/.test(wfCode));
  check("its workflow grants read-only repository permission", /permissions:\s*\n\s*contents: read/.test(wfCode));
}

console.log("");
if (failures) {
  console.error(`${failures} failure(s).`);
  process.exit(1);
}
console.log("All acquisition-metric tests passed.");
