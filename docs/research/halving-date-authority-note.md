# Halving date authority — reconciliation note (epoch 5)

**Status:** discrepancy recorded for founder decision. No production change
is authorised by this note. Discovered during HCM-v1 methodology ingestion
(§4 verification), 2026-08-11.

## The two authorities

| Authority | Date | Basis |
|---|---|---|
| Bitcoin network event | **2024-04-20 (UTC)** | Block 840,000, timestamp 2024-04-20 00:09:27 UTC |
| HalvingLens production | **2024-04-19** | `HALVINGS[5]` in `src/lib/data/types.ts` |

The block was mined at 20:09 US-Eastern on 19 April — the two dates are the
same moment on either side of the UTC midnight boundary. Epochs 2–4 are not
affected: blocks 210,000 / 420,000 / 630,000 were all mined mid-day UTC and
the repository's dates (2012-11-28, 2016-07-09, 2020-05-11) match their UTC
block timestamps. Epoch 5 is the only halving whose block landed within
minutes of a UTC date boundary.

No documented rationale for 2024-04-19 exists in the repository: the value
arrived in the initial live-data-pipeline commit with only the comment
"Halving dates." The site is otherwise strictly UTC in its date arithmetic,
which makes the current convention's precise meaning: **cycle day 0 is the
UTC day before the halving block; the block itself was mined on cycle
day 1.**

## Consequence for HCM-v1

The research lock (§4, OQ-3) requires an explicit `days_since_halving`
authority that is BOTH verified against the network record AND reconciled
with the live dashboard convention. Until the founder decision below, §4
remains unpopulated and the discrepancy is carried openly (OQ-4 posture:
a known, documented difference — never a silent contradiction).

## The decision (founder)

1. **Network-event authority** — adopt 2024-04-20 UTC everywhere, via a
   separate controlled production migration PR.
2. **Deliberate calendar convention** — retain 2024-04-19 and document
   precisely what it represents.
3. **Split authorities** — record the network timestamp and the product
   cycle-day anchor as distinct named facts, if a defensible reason exists
   for them to differ.

This note records facts and options only; it selects nothing.
