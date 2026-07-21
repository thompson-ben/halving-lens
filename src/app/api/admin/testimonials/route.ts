import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { setTestimonialStatus } from "@/lib/testimonials";

// Admin-only: approve or reject a pending testimonial. Gated by the admin
// session cookie (same gate as every admin page/API).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  id?: number;
  action?: "approve" | "reject";
}

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const { id, action } = body;
  if (typeof id !== "number" || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ ok: false, error: "missing_id_or_action" }, { status: 400 });
  }

  const ok = await setTestimonialStatus(id, action === "approve" ? "approved" : "rejected");
  return NextResponse.json({ ok });
}
