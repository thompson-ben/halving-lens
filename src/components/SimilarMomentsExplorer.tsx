"use client";

import { useState } from "react";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronDown } from "lucide-react";
import { similarMoments, currentMoment, type SimilarMoment } from "@/lib/similarity";
import { cycleScorecard } from "@/lib/cycleSummary";
import { sentimentRead, SENTIMENT_AVAILABLE } from "@/lib/sentiment";
import { fmtUsd } from "@/lib/format";

const pct = (n: number | null) => (n == null ? "—" : `${n >= 0 ? "+" : ""}${Math.round(n)}%`);
const toneOf = (n: number | null) => (n == null ? "text-ink-500" : n > 0 ? "text-signal-green" : n < 0 ? "text-signal-red" : "text-ink-300");

// Current conditions + the most similar historical moments, each expandable to a
// sparkline, metrics at the time, and what followed (30/60/90 days). Shared by
// the /price "Similar moments" tab and the dedicated /similar-moments page.
export function SimilarMomentsExplorer({ limit = 4, defaultOpen = 0 }: { limit?: number; defaultOpen?: number }) {
  const moments = similarMoments(limit);
  const cur = currentMoment();
  const sc = cycleScorecard();
  const sr = SENTIMENT_AVAILABLE ? sentimentRead() : null;
  const [open, setOpen] = useState(defaultOpen);

  if (!moments.length) {
    return <p className="text-[13px] text-ink-400">Not enough historical data to compare right now.</p>;
  }

  const conditions = [
    { label: "Cycle day", value: String(cur.day) },
    { label: "Drawdown", value: `${Math.round(cur.drawdown)}%`, tone: "down" as const },
    { label: "Cycle score", value: `${sc.overall} · ${sc.overallLabel}`, tone: "accent" as const },
    { label: "Fear & Greed", value: sr ? `${sr.value} · ${sr.band.label}` : "—" },
    { label: "Price vs halving", value: `${cur.gainMult.toFixed(1)}×` },
  ];

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-2.5">Current conditions</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
          {conditions.map((s) => (
            <div key={s.label} className="bg-[#0b0f15] px-4 py-3.5">
              <div className="text-[9.5px] uppercase tracking-[0.15em] text-ink-400">{s.label}</div>
              <div
                className={`mt-1.5 font-mono text-[15px] tabular-nums ${
                  s.tone === "down" ? "text-signal-red" : s.tone === "accent" ? "text-accent" : "text-ink-100"
                }`}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-2.5">Most similar historical moments</div>
        <div className="space-y-3">
          {moments.map((m, i) => (
            <MomentRow key={`${m.cycleId}-${m.day}`} m={m} rank={i + 1} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </div>
      </div>

      <p className="text-[11px] text-ink-500 leading-relaxed">
        Similarity is a price-derived match — cycle day, drawdown from the peak, Mayer Multiple and
        gain since the halving — across the 2012, 2016 and 2020 cycles. Fear &amp; Greed is shown
        where it existed (the index begins in 2018) but isn&apos;t used in the match. Historical
        context only. Past performance does not predict future results.
      </p>
    </div>
  );
}

function MomentRow({ m, rank, open, onToggle }: { m: SimilarMoment; rank: number; open: boolean; onToggle: () => void }) {
  return (
    <div className="card overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 sm:gap-4 p-4 text-left">
        <span className="font-mono text-[13px] text-ink-500 w-4 flex-shrink-0">{rank}</span>
        <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: m.color }} />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium text-ink-100">
            {m.dateLabel} <span className="text-ink-500 font-normal">· {m.year} cycle · day {m.day}</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-accent" style={{ width: `${m.similarity}%` }} />
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-mono text-[17px] tabular-nums text-accent">{m.similarity}%</div>
          <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-500">similar</div>
        </div>
        <ChevronDown size={16} className={`text-ink-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-5 border-t border-white/[0.05] pt-4">
          <p className="text-[12.5px] text-ink-300 leading-relaxed mb-4">{m.context}</p>

          <div style={{ width: "100%", height: 130 }}>
            <ResponsiveContainer>
              <LineChart data={m.spark} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                <XAxis dataKey="day" type="number" domain={["dataMin", "dataMax"]} hide />
                <YAxis domain={["auto", "auto"]} hide />
                <Tooltip
                  contentStyle={{ outline: "none" }}
                  labelFormatter={(v) => `Day ${v}`}
                  formatter={(value: number) => [`${(value as number).toFixed(2)}×`, "vs this moment"]}
                />
                <ReferenceLine y={1} stroke="rgba(255,255,255,0.18)" strokeDasharray="2 4" />
                <ReferenceLine x={m.markerDay} stroke={m.color} strokeWidth={1.5} />
                <Line type="monotone" dataKey="mult" stroke={m.color} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 mt-4">
            <Mini label="Price" value={fmtUsd(m.metrics.price, { compact: true })} />
            <Mini label="Cycle day" value={String(m.metrics.cycleDay)} />
            <Mini label="Drawdown" value={`${Math.round(m.metrics.drawdown)}%`} tone="down" />
            <Mini label="Mayer" value={m.metrics.mayer.toFixed(2)} />
            <Mini label="Vs halving" value={`${m.metrics.gainMult.toFixed(1)}×`} />
            <Mini label="Fear & Greed" value={m.metrics.fearGreed != null ? String(m.metrics.fearGreed) : "n/a"} />
          </div>

          {/* What happened next from this exact moment */}
          <div className="mt-4 pt-4 border-t border-white/[0.05]">
            <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400 mb-2.5">What happened next</div>
            <div className="grid grid-cols-3 gap-px rounded-lg border border-white/[0.06] bg-white/[0.06] overflow-hidden">
              {([["30 days", m.next.d30], ["60 days", m.next.d60], ["90 days", m.next.d90]] as const).map(([label, v]) => (
                <div key={label} className="bg-[#0b0f15] px-3 py-3 text-center">
                  <div className="text-[9.5px] uppercase tracking-wider text-ink-400">{label}</div>
                  <div className={`mt-1 font-mono text-[16px] tabular-nums ${toneOf(v)}`}>{pct(v)}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10.5px] text-ink-500">Historical outcome from this point in that cycle — not a prediction.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "down" }) {
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-wider text-ink-400">{label}</div>
      <div className={`mt-0.5 font-mono text-[13px] tabular-nums ${tone === "down" ? "text-signal-red" : "text-ink-100"}`}>
        {value}
      </div>
    </div>
  );
}
