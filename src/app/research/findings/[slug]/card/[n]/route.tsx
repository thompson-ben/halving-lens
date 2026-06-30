import { ImageResponse } from "next/og";
import { findingBySlug, findingSlugs } from "@/lib/findings";
import { findingCarousel } from "@/lib/findingContent";
import { brandFonts } from "@/lib/ogFonts";

// Auto-generated Instagram carousel slides (1080×1350 PNG) for a Research
// Finding — zero manual design. One image per slide of findingCarousel(). The
// permanent HL-R id appears on every slide, so the asset is itself a citation.
// Public + prerendered so the share kit can link straight to downloadable PNGs.

const SIZE = { width: 1080, height: 1350 };
const GOLD = "#d9b96a";

export function generateStaticParams() {
  const out: { slug: string; n: string }[] = [];
  for (const slug of findingSlugs()) {
    const f = findingBySlug(slug);
    if (!f) continue;
    const count = findingCarousel(f).length;
    for (let i = 0; i < count; i++) out.push({ slug, n: String(i) });
  }
  return out;
}

export async function GET(_req: Request, { params }: { params: { slug: string; n: string } }) {
  const f = findingBySlug(params.slug);
  if (!f) return new Response("Not found", { status: 404 });
  const slides = findingCarousel(f);
  const idx = Math.max(0, Math.min(slides.length - 1, Number(params.n) || 0));
  const slide = slides[idx];
  const fonts = brandFonts();

  const titleLen = slide.title.length;
  const titleSize = titleLen > 90 ? 50 : titleLen > 55 ? 62 : titleLen > 30 ? 76 : 92;

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 25, fontWeight: 700, letterSpacing: 4, color: "#f4f1ea" }}>
            <div style={{ display: "flex", width: 18, height: 18, background: GOLD, transform: "rotate(45deg)", marginRight: 18 }} />
            HALVINGLENS RESEARCH
          </div>
          <div style={{ display: "flex", fontSize: 25, fontWeight: 700, letterSpacing: 3, color: GOLD }}>{f.id}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 23, fontWeight: 600, letterSpacing: 5, color: "#8c919c", marginBottom: 30 }}>
            {slide.kicker.toUpperCase()}
          </div>
          <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: titleSize, fontWeight: 600, color: "#f4f1ea", lineHeight: 1.08, letterSpacing: -1 }}>
            {slide.title}
          </div>
          {slide.body ? (
            <div style={{ display: "flex", fontSize: 30, color: "#c2c6cf", lineHeight: 1.4, marginTop: 30, maxWidth: 880 }}>{slide.body}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 21, color: "#8c919c" }}>Historical context. Not prediction.</div>
          <div style={{ display: "flex", fontSize: 21, color: "#6b7079" }}>
            {idx + 1} / {slides.length}
          </div>
        </div>
      </div>
    ),
    { ...SIZE, ...(fonts.length ? { fonts } : {}) },
  );
}
