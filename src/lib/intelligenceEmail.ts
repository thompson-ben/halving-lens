// Daily Founder Intelligence Briefing — one consumer of the Intelligence Events
// Engine, not a bespoke notifier. It sends ONE concise editorial email to the
// founder when (and only when) publishable events exist — never an empty email.
// Multiple events are ranked by story score. The same events power the Founder
// Alerts queue, the Daily Brief, Social, etc.; this consumer just renders + mails.

import { sendEmail, resendConfigured, EMAIL_FROM } from "./resend";
import { syncIntelligenceEvents } from "./intelligenceStore";
import { SITE_HOST } from "./site";
import type { IntelligenceEvent, EventPriority } from "./intelligenceEvents";

const PRIORITY_COLOR: Record<EventPriority, string> = { high: "#ff5d5d", medium: "#f5b942", low: "#9aa6b4" };

export function intelligenceSubject(events: IntelligenceEvent[]): string {
  const top = events[0];
  if (events.length === 1) return `HalvingLens Intelligence — ${top.suggestedHeadline}`;
  return `HalvingLens Intelligence — ${top.suggestedHeadline} (+${events.length - 1} more)`;
}

export function intelligenceText(events: IntelligenceEvent[]): string {
  const lines = ["HalvingLens — Today's Intelligence", ""];
  events.forEach((e, i) => {
    lines.push(`${i + 1}. [${e.priority.toUpperCase()}] ${e.suggestedHeadline}`);
    lines.push(`   ${e.summary}`);
    lines.push(`   Score ${e.storyScore} · ${e.eventType} · confidence ${e.confidence} · rarity ${e.rarity}`);
    lines.push(`   Why: ${e.triggerReason}`);
    lines.push(`   Recommended: ${e.suggestedPack} pack · ${e.suggestedPlatforms.join(", ")}`);
    lines.push("");
  });
  lines.push(`Review & publish → https://${SITE_HOST}/admin/social`);
  lines.push("Historical context, not financial advice.");
  return lines.join("\n");
}

export function intelligenceHtml(events: IntelligenceEvent[]): string {
  const card = (e: IntelligenceEvent, i: number) => `
    <tr><td style="padding:0 0 16px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1219;border:1px solid rgba(255,255,255,0.08);border-radius:14px;">
        <tr><td style="padding:20px 22px;">
          <div style="font:600 11px/1 -apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:2px;text-transform:uppercase;color:${PRIORITY_COLOR[e.priority]};">
            ${e.priority} priority · ${e.eventType}
          </div>
          <div style="font:700 22px/1.25 Georgia,serif;color:#f3f6fa;margin:10px 0 6px;">${escapeHtml(e.suggestedHeadline)}</div>
          <div style="font:400 14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#9aa6b4;">${escapeHtml(e.summary)}</div>
          <div style="font:400 13px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#6f7c8e;margin-top:12px;">
            <span style="color:#5eead4;font-weight:600;">Score ${e.storyScore}</span> ·
            confidence ${e.confidence} · rarity ${e.rarity}
          </div>
          <div style="font:400 13px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#9aa6b4;margin-top:8px;">
            <strong style="color:#bfc7d2;">Why it fired:</strong> ${escapeHtml(e.triggerReason)}
          </div>
          <div style="font:400 13px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#6f7c8e;margin-top:8px;">
            Recommended: <strong style="color:#bfc7d2;">${e.suggestedPack}</strong> pack · ${e.suggestedPlatforms.join(" · ")}
          </div>
        </td></tr>
      </table>
    </td></tr>`;
  return `<!doctype html><html><body style="margin:0;background:#070a0f;padding:28px 0;">
    <table align="center" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:0 20px;">
      <tr><td style="padding-bottom:18px;">
        <div style="font:600 12px/1 -apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:3px;text-transform:uppercase;color:#5eead4;">HalvingLens Intelligence</div>
        <div style="font:400 14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#9aa6b4;margin-top:8px;">
          ${events.length} publishable ${events.length === 1 ? "event" : "events"} today, ranked by significance.
        </div>
      </td></tr>
      ${events.map(card).join("")}
      <tr><td style="padding:8px 0 0;">
        <a href="https://${SITE_HOST}/admin/social" style="display:inline-block;background:#5eead4;color:#08110e;font:600 14px/1 -apple-system,Segoe UI,Roboto,sans-serif;text-decoration:none;padding:13px 22px;border-radius:10px;">Review &amp; publish →</a>
      </td></tr>
      <tr><td style="padding:22px 0 0;font:400 11px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#4a5568;">
        You receive this only when the Intelligence Events Engine detects something genuinely publishable — never on quiet days.
        Historical context, not financial advice. Sent from ${escapeHtml(EMAIL_FROM)}.
      </td></tr>
    </table>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export interface IntelligenceBriefingResult {
  ok: boolean;
  reason?: string;
  sent: number;
  events: number;
}

// Send the briefing IF publishable events exist. Detects + persists via
// syncIntelligenceEvents, ranks by score, and mails the founder. Honest, never
// empty: returns a clear reason when there's nothing worth sending.
export async function sendIntelligenceBriefing(): Promise<IntelligenceBriefingResult> {
  const recipient = process.env.FOUNDER_EMAIL || null;
  if (!recipient) return { ok: false, reason: "no_founder_email", sent: 0, events: 0 };
  if (!resendConfigured) return { ok: false, reason: "resend_not_configured", sent: 0, events: 0 };

  const { configured, emailWorthy } = await syncIntelligenceEvents();
  if (!configured) return { ok: false, reason: "supabase_not_configured", sent: 0, events: 0 };
  if (!emailWorthy.length) return { ok: true, reason: "no_publishable_events", sent: 0, events: 0 };

  const ranked = [...emailWorthy].sort((a, b) => b.storyScore - a.storyScore);
  const res = await sendEmail({ to: recipient, subject: intelligenceSubject(ranked), html: intelligenceHtml(ranked), text: intelligenceText(ranked) });
  return { ok: res.ok, reason: res.ok ? undefined : "send_failed", sent: res.ok ? 1 : 0, events: ranked.length };
}
