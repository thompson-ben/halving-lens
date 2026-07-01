// Editorial carousel engine (V2). Turns a research finding into a deck of TYPED,
// visual slides — the number/comparison is the hero, the prose is secondary — so
// each slide is understood in ~3 seconds. Hero figures are computed LIVE from the
// same engines that back the finding's evidence, so they're accurate and never
// drift. The renderer (the card image route) draws each slide kind; this module
// only decides the structure. Premium, calm, institutional — no decoration.

import { forwardReturnByBand } from "./sentiment";
import { simulateThreeWay, DISTRIBUTION_PRESETS } from "./accumulationDca";
import { fmtUsd } from "./format";
import type { ResearchFinding } from "./findings";

export interface StatItem {
  label: string;
  value: string;
  tone?: "up" | "down" | "neutral";
}
export interface BarItem {
  label: string;
  value: string;
  pct: number; // 0–100 bar fill
  highlight?: boolean;
}

export type CarouselSlide =
  | { kind: "hook"; id: string; lines: string[] }
  | { kind: "statement"; label: string; text: string; tone: "red" | "gold" | "accent" }
  | { kind: "statCompare"; title: string; note?: string; items: StatItem[] }
  | { kind: "bars"; title: string; note?: string; items: BarItem[] }
  | { kind: "doDont"; dont: string; do: string }
  | { kind: "cta"; id: string };

const pctR = (n: number) => `${n >= 0 ? "+" : ""}${Math.round(n)}%`;

function hookLines(f: ResearchFinding): string[] {
  if (f.social?.hook?.length) return f.social.hook;
  const t = f.title.replace(/\?$/, "");
  const parts = t.split(/[:—]/).map((s) => s.trim()).filter(Boolean);
  return parts.length > 1 ? parts : [f.title];
}

// The hero comparison — live from the evidence engine, or authored via social.stat.
function heroStat(f: ResearchFinding): CarouselSlide | null {
  if (f.social?.stat) {
    return { kind: "statCompare", title: f.social.stat.title, note: f.social.stat.note, items: f.social.stat.items };
  }
  if (f.evidence === "fear-forward") {
    const rows = forwardReturnByBand(365);
    const ef = rows.find((r) => r.band === "extreme-fear");
    const eg = rows.find((r) => r.band === "extreme-greed");
    if (ef && eg)
      return {
        kind: "statCompare",
        title: "Average 1-year return",
        note: "Since 2018 · measured after each sentiment reading",
        items: [
          { label: "After extreme fear", value: pctR(ef.avgReturn), tone: "up" },
          { label: "After extreme greed", value: pctR(eg.avgReturn), tone: "neutral" },
        ],
      };
  }
  if (f.evidence === "dca-threeway") {
    const cfg = DISTRIBUTION_PRESETS.balanced;
    const sim = simulateThreeWay({ standardWeekly: 100, buyByBand: cfg.buy, targetSellPct: cfg.sell });
    return {
      kind: "statCompare",
      title: "End value per $1,000 invested",
      note: "Bitcoin's full weekly history",
      items: [
        { label: "Dynamic DCA", value: fmtUsd(Math.round(sim.dynamic.valuePerThousand), { compact: true }), tone: "up" },
        { label: "+ Distribution", value: fmtUsd(Math.round(sim.distribute.valuePerThousand), { compact: true }), tone: "neutral" },
      ],
    };
  }
  return null;
}

// The supporting evidence chart — a mini bar chart, live from the engine.
function evidenceBars(f: ResearchFinding): CarouselSlide | null {
  if (f.evidence === "fear-forward") {
    const rows = forwardReturnByBand(365);
    if (!rows.length) return null;
    const max = Math.max(...rows.map((r) => r.avgReturn));
    return {
      kind: "bars",
      title: "1-year return by sentiment",
      note: "Fear & Greed record, 2018 onward",
      items: rows.map((r) => ({
        label: r.label,
        value: pctR(r.avgReturn),
        pct: Math.max(6, Math.round((r.avgReturn / max) * 100)),
        highlight: r.band === "extreme-fear",
      })),
    };
  }
  if (f.evidence === "dca-threeway") {
    const cfg = DISTRIBUTION_PRESETS.balanced;
    const sim = simulateThreeWay({ standardWeekly: 100, buyByBand: cfg.buy, targetSellPct: cfg.sell });
    const rows = [
      { label: "Standard DCA", v: sim.standard.valuePerThousand, key: "standard" },
      { label: "Dynamic DCA", v: sim.dynamic.valuePerThousand, key: "dynamic" },
      { label: "+ Distribution", v: sim.distribute.valuePerThousand, key: "distribute" },
    ];
    const max = Math.max(...rows.map((r) => r.v));
    return {
      kind: "bars",
      title: "Value per $1,000, by strategy",
      note: "Higher is better",
      items: rows.map((r) => ({
        label: r.label,
        value: fmtUsd(Math.round(r.v), { compact: true }),
        pct: Math.max(6, Math.round((r.v / max) * 100)),
        highlight: r.key === sim.bestKey,
      })),
    };
  }
  return null;
}

// Build the full deck. Framework: Hook → Myth → Hero stat → Evidence → Takeaway → CTA.
export function buildFindingSlides(f: ResearchFinding): CarouselSlide[] {
  const slides: CarouselSlide[] = [];
  slides.push({ kind: "hook", id: f.id, lines: hookLines(f) });
  slides.push({ kind: "statement", label: "MYTH", text: f.myth.myth, tone: "red" });

  const hero = heroStat(f);
  slides.push(hero ?? { kind: "statement", label: "REALITY", text: f.myth.reality, tone: "accent" });

  const bars = evidenceBars(f);
  if (bars) slides.push(bars);
  else if (hero) slides.push({ kind: "statement", label: "REALITY", text: f.myth.reality, tone: "accent" });

  slides.push(
    f.social?.doDont
      ? { kind: "doDont", dont: f.social.doDont.dont, do: f.social.doDont.do }
      : { kind: "statement", label: "TAKEAWAY", text: f.myth.takeaway, tone: "gold" },
  );
  slides.push({ kind: "cta", id: f.id });
  return slides;
}

// A plain-text rendering of a slide, for the copy-paste caption/preview (so text
// and images stay in lockstep).
export function slideToText(s: CarouselSlide): string {
  switch (s.kind) {
    case "hook":
      return `${s.id}\n${s.lines.join(" ")}`;
    case "statement":
      return `${s.label}\n${s.text}`;
    case "statCompare":
      return `${s.title}\n${s.items.map((i) => `${i.label}: ${i.value}`).join("  vs  ")}${s.note ? `\n(${s.note})` : ""}`;
    case "bars":
      return `${s.title}\n${s.items.map((i) => `${i.label}: ${i.value}`).join(" · ")}`;
    case "doDont":
      return `DON'T: ${s.dont}\nDO: ${s.do}`;
    case "cta":
      return `Read the full research — ${s.id}\nhalvinglens.com`;
  }
}
