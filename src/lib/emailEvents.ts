// Store + reader for provider-reported email deliverability (the email_events
// table fed by the Resend webhook). This is an ANALYTICS sink only — nothing on
// the email SEND path imports it, so an ingestion problem can never affect
// delivery. Recipients are stored as a salted hash (never the raw address).

import { sbUpsert, sbSelect, supabaseConfigured } from "./supabase";
import { emailHash } from "./emailTracking";
import type { NormalizedEmailEvent, EmailEventCategory } from "./resendWebhook";

// Persist one normalized event, idempotently (upsert on the unique Svix id).
// Returns false when the store isn't configured or the write fails — callers
// treat that as "not recorded", never as an error worth failing the webhook on.
export async function recordEmailEvent(evt: NormalizedEmailEvent): Promise<boolean> {
  if (!supabaseConfigured) return false;
  const row = {
    event_id: evt.eventId,
    type: evt.type,
    category: evt.category,
    email_hash: evt.email ? emailHash(evt.email) : null,
    provider_message_id: evt.providerMessageId,
    campaign: evt.campaign,
    occurred_at: evt.occurredAt,
  };
  return sbUpsert("email_events", row, "event_id");
}

export interface Deliverability {
  configured: boolean;
  windowDays: number;
  delivered: number;
  bounced: number;
  complained: number;
  delayed: number;
  bounceRate: number | null; // bounced ÷ (delivered + bounced), %
  complaintRate: number | null; // complained ÷ delivered, %
}

const DAY = 86_400_000;

interface Row {
  category: EmailEventCategory;
}

// Aggregate deliverability over the last `windowDays`. This is what the Daily
// Brief module will consume for the bounce/complaint guardrails (wired in a
// follow-up so this PR stays a pure, isolated ingestion change).
export async function emailDeliverability(windowDays = 30, now: number = Date.now()): Promise<Deliverability> {
  const empty: Deliverability = { configured: false, windowDays, delivered: 0, bounced: 0, complained: 0, delayed: 0, bounceRate: null, complaintRate: null };
  if (!supabaseConfigured) return empty;
  const sinceIso = new Date(now - windowDays * DAY).toISOString();
  const rows = await sbSelect<Row[]>(`email_events?select=category&occurred_at=gte.${sinceIso}&limit=200000`);
  if (rows == null) return empty;

  let delivered = 0,
    bounced = 0,
    complained = 0,
    delayed = 0;
  for (const r of rows) {
    if (r.category === "delivered") delivered++;
    else if (r.category === "bounced") bounced++;
    else if (r.category === "complained") complained++;
    else if (r.category === "delayed") delayed++;
  }
  const deliveredPlusBounced = delivered + bounced;
  return {
    configured: true,
    windowDays,
    delivered,
    bounced,
    complained,
    delayed,
    bounceRate: deliveredPlusBounced > 0 ? Math.round((bounced / deliveredPlusBounced) * 1000) / 10 : null,
    complaintRate: delivered > 0 ? Math.round((complained / delivered) * 1000) / 10 : null,
  };
}
