// Tiny Resend client over its REST API — no SDK, no dependency, matching the
// project's bare-fetch Supabase style. Fails gracefully when RESEND_API_KEY is
// unset (so dev/build never breaks and the sync job won't error).

const KEY = process.env.RESEND_API_KEY;

// From address must be on a domain verified in Resend. Override via EMAIL_FROM.
export const EMAIL_FROM = process.env.EMAIL_FROM || "Halving Lens <brief@halvinglens.com>";
export const resendConfigured = !!KEY;

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(msg: {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  replyTo?: string;
}): Promise<SendResult> {
  if (!KEY) return { ok: false, error: "resend_not_configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        headers: msg.headers,
        reply_to: msg.replyTo,
      }),
    });
    const j = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { ok: false, error: j?.message || `http_${res.status}` };
    return { ok: true, id: j?.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
