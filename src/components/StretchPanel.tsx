import { stretchRead, HEAT_LABEL } from "@/lib/cycleSummary";
import { fmtPct } from "@/lib/format";

// "Was this historically a stretched time?" — the beginner buy-context read.
// Framed strictly as historical position, never as advice.
const SCALE: { key: string; label: string; tone: string }[] = [
  { key: "cool", label: "Cool", tone: "bg-signal-blue" },
  { key: "neutral", label: "Neutral", tone: "bg-accent" },
  { key: "heating", label: "Heating", tone: "bg-signal-green" },
  { key: "elevated", label: "Elevated", tone: "bg-signal-amber" },
  { key: "euphoria", label: "Euphoria", tone: "bg-signal-red" },
];

export function StretchPanel() {
  const s = stretchRead();
  const activeIdx = SCALE.findIndex((x) => x.key === s.heat);
  // Marker position along the 0–100 scale from the Mayer percentile.
  const markerPct = s.percentile ?? (activeIdx + 0.5) * 20;

  return (
    <section>
      <div className="mb-6">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">
          Historical position
        </div>
        <h2 className="font-display text-[24px] lg:text-[30px] font-medium tracking-tight-2 text-ink-100 leading-tight">
          Historically, how stretched is Bitcoin today?
        </h2>
        <p className="mt-2.5 text-[14px] text-ink-300 max-w-2xl leading-relaxed">
          A plain read of where today sits in Bitcoin&apos;s historical range — not whether to buy,
          just how cheap or stretched this moment looks against the past.
        </p>
      </div>

      <div className="card-glow p-6 lg:p-8 relative overflow-hidden">
        <div className="relative z-10">
          {/* The verdict */}
          <div className="flex items-baseline gap-3 flex-wrap mb-5">
            <span className="font-display text-[30px] lg:text-[36px] font-medium tracking-tight-2 text-ink-50">
              {HEAT_LABEL[s.heat]}
            </span>
            {s.percentile != null && (
              <span className="text-[13px] text-ink-400">
                ~{s.percentile}th percentile vs all history
              </span>
            )}
          </div>

          {/* Scale */}
          <div className="max-w-2xl">
            <div className="relative h-2 rounded-full bg-gradient-to-r from-signal-blue via-accent via-30% to-signal-red overflow-visible">
              <div
                className="absolute -top-1 w-4 h-4 rounded-full bg-ink-50 ring-2 ring-ink-950 -translate-x-1/2"
                style={{ left: `${Math.min(100, Math.max(0, markerPct))}%`, boxShadow: "0 0 12px rgba(255,255,255,0.5)" }}
              />
            </div>
            <div className="mt-3 flex justify-between text-[10px] font-mono text-ink-400">
              {SCALE.map((x, i) => (
                <span key={x.key} className={i === activeIdx ? "text-ink-100 font-medium" : ""}>
                  {x.label}
                </span>
              ))}
            </div>
          </div>

          <p className="mt-6 text-[14px] text-ink-200 max-w-2xl leading-relaxed">{s.plain}</p>

          {/* Supporting figures */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden max-w-2xl">
            <Fact label="Gain since halving" value={fmtPct(s.gainFromHalving, 0)} tone={s.gainFromHalving} />
            <Fact label="From all-time high" value={fmtPct(s.drawdownFromAth, 0)} tone={s.drawdownFromAth} />
            <Fact label="Heat level" value={HEAT_LABEL[s.heat]} />
          </div>

          <p className="mt-5 text-[11.5px] text-ink-500 max-w-2xl leading-relaxed">
            Historical context, not financial advice. This describes where price sits versus its own
            history — it does not suggest what price will do next.
          </p>
        </div>
        <div className="watermark">halvinglens.com · historical position</div>
      </div>
    </section>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: number }) {
  const color = tone == null ? "text-ink-100" : tone >= 0 ? "text-signal-green" : "text-signal-red";
  return (
    <div className="bg-[#0b0f15] px-4 py-4">
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className={`mt-1.5 font-mono text-[16px] tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
