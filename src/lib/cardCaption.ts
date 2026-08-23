// B-1 — the canonical caption link for a founder-posted metric card.
//
// A shared card is a FILE on someone else's platform: the only clickable,
// measurable surface is the caption link next to it. This module is the
// single source of that link's shape, so card attribution is deterministic
// and typo-proof:
//
//   utm_source=social · utm_medium=card
//   utm_content=card_<metricId>_p<period>_<yyyymmdd>
//
// metricId + period + card date are the canonical published-content
// identity — the deterministic engine reconstructs the card (state word
// included) from those three, so state is deliberately NOT a parameter.
// Attribution begins prospectively when the convention begins; nothing
// here manufactures historical card attribution.
//
// Founder-tool only. No analytics event fires here or because of this
// link — the existing session-entry page_view / first-touch attribution
// pipeline measures arrivals. Malformed identity returns null rather than
// ever producing a mislabelled attribution URL.

import { SITE_URL } from "./site";

export const CARD_UTM_SOURCE = "social";
export const CARD_UTM_MEDIUM = "card";
/** The existing intended public landing destination for card viewers. */
export const CARD_CAPTION_DESTINATION = "/cycle-dashboard";

const METRIC_ID = /^[a-z0-9_]{1,40}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CARD_PERIODS = [1, 7, 30];

/** `card_<metricId>_p<period>_<yyyymmdd>`, or null when any part of the
 *  card identity is malformed — a wrong label is worse than no label. */
export function cardUtmContent(metricId: string, period: number, asOfIso: string): string | null {
  if (!METRIC_ID.test(metricId)) return null;
  if (!CARD_PERIODS.includes(period)) return null;
  if (!ISO_DATE.test(asOfIso)) return null;
  // Round-trip the calendar date — the JS parser rolls impossible dates
  // (e.g. Feb 30) forward instead of rejecting them, which would silently
  // relabel the card to a day it was never rendered for.
  const t = Date.parse(`${asOfIso}T00:00:00Z`);
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== asOfIso) return null;
  return `card_${metricId}_p${period}_${asOfIso.replace(/-/g, "")}`;
}

/** The full canonical caption URL for one card, or null on malformed
 *  identity (never a silently mislabelled link). */
export function cardCaptionLink(metricId: string, period: number, asOfIso: string): string | null {
  const content = cardUtmContent(metricId, period, asOfIso);
  if (content == null) return null;
  return `${SITE_URL}${CARD_CAPTION_DESTINATION}?utm_source=${CARD_UTM_SOURCE}&utm_medium=${CARD_UTM_MEDIUM}&utm_content=${content}`;
}
