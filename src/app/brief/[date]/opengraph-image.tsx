import { ImageResponse } from "next/og";
import { buildBrief } from "@/lib/brief";
import { cycleSummary } from "@/lib/cycleSummary";
import { storedBrief, isToday, isValidSlug, formatSlugDate } from "@/lib/briefArchive";
import { fmtPct, fmtUsd } from "@/lib/format";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Rendered on demand — @vercel/og can't be prerendered offline at build.
export const dynamic = "force-dynamic";
export const alt = "Bitcoin Cycle Brief — halving.lens";

const HEAT_LABEL: Record<string, string> = {
  cool: "Cool",
  neutral: "Neutral",
  heating: "Heating",
  elevated: "Elevated",
  euphoria: "Euphoric",
};

// Per-date share card. Uses the persisted brief for that day (real history);
// for today, the live brief; otherwise a generic dated card.
export default async function Image({ params }: { params: { date: string } }) {
  const slug = params.date;

  let dateLabel: string;
  let headline: string;
  let phaseLabel: string;
  let price: number | null = null;
  let chg = "";
  let cycleDay: number | null = null;
  let progressPct: number | null = null;
  let heat = "neutral";

  const stored = isValidSlug(slug) ? storedBrief(slug) : null;
  if (stored) {
    dateLabel = stored.dateLabel;
    headline = stored.headline;
    phaseLabel = stored.phaseLabel;
    price = stored.price;
    chg = stored.changePct != null ? `${fmtPct(stored.changePct, 1)} ${stored.changeLabel}` : "";
    cycleDay = stored.cycleDay;
    progressPct = stored.progressPct;
    heat = stored.heat;
  } else if (isValidSlug(slug) && isToday(slug)) {
    const b = buildBrief();
    const s = cycleSummary();
    dateLabel = b.date;
    headline = b.headline;
    phaseLabel = s.phaseLabel;
    price = s.price;
    chg = s.change24h != null ? `${fmtPct(s.change24h, 1)} ${s.changeLabel}` : "";
    cycleDay = s.cycleDay;
    progressPct = s.progressPct;
    heat = s.heat;
  } else {
    dateLabel = isValidSlug(slug) ? formatSlugDate(slug) : "Archive";
    headline = "Bitcoin Cycle Brief";
    phaseLabel = "halving.lens";
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0e14",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: "#5eead4" }} />
            <div style={{ display: "flex", fontSize: 28, color: "#e4e9f0", fontWeight: 600 }}>
              halving.lens
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#9aa6b4" }}>
            Bitcoin Cycle Brief · {dateLabel}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 26, color: "#5eead4" }}>{phaseLabel}</div>
          <div
            style={{
              display: "flex",
              fontSize: 54,
              color: "#f3f6fa",
              fontWeight: 700,
              lineHeight: 1.12,
              maxWidth: 1040,
            }}
          >
            {headline}
          </div>
        </div>

        <div style={{ display: "flex", gap: 64 }}>
          {price != null && <Stat label="BTC PRICE" value={`${fmtUsd(price)}${chg ? ` (${chg})` : ""}`} />}
          {cycleDay != null && <Stat label="CYCLE DAY" value={`${cycleDay} · ${progressPct}%`} />}
          {price != null && <Stat label="HEAT" value={HEAT_LABEL[heat] ?? "Neutral"} />}
        </div>
      </div>
    ),
    size,
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", fontSize: 18, color: "#6f7c8e" }}>{label}</div>
      <div style={{ display: "flex", fontSize: 34, color: "#e4e9f0", fontWeight: 600 }}>{value}</div>
    </div>
  );
}
