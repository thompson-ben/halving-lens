import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { authorizeIntelligence } from "@/lib/founderIntelligence/apiAuth";
import { intelligenceApiResponse, isSection, INTELLIGENCE_SECTIONS } from "@/lib/founderIntelligence/api";

// GET /api/intelligence/v1/<section> — the secure, versioned, machine-readable
// Founder Intelligence surface ("Review HalvingLens"). Read-only: only GET is
// exported, so there is no write path at all. Auth is Bearer <INTELLIGENCE_API_KEY>
// (never a query param) OR the founder's admin cookie. Responses are aggregate-
// only (no subscriber identifiers) and never cached at the edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Generous for a single-consumer analytics endpoint; enough to stop a runaway
// client or a leaked key from hammering the aggregators. Fail-open (see rateLimit).
const RATE_LIMIT = 60;
const RATE_WINDOW_SEC = 60;

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(_req: Request, { params }: { params: { section: string } }) {
  const auth = authorizeIntelligence({
    authorization: _req.headers.get("authorization"),
    apiKey: process.env.INTELLIGENCE_API_KEY,
    isAdminSession: isAdmin(),
  });
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: "unauthorized", reason: auth.reason },
      { status: 401, headers: { ...NO_STORE, "WWW-Authenticate": "Bearer" } },
    );
  }

  const section = params.section;
  if (!isSection(section)) {
    return NextResponse.json(
      { ok: false, error: "unknown_section", sections: INTELLIGENCE_SECTIONS },
      { status: 404, headers: NO_STORE },
    );
  }

  const { allowed } = await rateLimit(`intel_api:${clientIp(_req)}`, RATE_LIMIT, RATE_WINDOW_SEC);
  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(RATE_WINDOW_SEC) } },
    );
  }

  try {
    const payload = await intelligenceApiResponse(section, Date.now());
    return NextResponse.json({ ok: true, ...payload }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ ok: false, error: "intelligence_unavailable" }, { status: 503, headers: NO_STORE });
  }
}
