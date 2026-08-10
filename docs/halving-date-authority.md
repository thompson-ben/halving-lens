# Halving date authority

**The canonical halving authority is `HALVING_EVENTS` in
`src/lib/data/types.ts`**: each analysed halving is the Bitcoin block that
changed the subsidy, and the canonical date is the UTC calendar date
containing that block. `HALVINGS` is a compatibility view derived from it.

| Epoch | Block | Mined (UTC) | Canonical date |
|---|---|---|---|
| 2 | 210,000 | 2012-11-28 15:24:38 | 2012-11-28 |
| 3 | 420,000 | 2016-07-09 16:46:13 | 2016-07-09 |
| 4 | 630,000 | 2020-05-11 19:23:43 | 2020-05-11 |
| 5 | 840,000 | 2024-04-20 00:09:27 | 2024-04-20 |

Day-zero convention: the halving date is cycle day 0 (2024-04-20 = day 0,
2024-04-21 = day 1).

## The 2024 correction

HalvingLens previously anchored the 2024 halving to 19 April 2024, the
widely reported US-evening calendar date. The halving block (840,000) was
mined at 00:09:27 UTC on 20 April. From this update, cycle-day calculations
use the UTC network-event date. Earlier published material may therefore
show the current cycle one day higher.

Previously published content (archived Daily Briefs, emails, weekly
reports, social and Open Graph assets, presenter scripts) is the record of
what HalvingLens published at the time and is not rewritten.

Two mechanical consequences of the correction, for the record: cycle 4's
observed history ends at day 1439 (2024-04-19 is cycle 4 day 1439, no
longer cycle 5 day 0), and the daily production-cost model's subsidy eras
now change on the UTC date containing each halving block — the model is
daily-resolution, not block-resolution, so 20 April 2024 is treated as
entirely post-halving although its first nine minutes were not.
