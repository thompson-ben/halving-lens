import { weeklyConfigurationTable, _internals } from "@/lib/fourReferencePrices";

// Configuration ribbon (Phase C) — one cell per week over the
// full-configuration window, coloured by how many of the three references
// price sat above that week (0..3). Weeks sharing today's exact
// configuration carry a marker tick, so "how unusual is today" reads at a
// glance. Server-rendered SVG; each cell narrates itself via <title>.

const COUNT_COLOR = ["#ff5d5d", "#f5b942", "#8893a4", "#16c784"] as const;
const COUNT_LABEL = ["Below all three", "Above one", "Above two", "Above all three"] as const;

export function ConfigurationRibbon() {
  const rows = _internals.rowsForTier("full");
  if (rows.length < 8) return null;
  const todayKey = _internals.rowKey(rows[rows.length - 1], "full");
  const n = rows.length;

  return (
    <div>
      <svg
        viewBox={`0 0 ${n} 14`}
        preserveAspectRatio="none"
        className="w-full h-10 rounded-md overflow-hidden"
        role="img"
        aria-label={`Weekly configurations since ${rows[0].date}: each cell shows how many of the three reference prices the market sat above; ticks mark weeks matching today's configuration.`}
      >
        {rows.map((r, i) => {
          const count = (r.aboveTrend ? 1 : 0) + (r.aboveHolders ? 1 : 0) + (r.aboveMiners ? 1 : 0);
          const match = _internals.rowKey(r, "full") === todayKey;
          return (
            <g key={r.ts}>
              <rect x={i} y={0} width={1.02} height={10} fill={COUNT_COLOR[count]} fillOpacity={0.82}>
                <title>{`${r.date} — ${COUNT_LABEL[count]}${match ? " · matches today" : ""}`}</title>
              </rect>
              {match && <rect x={i} y={11} width={1.02} height={3} fill="#5eead4" />}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center gap-x-4 gap-y-1.5 flex-wrap text-[10.5px] text-ink-400">
        {COUNT_LABEL.map((l, i) => (
          <span key={l} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: COUNT_COLOR[i], opacity: 0.82 }} />
            {l}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-[3px] rounded-sm bg-accent" />
          Matches today&rsquo;s configuration
        </span>
      </div>
    </div>
  );
}
