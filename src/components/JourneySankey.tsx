"use client";

// Interactive Visitor Flow — the Sankey, now investigable. Click any node to
// trace every journey that touches it: entry → … → node → … → outcome. Click
// "Subscribed" to see every converting path; click a page to see everything that
// flows through it. Click again (or "Clear") to reset. Pure client-side over the
// same deterministic nodes/links the engine produces — no extra data fetched.

import { useMemo, useState } from "react";
import type { SankeyNode, SankeyLink } from "@/lib/journeyAnalytics";

const W = 900;
const H = 380;
const PAD_Y = 14;
const COL_X = [40, 320, 600, 860];
const NODE_W = 12;
const GAP = 10;
const COL_TITLE = ["Entry", "2nd page", "3rd page", "Outcome"];
const PALETTE = ["#5eead4", "#3ddc97", "#f5b942", "#8b9bd0", "#c78bd0", "#6fb3d0"];

export function JourneySankey({ nodes, links }: { nodes: SankeyNode[]; links: SankeyLink[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  const layout = useMemo(() => {
    const cols: SankeyNode[][] = [[], [], [], []];
    for (const n of nodes) if (n.col >= 0 && n.col <= 3) cols[n.col].push(n);

    const inSum = new Map<string, number>();
    const outSum = new Map<string, number>();
    for (const l of links) {
      outSum.set(l.source, (outSum.get(l.source) ?? 0) + l.value);
      inSum.set(l.target, (inSum.get(l.target) ?? 0) + l.value);
    }
    const thru = (id: string) => Math.max(inSum.get(id) ?? 0, outSum.get(id) ?? 0);

    type Box = { id: string; label: string; x: number; y: number; h: number; col: number };
    const boxes = new Map<string, Box>();
    let maxColTotal = 1;
    for (const c of cols) maxColTotal = Math.max(maxColTotal, c.reduce((a, n) => a + thru(n.id), 0));
    const usableH = H - PAD_Y * 2;
    for (let c = 0; c < 4; c++) {
      const list = [...cols[c]].sort((a, b) => thru(b.id) - thru(a.id));
      const total = list.reduce((a, n) => a + thru(n.id), 0) || 1;
      const gaps = Math.max(0, list.length - 1) * GAP;
      const scale = (usableH - gaps) / Math.max(total, maxColTotal ? total : 1);
      let y = PAD_Y + (usableH - (total * scale + gaps)) / 2;
      for (const n of list) {
        const h = Math.max(thru(n.id) * scale, 2);
        boxes.set(n.id, { id: n.id, label: n.label, x: COL_X[c], y, h, col: c });
        y += h + GAP;
      }
    }
    return { boxes, thru };
  }, [nodes, links]);

  // Every link on a path THROUGH the selected node = links reachable walking
  // backward to entries + forward to outcomes. That's "every journey touching X".
  const highlighted = useMemo(() => {
    if (!selected) return null;
    const fwd = new Map<string, SankeyLink[]>();
    const bwd = new Map<string, SankeyLink[]>();
    for (const l of links) {
      (fwd.get(l.source) ?? fwd.set(l.source, []).get(l.source)!).push(l);
      (bwd.get(l.target) ?? bwd.set(l.target, []).get(l.target)!).push(l);
    }
    const keptLinks = new Set<string>();
    const keptNodes = new Set<string>([selected]);
    const walk = (start: string, adj: Map<string, SankeyLink[]>, nextOf: (l: SankeyLink) => string) => {
      const stack = [start];
      const seen = new Set<string>();
      while (stack.length) {
        const cur = stack.pop()!;
        if (seen.has(cur)) continue;
        seen.add(cur);
        for (const l of adj.get(cur) ?? []) {
          keptLinks.add(`${l.source}|${l.target}`);
          const nxt = nextOf(l);
          keptNodes.add(nxt);
          stack.push(nxt);
        }
      }
    };
    walk(selected, fwd, (l) => l.target); // downstream
    walk(selected, bwd, (l) => l.source); // upstream
    return { keptLinks, keptNodes };
  }, [selected, links]);

  if (!nodes.length || !links.length) {
    return <p className="text-[13px] text-ink-500">Not enough multi-page journeys yet to draw the flow.</p>;
  }

  const { boxes, thru } = layout;
  const outOff = new Map<string, number>();
  const inOff = new Map<string, number>();
  const scaleFor = (id: string) => {
    const b = boxes.get(id);
    return b ? b.h / Math.max(thru(id), 1) : 0;
  };
  const ordered = [...links].sort((a, b) => (boxes.get(a.source)?.y ?? 0) - (boxes.get(b.source)?.y ?? 0) || b.value - a.value);

  const paths = ordered.map((l, i) => {
    const s = boxes.get(l.source);
    const t = boxes.get(l.target);
    if (!s || !t) return null;
    const sw = l.value * scaleFor(l.source);
    const tw = l.value * scaleFor(l.target);
    const so = outOff.get(l.source) ?? 0;
    const to = inOff.get(l.target) ?? 0;
    outOff.set(l.source, so + sw);
    inOff.set(l.target, to + tw);
    const x1 = s.x + NODE_W;
    const y1 = s.y + so + sw / 2;
    const x2 = t.x;
    const y2 = t.y + to + tw / 2;
    const mx = (x1 + x2) / 2;
    const isKept = !highlighted || highlighted.keptLinks.has(`${l.source}|${l.target}`);
    const color = PALETTE[s.col === 0 ? i % PALETTE.length : s.col];
    return (
      <path
        key={i}
        d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
        fill="none"
        stroke={color}
        strokeOpacity={isKept ? (highlighted ? 0.5 : 0.22) : 0.05}
        strokeWidth={Math.max(sw, 1)}
      />
    );
  });

  const toggle = (id: string) => setSelected((cur) => (cur === id ? null : id));
  const selectedLabel = selected ? boxes.get(selected)?.label : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <p className="text-[11px] text-ink-500">
          {selectedLabel ? (
            <>Tracing every journey touching <span className="text-accent">{selectedLabel}</span>.</>
          ) : (
            <>Click any node to trace the journeys that flow through it.</>
          )}
        </p>
        {selected && (
          <button onClick={() => setSelected(null)} className="text-[11px] text-ink-400 hover:text-ink-100 border border-white/[0.12] rounded-md px-2 py-0.5 transition-colors">
            Clear
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 680 }} role="img" aria-label="Interactive visitor flow Sankey diagram">
          {COL_X.map((x, i) => (
            <text key={i} x={x} y={10} fontSize="9" fill="#5a6677" textAnchor={i === 3 ? "end" : "start"} style={{ textTransform: "uppercase", letterSpacing: "0.12em" }}>
              {COL_TITLE[i]}
            </text>
          ))}
          {paths}
          {[...boxes.values()].map((b) => {
            const dim = highlighted != null && !highlighted.keptNodes.has(b.id);
            const isSel = selected === b.id;
            return (
              <g key={b.id} onClick={() => toggle(b.id)} style={{ cursor: "pointer" }}>
                {/* Invisible wide hit-area so the thin bar + label are easy to click. */}
                <rect x={b.col === 3 ? b.x - 220 : b.x - 4} y={b.y - 5} width={232} height={b.h + 10} fill="transparent" />
                <rect
                  x={b.x}
                  y={b.y}
                  width={NODE_W}
                  height={b.h}
                  rx={2}
                  fill={b.col === 3 ? "#3ddc97" : "#5eead4"}
                  fillOpacity={dim ? 0.25 : 0.9}
                  stroke={isSel ? "#ffffff" : "none"}
                  strokeWidth={isSel ? 2 : 0}
                />
                <text
                  x={b.col === 3 ? b.x - 6 : b.x + NODE_W + 6}
                  y={b.y + b.h / 2}
                  fontSize="10.5"
                  fill={dim ? "#5a6677" : isSel ? "#ffffff" : "#bfc7d2"}
                  fontWeight={isSel ? 600 : 400}
                  textAnchor={b.col === 3 ? "end" : "start"}
                  dominantBaseline="middle"
                >
                  {b.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
