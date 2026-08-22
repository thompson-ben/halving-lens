// Resend webhook reachability guard (Webhook 307 investigation, Aug 2026).
//
// PRODUCTION CONTEXT: Resend POSTs to https://halvinglens.com/api/webhooks/resend
// were observed receiving "307 Temporary Redirect / Redirecting..." and the
// webhook was auto-disabled. The investigation proved the redirect does NOT
// originate in this repository: the production build answers the exact POST
// directly (200/401 by signature, no Location), there is no middleware file,
// and no redirect/rewrite config matches the route. The redirect therefore
// lives in the platform layer in front of the app (domain-level redirect).
//
// This suite PINS the in-repo innocence so it stays true: if any future
// middleware, next.config redirect/rewrite, trailing-slash/basePath change,
// or vercel.json routing rule starts catching /api/webhooks/resend, this
// fails loudly — because a provider that follows nothing but a 2xx contract
// silently loses every event otherwise. It also pins the handler contract:
// signature-verified, never redirects, always terminal (2xx/4xx).

import { existsSync, readFileSync } from "node:fs";
import { createHmac } from "node:crypto";

const WEBHOOK_PATH = "/api/webhooks/resend";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// Minimal Next.js route-source matcher: enough for the pattern grammar this
// config is allowed to use (static segments, :param, :param*, wildcards).
// Deliberately conservative — an UNRECOGNISED pattern is treated as matching,
// so novel syntax must be reviewed rather than silently trusted.
function sourceMatches(source: string, path: string): boolean {
  if (!source.startsWith("/")) return true; // unknown shape — flag for review
  const rx = source
    .split("/")
    .map((seg) => {
      if (seg === "") return "";
      if (/^:[A-Za-z0-9_]+\*$/.test(seg)) return "(.*)";
      if (/^:[A-Za-z0-9_]+\+$/.test(seg)) return "(.+)";
      if (/^:[A-Za-z0-9_]+$/.test(seg)) return "([^/]+)";
      if (seg.includes("*") || seg.includes("(") || seg.includes(":")) return "(.*)"; // unknown → conservative
      return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return new RegExp(`^${rx}$`).test(path);
}

async function main() {
  console.log("Layer 1 — middleware cannot exist unnoticed");
  {
    const candidates = ["middleware.ts", "middleware.js", "src/middleware.ts", "src/middleware.js"];
    const present = candidates.filter((f) => existsSync(f));
    check(
      "no middleware file intercepts requests (or it must be reviewed for a webhook exemption)",
      present.length === 0,
      `found: ${present.join(", ")} — if middleware is ever added, it MUST exempt ${WEBHOOK_PATH}`,
    );
  }

  console.log("Layer 2 — next.config routing never catches the webhook route");
  {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cfg = require("../next.config.js");
    const redirects: Array<{ source: string; destination: string }> = cfg.redirects ? await cfg.redirects() : [];
    const rewrites = cfg.rewrites ? await cfg.rewrites() : [];
    for (const r of redirects) {
      check(`redirect source "${r.source}" does not match ${WEBHOOK_PATH}`, !sourceMatches(r.source, WEBHOOK_PATH), `→ ${r.destination}`);
    }
    const rewriteList = Array.isArray(rewrites) ? rewrites : [...(rewrites.beforeFiles ?? []), ...(rewrites.afterFiles ?? []), ...(rewrites.fallback ?? [])];
    check("no rewrite matches the webhook route", rewriteList.every((r: { source: string }) => !sourceMatches(r.source, WEBHOOK_PATH)));
    check("no basePath configured", !cfg.basePath);
    check("no trailingSlash configured (slash-variant redirects stay away from the exact path)", !cfg.trailingSlash);

    // The four approved page redirects stay exactly as approved — proving this
    // guard changes nothing about routing behaviour elsewhere.
    const sources = redirects.map((r) => r.source).sort();
    check(
      "the approved page redirects are untouched",
      JSON.stringify(sources) === JSON.stringify(["/alerts", "/downside-scenarios", "/replay", "/snapshot"]),
      sources.join(","),
    );

    // Self-check: the matcher DOES detect a hypothetical catch-all redirect —
    // i.e. this suite fails under simulated in-repo redirecting behaviour.
    check("detector self-check: a /api/:path* redirect WOULD be caught", sourceMatches("/api/:path*", WEBHOOK_PATH));
    check("detector self-check: a /:path* catch-all WOULD be caught", sourceMatches("/:path*", WEBHOOK_PATH));
  }

  console.log("Layer 3 — vercel.json carries no routing rules");
  {
    const v = JSON.parse(readFileSync("vercel.json", "utf8"));
    for (const key of ["redirects", "rewrites", "routes", "trailingSlash", "cleanUrls"]) {
      check(`vercel.json has no "${key}"`, !(key in v));
    }
  }

  console.log("Layer 4 — the handler itself is terminal and signature-gated (runtime)");
  {
    const { POST } = await import("../src/app/api/webhooks/resend/route");
    const routeSrc = readFileSync("src/app/api/webhooks/resend/route.ts", "utf8");
    check("route exports POST only (no GET/redirect surface)", !/export\s+(async\s+)?function\s+(GET|PUT|DELETE|PATCH)\b/.test(routeSrc));
    check("route never constructs a redirect", !/NextResponse\.redirect|Response\.redirect|status:\s*30[0-9]/.test(routeSrc));

    const body = JSON.stringify({
      type: "email.delivered",
      created_at: "2026-08-22T15:00:00Z",
      data: { email_id: "re_guard", to: ["reader@example.com"] },
    });
    const post = (headers: Record<string, string>) =>
      POST(new Request(`https://halvinglens.com${WEBHOOK_PATH}`, { method: "POST", headers, body }));
    const terminal = (res: Response, name: string) => {
      check(`${name}: status is terminal (never 3xx)`, res.status < 300 || res.status >= 400, String(res.status));
      check(`${name}: no Location header`, res.headers.get("location") == null);
    };

    // Unconfigured: acknowledged (no retry storm), nothing stored.
    delete process.env.RESEND_WEBHOOK_SECRET;
    let res = await post({ "content-type": "application/json" });
    check("no secret configured → 200 acknowledge", res.status === 200);
    terminal(res, "no-secret");

    // Configured: unsigned rejected, correctly signed accepted, store path exercised.
    const secretB64 = Buffer.from("routing-guard-signing-key-0001").toString("base64");
    process.env.RESEND_WEBHOOK_SECRET = `whsec_${secretB64}`;
    res = await post({ "content-type": "application/json" });
    check("unsigned request → 401 rejected (verification not weakened)", res.status === 401);
    terminal(res, "unsigned");

    const id = "msg_routing_guard";
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = `v1,${createHmac("sha256", Buffer.from(secretB64, "base64")).update(`${id}.${ts}.${body}`).digest("base64")}`;
    res = await post({ "content-type": "application/json", "svix-id": id, "svix-timestamp": ts, "svix-signature": sig });
    check("correctly Svix-signed request → 2xx", res.status === 200);
    terminal(res, "signed");
    const payload = (await res.json()) as { ok: boolean; stored?: boolean };
    check("signed request reaches the persistence path (response reports stored)", payload.ok === true && "stored" in payload);

    const badSig = `v1,${createHmac("sha256", Buffer.from("wrong-key")).update(`${id}.${ts}.${body}`).digest("base64")}`;
    res = await post({ "content-type": "application/json", "svix-id": id, "svix-timestamp": ts, "svix-signature": badSig });
    check("wrong-key signature → 401", res.status === 401);
    delete process.env.RESEND_WEBHOOK_SECRET;
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll webhook-routing checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
