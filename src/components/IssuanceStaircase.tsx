import { HALVINGS } from "@/lib/data/types";

// The issuance staircase — Bitcoin's supply schedule as one picture. Each step
// is the block reward for one epoch (real halving dates from HALVINGS; the
// next one projected and labelled as such). Server-rendered SVG, zero client
// JS: the schedule is a constant of the protocol, so the diagram is too.

const GOLD = "#d9b96a";
const INK_400 = "#8893a4";
const INK_600 = "#525c6b";
const LINE = "#5eead4";

const W = 800;
const H = 240;
const PAD = { top: 24, right: 16, bottom: 34, left: 44 };

export function IssuanceStaircase() {
  // Epoch start years from the real table; rewards halve from 50.
  const years = [1, 2, 3, 4, 5, 6].map((k) => Number(HALVINGS[k as keyof typeof HALVINGS].slice(0, 4)));
  const epochs = years.map((year, i) => ({ year, reward: 50 / 2 ** i, projected: i === years.length - 1 }));
  const xEnd = years[years.length - 1] + 4; // draw the final (projected) step one epoch wide

  const x = (year: number) => PAD.left + ((year - years[0]) / (xEnd - years[0])) * (W - PAD.left - PAD.right);
  const y = (reward: number) => PAD.top + (1 - reward / 50) * (H - PAD.top - PAD.bottom);

  // One continuous staircase path: across each epoch at its reward, then down.
  let d = `M ${x(epochs[0].year)} ${y(epochs[0].reward)}`;
  for (let i = 0; i < epochs.length; i++) {
    const next = i + 1 < epochs.length ? epochs[i + 1].year : xEnd;
    d += ` H ${x(next)}`;
    if (i + 1 < epochs.length) d += ` V ${y(epochs[i + 1].reward)}`;
  }

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Bitcoin's block reward halving schedule: 50 new coins per block in 2009, cut in half roughly every four years" className="w-full h-auto">
        {/* Reward gridlines */}
        {[50, 25, 12.5].map((r) => (
          <g key={r}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(r)} y2={y(r)} stroke="rgba(255,255,255,0.05)" />
            <text x={PAD.left - 8} y={y(r) + 4} textAnchor="end" fontSize={11} fill={INK_600}>{r}</text>
          </g>
        ))}
        <path d={d} fill="none" stroke={LINE} strokeWidth={2} />
        {/* Step markers + labels */}
        {epochs.map((e) => (
          <g key={e.year}>
            <circle cx={x(e.year)} cy={y(e.reward)} r={3} fill={LINE} />
            <text x={x(e.year)} y={H - 12} textAnchor="middle" fontSize={11} fill={e.projected ? INK_600 : INK_400}>
              {e.year}{e.projected ? "*" : ""}
            </text>
            {e.reward >= 3 && (
              <text x={x(e.year) + 6} y={y(e.reward) - 7} fontSize={11} fill={GOLD}>
                {e.reward}
              </text>
            )}
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 text-[11.5px] text-ink-500">
        New coins minted per block, by epoch. Each halving cuts issuance in half — the full schedule
        was fixed in 2009 and ends near the year 2140 at 21 million coins. *Next halving projected.
      </figcaption>
    </figure>
  );
}
