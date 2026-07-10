import { ImageResponse } from "next/og";
import { cycleSummary, HEAT_LABEL } from "@/lib/cycleSummary";
import { fmtUsd } from "@/lib/format";
import { brandFonts } from "@/lib/ogFonts";

// Founder's Collection wallpapers — premium branded backdrops built from the
// live cycle read. Two formats: a phone lock-screen (1080×1920) and a desktop
// (2560×1440). Rendered on demand from the same pipeline that powers every share
// card, so they refresh with the data and need no manual upkeep.
export const dynamic = "force-dynamic";

const GOLD = "#d9b96a";
const INK = "#f4f1ea";
const SUB = "#c2c6cf";
const DIM = "#8c919c";

const HEAT_COLOR: Record<string, string> = {
  cool: "#5aa9ff",
  neutral: "#5eead4",
  heating: "#3ddc97",
  elevated: "#f5b942",
  euphoria: "#ff5d5d",
};

const FORMATS: Record<string, { width: number; height: number; phone: boolean }> = {
  phone: { width: 1080, height: 1920, phone: true },
  desktop: { width: 2560, height: 1440, phone: false },
};

export function generateStaticParams() {
  return Object.keys(FORMATS).map((format) => ({ format }));
}

export async function GET(_req: Request, { params }: { params: { format: string } }) {
  const spec = FORMATS[params.format];
  if (!spec) return new Response("Not found", { status: 404 });

  const s = cycleSummary();
  const heatColor = HEAT_COLOR[s.heat] ?? "#5eead4";
  const fonts = brandFonts();
  const { phone } = spec;

  // Scale the layout: the phone is portrait and leaves room top & bottom; the
  // desktop centres a wider composition. Both share the mark + read-outs.
  const pad = phone ? 90 : 150;
  const bigNum = phone ? 300 : 360;
  const phaseSize = phone ? 60 : 74;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "radial-gradient(120% 90% at 50% 0%, #101722 0%, #0a0e14 55%, #06080c 100%)",
          padding: pad,
          fontFamily: "Inter",
        }}
      >
        {/* Mark */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: phone ? "center" : "flex-start", gap: 20 }}>
          <div style={{ display: "flex", width: 26, height: 26, background: GOLD, transform: "rotate(45deg)" }} />
          <div style={{ display: "flex", fontSize: phone ? 30 : 34, fontWeight: 700, letterSpacing: 6, color: INK }}>HALVINGLENS</div>
        </div>

        {/* Hero: cycle progress + phase */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: phone ? "center" : "flex-start", gap: 8 }}>
          <div style={{ display: "flex", fontSize: phone ? 26 : 30, letterSpacing: 4, color: DIM, textTransform: "uppercase" }}>
            Cycle 5 · {s.progressPct}% complete
          </div>
          <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: bigNum, fontWeight: 700, color: INK, lineHeight: 0.9, letterSpacing: -6 }}>
            {s.progressPct}%
          </div>
          <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: phaseSize, fontWeight: 600, color: heatColor, letterSpacing: -1 }}>
            {s.phaseLabel}
          </div>
        </div>

        {/* Read-outs */}
        <div style={{ display: "flex", flexDirection: "column", gap: phone ? 22 : 18, alignItems: phone ? "center" : "flex-start" }}>
          <div style={{ display: "flex", gap: phone ? 40 : 64, flexWrap: "wrap", justifyContent: phone ? "center" : "flex-start" }}>
            <Read label="RISK" value={HEAT_LABEL[s.heat]} color={heatColor} phone={phone} />
            <Read label="BTC" value={fmtUsd(s.price)} phone={phone} />
          </div>
          <div style={{ display: "flex", fontSize: phone ? 24 : 26, color: SUB }}>halvinglens.com · Historical context, not prediction</div>
        </div>
      </div>
    ),
    { width: spec.width, height: spec.height, ...(fonts.length ? { fonts } : {}) },
  );
}

function Read({ label, value, color, phone }: { label: string; value: string; color?: string; phone: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", fontSize: phone ? 22 : 24, color: DIM, letterSpacing: 3 }}>{label}</div>
      <div style={{ display: "flex", fontSize: phone ? 46 : 52, fontWeight: 600, color: color ?? INK }}>{value}</div>
    </div>
  );
}
