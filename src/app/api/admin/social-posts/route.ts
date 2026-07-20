import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { recordSocialPost, recentSocialPosts } from "@/lib/socialPosts";
import { storyEngine } from "@/lib/storyEngine";
import { todaySlug } from "@/lib/briefArchive";
import { PACK_LABELS, type PackId } from "@/lib/contentCards";

// Admin-only: log a published social post into the story engine's history, so
// future posts avoid repeating its hero chart, layout, angle and headline. The
// story metadata is resolved SERVER-SIDE from the same engine decision the
// studio showed, so the log always reflects the real pick rather than trusting
// the client. Gated by the admin session cookie.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  pack?: string;
  postDate?: string;
}

const STORY_DRIVEN = new Set<PackId>(["chart_week", "week"]);

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const pack = (body.pack ?? "") as PackId;
  if (!(pack in PACK_LABELS)) return NextResponse.json({ ok: false, error: "unknown_pack" }, { status: 400 });

  const postDate = (body.postDate ?? "").trim() || todaySlug();

  // Resolve the engine's decision with the current history so the logged hero /
  // layout / headline match what the operator actually published. Only the
  // story-driven packs carry a hero/layout; other packs log pack + date only.
  const story = STORY_DRIVEN.has(pack) ? storyEngine({ recentPosts: await recentSocialPosts() }).top : null;

  const result = await recordSocialPost({
    postDate,
    pack,
    heroCard: story?.heroCard ?? null,
    headline: story?.headline ?? null,
    layout: story?.layout ?? null,
    primaryMetric: story ? story.metricId ?? story.key : null,
    category: story?.category ?? null,
    score: story?.score ?? null,
  });

  if (!result.ok) {
    const status = result.error === "not_configured" ? 503 : 500;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json({ ok: true, logged: { pack, postDate, hero: story?.heroCard ?? null, layout: story?.layout ?? null } });
}
