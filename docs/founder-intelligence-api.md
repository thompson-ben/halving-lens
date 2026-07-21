# Founder Intelligence API (`/api/intelligence/v1`)

The secure, versioned, **read-only** machine surface of the Founder Intelligence
Layer. This is what a connected assistant (e.g. the ChatGPT / MCP "Review
HalvingLens" connector) reads to produce an evidence-backed operating review. It
serves the *same* structured feed the dashboards and founder reports consume —
one source of truth, one canonical conversion, one WEAS North Star.

Everything returned is **aggregate-only** (counts, rates, confidence). The feed
carries no subscriber identifiers, so these responses never expose PII.

## Versioning

The URL space is versioned from day one so the schema can evolve without
breaking connected clients:

```
/api/intelligence/v1/<section>
```

`v1` is stable. Breaking changes ship under `v2`; additive fields may appear
within `v1`. Every response echoes `apiVersion` and `schemaVersion`.

## Sections

| Section | Path | Returns |
|---|---|---|
| Review | `/api/intelligence/v1/review` | The concise **Founder Review** (verdict, North Star status, what improved/deteriorated, top opportunity/risk) + the WEAS North Star + the ranked recommendations + the one prioritised `topRecommendation`. **Start here for "Review HalvingLens".** |
| Feed | `/api/intelligence/v1/feed` | The full `FounderIntelligenceFeed`: North Star, every module, all recommendations, risks, opportunities, data-quality notes, and the review. |
| Growth | `/api/intelligence/v1/growth` | The Growth Intelligence module (WEAS, canonical conversion, signups, active base, acquisition cost). |
| Journeys | `/api/intelligence/v1/journeys` | The Journey Intelligence module (value-discovery, explorer rate, journey depth, lost-visitor rate, opportunities). |
| Daily Brief | `/api/intelligence/v1/daily-brief` | The Daily Brief Intelligence module (confirmed clicks, CTR/CTOR, provider-reported opens marked supporting-only). |

Unknown sections return `404` with the list of valid sections. Modules that
aren't built yet return an explicit `status: "not_implemented"` stub — never
empty data dressed up as real.

## Authentication

Two credentials are accepted; both are **fail-closed**.

1. **Bearer token** (machine consumers):

   ```
   Authorization: Bearer <INTELLIGENCE_API_KEY>
   ```

   The key is read **only** from the `Authorization` header — never a query
   string (which would leak into logs, browser history and the `Referer`
   header). Compared in constant time. If `INTELLIGENCE_API_KEY` is not set, the
   bearer path is unavailable (the endpoint does not fall back to "open").

2. **Admin session** (browser): the founder's signed, expiring `hl_admin`
   cookie also grants access, so the endpoint is browsable while signed into the
   dashboards.

Missing/!invalid credentials return `401` with `WWW-Authenticate: Bearer` and a
machine-readable `reason` (never echoing the key).

### Configuring the key

Set a high-entropy secret in the environment:

```
INTELLIGENCE_API_KEY=<random 32+ char string>
```

Rotate by replacing the value and updating the connector. There is no key in
source, and the endpoint has **no write path** — only `GET` is exported.

## Guarantees

- **Read-only.** Only `GET` is implemented; there is no create/update/delete.
- **Aggregate-only.** No subscriber identifiers, emails, hashes, IPs or session
  ids appear in any response (enforced by `scripts/test-intelligence-api.ts`).
- **Rate-limited.** 60 requests / 60s per client IP (fail-open — the limiter can
  only ever reduce abuse, never take the endpoint down). `429` with
  `Retry-After` when exceeded.
- **Never cached.** All responses set `Cache-Control: no-store`.
- **Honest under missing data.** When a store isn't configured, modules report
  `status: "unavailable"` with a reason and the review says so — it never
  fabricates numbers.

## Example

```bash
curl -sS https://halvinglens.com/api/intelligence/v1/review \
  -H "Authorization: Bearer $INTELLIGENCE_API_KEY"
```

```jsonc
{
  "ok": true,
  "apiVersion": "v1",
  "schemaVersion": "1.0",
  "section": "review",
  "generatedAt": "2026-07-20T12:00:00.000Z",
  "period": { "start": "…", "end": "…", "label": "Last 7 days", "timezone": "Europe/London", "days": 7 },
  "northStar": {
    "metric": "weekly_engaged_active_subscribers",
    "definitionVersion": "1.0",
    "value": 42, "rate": 21, "previousValue": 30, "change": 12, "trend": "up",
    "confidence": "high", "isLowerBound": true, "identityCoverage": 0.6,
    "coverage": "…", "notes": ["Confirmed lower bound — …"]
  },
  "review": {
    "verdict": "…", "northStarStatus": "…",
    "improved": ["…"], "deteriorated": [],
    "topOpportunity": "…", "topRisk": null,
    "recommendedAction": { "…": "one prioritised, evidence-backed action" },
    "evidence": "…", "confidence": "high", "dataQualityNotes": ["…"]
  },
  "topRecommendation": { "id": "growth-lift-conversion", "title": "…", "expectedImpact": "high", "…": "…" },
  "recommendations": [ /* ranked: impact → confidence → effort */ ],
  "risks": [], "opportunities": [],
  "dataQuality": [ /* per-metric source, observability, coverage, confidence */ ]
}
```

## Definition of a recommendation

Every recommendation carries the evidence chain the platform is built on
(Facts → Intelligence → Decisions): `observed`, `whyItMatters`, `evidence`,
`sampleSize`, `confidence`, `expectedImpact`, `effort`, `guardrails`, `action`,
`successMetric`, `measurementWindow`, `reviewOn`, and `intelligenceKeys` linking
back to the intelligence item (which in turn cites the facts). Nothing is
recommended without evidence.
