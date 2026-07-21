"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { Testimonial } from "@/lib/testimonials";

// Admin moderation queue (P6.2), embedded as a section in the existing admin
// area — not a separate dashboard. Approve/reject each pending testimonial;
// approved ones become available for use across the site.
export function TestimonialModeration({ pending }: { pending: Testimonial[] }) {
  const [items, setItems] = useState<Testimonial[]>(pending);
  const [busy, setBusy] = useState<number | null>(null);

  const act = async (id: number, action: "approve" | "reject") => {
    if (busy != null) return;
    setBusy(id);
    try {
      const res = await fetch("/api/admin/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (res.ok && j.ok) setItems((cur) => cur.filter((t) => t.id !== id));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[15px]">💬</span>
        <span className="text-[11px] uppercase tracking-[0.18em] text-[#d9b96a]">Pending testimonials</span>
        {items.length > 0 && (
          <span className="text-[10px] text-ink-950 bg-accent rounded-full px-1.5 py-0.5 font-medium">{items.length}</span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-[13px] text-ink-500">No testimonials awaiting review.</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((t) => (
            <div key={t.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[13.5px] text-ink-100 leading-relaxed">“{t.quote}”</p>
              <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-[11.5px] text-ink-400">
                  {t.displayName}
                  {t.role ? ` · ${t.role}` : ""}
                  {t.source ? ` · ${t.source}` : ""}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => act(t.id, "approve")}
                    disabled={busy != null}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-signal-green/15 text-signal-green text-[12px] font-medium hover:bg-signal-green/25 transition-colors disabled:opacity-50"
                  >
                    <Check size={13} /> Approve
                  </button>
                  <button
                    onClick={() => act(t.id, "reject")}
                    disabled={busy != null}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-ink-300 text-[12px] hover:border-signal-red/40 hover:text-signal-red transition-colors disabled:opacity-50"
                  >
                    <X size={13} /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
