import { ImageResponse } from "next/og";
import { brandFonts } from "@/lib/ogFonts";

// Branded Meta ad creatives, rendered on demand. Dark + gold, matching the
// research aesthetic. Square (1080×1080) by default, or ?size=portrait
// (1080×1350). Public — these are meant to be posted.
//   /ads/a            → square
//   /ads/c?size=portrait
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GOLD = "#d9b96a";

interface Creative {
  kicker: string;
  headline: string;
  sub: string;
}

const CREATIVES: Record<string, Creative> = {
  a: {
    kicker: "Free daily research",
    headline: "Where does Bitcoin sit in its cycle?",
    sub: "13+ years of history, in a 60-second daily read. No hype, no predictions.",
  },
  b: {
    kicker: "HalvingLens",
    headline: "Context, not hype.",
    sub: "The calm daily Bitcoin research brief. No predictions. No price targets.",
  },
  c: {
    kicker: "Myth vs Reality",
    headline: "“Extreme fear means Bitcoin is broken.”",
    sub: "What 8+ years of history actually show. Free, evidence-first research.",
  },
};

export function generateStaticParams() {
  return Object.keys(CREATIVES).map((id) => ({ id }));
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const c = CREATIVES[params.id] ?? CREATIVES.a;
  const portrait = new URL(req.url).searchParams.get("size") === "portrait";
  const W = 1080;
  const H = portrait ? 1350 : 1080;
  const fonts = brandFonts();

  const len = c.headline.length;
  const titleSize = portrait ? (len > 40 ? 76 : 92) : len > 40 ? 66 : 82;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0c10",
          padding: 80,
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 26, fontWeight: 700, letterSpacing: 4, color: "#f4f1ea" }}>
          <div style={{ display: "flex", width: 18, height: 18, background: GOLD, transform: "rotate(45deg)", marginRight: 18 }} />
          HALVINGLENS
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 23, fontWeight: 600, letterSpacing: 5, color: "#8c919c", textTransform: "uppercase", marginBottom: 26 }}>
            {c.kicker}
          </div>
          <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: titleSize, fontWeight: 600, color: "#f4f1ea", lineHeight: 1.06, letterSpacing: -1 }}>
            {c.headline}
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#c2c6cf", lineHeight: 1.42, marginTop: 28, maxWidth: 880 }}>{c.sub}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 22, color: "#8c919c" }}>Historical context. Not prediction.</div>
          <div style={{ display: "flex", fontSize: 22, color: GOLD }}>halvinglens.com</div>
        </div>
      </div>
    ),
    { width: W, height: H, ...(fonts.length ? { fonts } : {}) },
  );
}
