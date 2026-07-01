import { ImageResponse } from "next/og";
import { findingBySlug, findingSlugs } from "@/lib/findings";
import { buildFindingSlides, type CarouselSlide } from "@/lib/findingCarousel";
import { brandFonts } from "@/lib/ogFonts";

// Editorial carousel V2 — one 1080×1350 PNG per typed slide. The number /
// comparison is the hero; prose is secondary; understood in ~3 seconds. Premium
// dark + gold, matching the research aesthetic. Public + prerendered.

const SIZE = { width: 1080, height: 1350 };
const GOLD = "#d9b96a";
const INK = "#f4f1ea";
const SUB = "#c2c6cf";
const DIM = "#8c919c";
const GREEN = "#3ddc97";
const RED = "#ff5d5d";

const tone = (t?: string) => (t === "up" ? GREEN : t === "down" ? RED : SUB);

export function generateStaticParams() {
  const out: { slug: string; n: string }[] = [];
  for (const slug of findingSlugs()) {
    const f = findingBySlug(slug);
    if (!f) continue;
    const count = buildFindingSlides(f).length;
    for (let i = 0; i < count; i++) out.push({ slug, n: String(i) });
  }
  return out;
}

function Body({ s }: { s: CarouselSlide }) {
  if (s.kind === "hook") {
    const size = s.lines.length >= 3 ? 100 : 116;
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        {s.lines.map((l, i) => (
          <div key={i} style={{ display: "flex", fontFamily: "Fraunces", fontSize: size, fontWeight: 600, color: i === 0 ? INK : GOLD, lineHeight: 1.04, letterSpacing: -2 }}>
            {l}
          </div>
        ))}
      </div>
    );
  }

  if (s.kind === "statement") {
    const c = s.tone === "red" ? RED : s.tone === "gold" ? GOLD : "#5eead4";
    const size = s.text.length > 80 ? 62 : s.text.length > 44 ? 76 : 92;
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignSelf: "flex-start", fontSize: 24, fontWeight: 700, letterSpacing: 6, color: c, border: `2px solid ${c}`, borderRadius: 10, padding: "8px 18px", marginBottom: 34 }}>
          {s.label}
        </div>
        <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: size, fontWeight: 600, color: INK, lineHeight: 1.1, letterSpacing: -1, maxWidth: 900 }}>
          {s.text}
        </div>
      </div>
    );
  }

  if (s.kind === "statCompare") {
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 26, fontWeight: 600, letterSpacing: 4, color: GOLD, textTransform: "uppercase", marginBottom: 40 }}>{s.title}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {s.items.map((it, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 30, color: SUB }}>{it.label}</div>
              <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 132, fontWeight: 600, color: tone(it.tone), lineHeight: 1, letterSpacing: -2 }}>{it.value}</div>
            </div>
          ))}
        </div>
        {s.note ? <div style={{ display: "flex", fontSize: 22, color: DIM, marginTop: 34 }}>{s.note}</div> : <div style={{ display: "flex" }} />}
      </div>
    );
  }

  if (s.kind === "bars") {
    return (
      <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        <div style={{ display: "flex", fontSize: 26, fontWeight: 600, letterSpacing: 4, color: GOLD, textTransform: "uppercase", marginBottom: 40 }}>{s.title}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, width: "100%" }}>
          {s.items.map((it, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                <div style={{ display: "flex", fontSize: 27, color: it.highlight ? INK : SUB }}>{it.label}</div>
                <div style={{ display: "flex", fontSize: 27, fontWeight: 600, color: it.highlight ? GOLD : SUB }}>{it.value}</div>
              </div>
              <div style={{ display: "flex", width: "100%", height: 18, background: "rgba(255,255,255,0.06)", borderRadius: 9, marginTop: 8 }}>
                <div style={{ display: "flex", width: `${it.pct}%`, height: 18, background: it.highlight ? GOLD : "#3a4454", borderRadius: 9 }} />
              </div>
            </div>
          ))}
        </div>
        {s.note ? <div style={{ display: "flex", fontSize: 22, color: DIM, marginTop: 30 }}>{s.note}</div> : <div style={{ display: "flex" }} />}
      </div>
    );
  }

  if (s.kind === "doDont") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 30, width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", borderLeft: `5px solid ${RED}`, paddingLeft: 26 }}>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 4, color: RED, marginBottom: 12 }}>DON&apos;T</div>
          <div style={{ display: "flex", fontSize: 40, color: SUB, lineHeight: 1.3, maxWidth: 880 }}>{s.dont}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", borderLeft: `5px solid ${GREEN}`, paddingLeft: 26 }}>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 4, color: GREEN, marginBottom: 12 }}>DO</div>
          <div style={{ display: "flex", fontSize: 40, color: INK, lineHeight: 1.3, maxWidth: 880 }}>{s.do}</div>
        </div>
      </div>
    );
  }

  // cta
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", fontSize: 26, fontWeight: 600, letterSpacing: 4, color: DIM, textTransform: "uppercase", marginBottom: 24 }}>Read the full research</div>
      <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 132, fontWeight: 700, color: GOLD, letterSpacing: 2 }}>{s.id}</div>
      <div style={{ display: "flex", fontSize: 34, color: SUB, marginTop: 20 }}>halvinglens.com</div>
    </div>
  );
}

export async function GET(_req: Request, { params }: { params: { slug: string; n: string } }) {
  const f = findingBySlug(params.slug);
  if (!f) return new Response("Not found", { status: 404 });
  const slides = buildFindingSlides(f);
  const idx = Math.max(0, Math.min(slides.length - 1, Number(params.n) || 0));
  const slide = slides[idx];
  const fonts = brandFonts();

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0a0c10", padding: 80, fontFamily: "Inter" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 24, fontWeight: 700, letterSpacing: 4, color: INK }}>
            <div style={{ display: "flex", width: 16, height: 16, background: GOLD, transform: "rotate(45deg)", marginRight: 16 }} />
            HALVINGLENS RESEARCH
          </div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: 3, color: GOLD }}>{f.id}</div>
        </div>

        <div style={{ display: "flex", width: "100%" }}>
          <Body s={slide} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 21, color: DIM }}>Historical context. Not prediction.</div>
          <div style={{ display: "flex", fontSize: 21, color: "#6b7079" }}>
            {idx + 1} / {slides.length}
          </div>
        </div>
      </div>
    ),
    { ...SIZE, ...(fonts.length ? { fonts } : {}) },
  );
}
