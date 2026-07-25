"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { PRICE_RANGES, type PricePoint, type PriceRangeKey } from "@/lib/btcPrice";
import { contextSeries, referenceValuesAt, type ContextPoint } from "@/lib/priceContext";
import { fmtUsd } from "@/lib/format";
import { SegmentedControl } from "./SegmentedControl";

// Price in Context (PR129/PR135): the price line stays the hero, joined by
// thin reference lines — the 200-day moving average (long-term trend, muted
// blue-grey, dashed), realized price (aggregate on-chain cost basis, gold),
// and Estimated Mining Cost (modelled electricity cost of new supply, violet,
// dotted — the dot pattern and the violet ESTIMATED colour both mark it as an
// estimate, so identity never rests on colour alone). The estimated line is
// omitted entirely when its data is unavailable or stale.
// Styling, interaction, ranges and animation are unchanged from Price History.

// Live intraday (hourly) series for the 1D/1W views — keyless CryptoCompare, so
// the recent window is genuinely current rather than a day-stale snapshot.
async function fetchIntraday(hours: number): Promise<PricePoint[]> {
  const res = await fetch(
    `https://min-api.cryptocompare.com/data/v2/histohour?fsym=BTC&tsym=USD&limit=${hours}`,
  );
  const json = (await res.json()) as { Data?: { Data?: Array<{ time: number; close: number }> } };
  return (json.Data?.Data ?? [])
    .filter((d) => d.close > 0)
    .map((d) => ({ ts: d.time * 1000, price: d.close }));
}

const INTRADAY_RANGES: Record<string, number> = { "1D": 24, "1W": 168 };

const MA_COLOR = "#8893a4"; // ink-300 — deliberately recessive
const RP_COLOR = "#f5b942"; // house amber
const MC_COLOR = "#a78bfa"; // signal violet — the ESTIMATED colour

const SERIES_EXPLAIN = {
  price: "The current market price of Bitcoin.",
  ma200:
    "The average closing price across the previous 200 days — a slow-moving line that shows Bitcoin's long-term trend.",
  realized:
    "The average on-chain acquisition cost of all Bitcoin currently in circulation — the network's aggregate cost basis.",
  mining:
    "A modelled estimate of the average electricity cost of mining one new Bitcoin, from live hashrate and documented assumptions. An estimate — not an exact break-even, support level or price floor.",
} as const;

export function BtcPriceChart({ height = 380 }: { height?: number }) {
  const [range, setRange] = useState<PriceRangeKey>("1Y");
  const [cache, setCache] = useState<Record<string, PricePoint[]>>({});
  const [status, setStatus] = useState<{ loadingKey: string | null; errorKey: string | null }>({
    loadingKey: null,
    errorKey: null,
  });

  const intradayHours = INTRADAY_RANGES[range];

  useEffect(() => {
    if (!intradayHours || cache[range] || status.loadingKey === range) return;
    let cancelled = false;
    setStatus({ loadingKey: range, errorKey: null });
    fetchIntraday(intradayHours)
      .then((pts) => {
        if (cancelled) return;
        if (pts.length) {
          setCache((c) => ({ ...c, [range]: pts }));
          setStatus({ loadingKey: null, errorKey: null });
        } else {
          setStatus({ loadingKey: null, errorKey: range });
        }
      })
      .catch(() => {
        if (!cancelled) setStatus({ loadingKey: null, errorKey: range });
      });
    return () => {
      cancelled = true;
    };
  }, [range, intradayHours, cache, status.loadingKey]);

  const liveData = cache[range];
  // 1D needs the live fetch; 1W falls back to the daily snapshot until hourly
  // loads. Intraday points get the latest daily reference values attached —
  // both references are daily metrics, so within a day they are constants.
  const data: ContextPoint[] = useMemo(() => {
    const attach = (pts: PricePoint[]) => pts.map((p) => ({ ...p, ...referenceValuesAt(p.ts) }));
    if (range === "1D") return liveData ? attach(liveData) : [];
    if (range === "1W") return liveData ? attach(liveData) : contextSeries("1W");
    return contextSeries(range);
  }, [range, liveData]);

  const isIntraday = range === "1D";
  const loading = range === "1D" && status.loadingKey === "1D" && !liveData;
  const error = range === "1D" && status.errorKey === "1D";

  const first = data[0]?.price ?? 0;
  const last = data[data.length - 1]?.price ?? 0;
  const up = last >= first;
  const stroke = up ? "#16c784" : "#ff5d5d";
  const changePct = first > 0 ? (last / first - 1) * 100 : 0;
  const log = range === "All";
  const longSpan = range === "All" || range === "1Y";

  const hasMa = data.some((d) => d.ma200 != null);
  const hasRealized = data.some((d) => d.realized != null);
  const hasMining = data.some((d) => d.mining != null);

  const rangeWord = range === "All" ? "all time" : range === "1D" ? "the last 24h" : range;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="text-[12px] text-ink-400">
          {data.length > 1 ? (
            <>
              <span className={up ? "text-signal-green" : "text-signal-red"}>
                {up ? "▲" : "▼"} {changePct >= 0 ? "+" : ""}
                {changePct.toFixed(1)}%
              </span>{" "}
              over {rangeWord}
              {liveData && <span className="text-ink-500"> · live</span>}
            </>
          ) : (
            <span className="text-ink-500">&nbsp;</span>
          )}
        </div>
        <SegmentedControl
          aria-label="Price range"
          options={PRICE_RANGES.map((r) => ({ key: r.key, label: r.label }))}
          value={range}
          onChange={setRange}
        />
      </div>

      <div className="fade-up relative" style={{ width: "100%", height }}>
        {/* 1D live states (1W has a daily fallback, so it never blocks) */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-[12px] text-ink-400">
            Loading live 24h data…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-center px-6">
            <span className="text-[12.5px] text-ink-400 max-w-xs leading-relaxed">
              Couldn&apos;t load live 24-hour data right now. Try another range, or check back
              shortly.
            </span>
          </div>
        )}

        {data.length > 1 && (
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 8, left: 6 }}>
              <defs>
                <linearGradient id="btc-price-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.025)" vertical={false} />
              <XAxis
                dataKey="ts"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v) =>
                  format(new Date(v), isIntraday ? "HH:mm" : longSpan ? "MMM ''yy" : "MMM d")
                }
                stroke="#384353"
                tick={{ fill: "#6f7c8e", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                minTickGap={isIntraday ? 40 : 48}
              />
              <YAxis
                scale={log ? "log" : "linear"}
                domain={["auto", "auto"]}
                tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`)}
                stroke="#384353"
                tick={{ fill: "#9aa6b4", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip
                contentStyle={{ outline: "none" }}
                cursor={{ stroke: "rgba(255,255,255,0.14)", strokeWidth: 1 }}
                labelFormatter={(v) =>
                  format(new Date(v as number), isIntraday ? "MMM d, HH:mm" : "MMM d, yyyy")
                }
                formatter={(value: number) => fmtUsd(value as number)}
              />
              <Area
                type="monotone"
                dataKey="price"
                name="Bitcoin price"
                stroke={stroke}
                strokeWidth={2}
                fill="url(#btc-price-fill)"
                dot={false}
                isAnimationActive
                animationDuration={700}
              />
              {hasMa && (
                <Line
                  type="monotone"
                  dataKey="ma200"
                  name="200-day average"
                  stroke={MA_COLOR}
                  strokeWidth={1.25}
                  strokeDasharray="5 4"
                  strokeOpacity={0.8}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive
                  animationDuration={700}
                />
              )}
              {hasRealized && (
                <Line
                  type="monotone"
                  dataKey="realized"
                  name="Realized price"
                  stroke={RP_COLOR}
                  strokeWidth={1.25}
                  strokeOpacity={0.85}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive
                  animationDuration={700}
                />
              )}
              {hasMining && (
                <Line
                  type="monotone"
                  dataKey="mining"
                  name="Estimated Mining Cost"
                  stroke={MC_COLOR}
                  strokeWidth={1.25}
                  strokeDasharray="2 3"
                  strokeOpacity={0.85}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive
                  animationDuration={700}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {data.length > 1 && (
        // pb clears the card's corner watermark on narrow screens, where the
        // four legend keys wrap onto the watermark's line
        <div className="mt-3 pb-4 sm:pb-0 flex items-center gap-x-5 gap-y-2 flex-wrap">
          <LegendKey label="Bitcoin price" explain={SERIES_EXPLAIN.price}>
            <svg width="18" height="10" aria-hidden="true">
              <rect x="0" y="4" width="18" height="6" rx="1.5" fill={stroke} opacity="0.25" />
              <line x1="0" y1="3" x2="18" y2="3" stroke={stroke} strokeWidth="2" />
            </svg>
          </LegendKey>
          {hasMa && (
            <LegendKey label="200-day average" explain={SERIES_EXPLAIN.ma200}>
              <svg width="18" height="10" aria-hidden="true">
                <line x1="0" y1="5" x2="18" y2="5" stroke={MA_COLOR} strokeWidth="1.5" strokeDasharray="4 3" />
              </svg>
            </LegendKey>
          )}
          {hasRealized && (
            <LegendKey label="Realized price" explain={SERIES_EXPLAIN.realized}>
              <svg width="18" height="10" aria-hidden="true">
                <line x1="0" y1="5" x2="18" y2="5" stroke={RP_COLOR} strokeWidth="1.5" />
              </svg>
            </LegendKey>
          )}
          {hasMining && (
            <LegendKey label="Estimated Mining Cost" explain={SERIES_EXPLAIN.mining}>
              <svg width="18" height="10" aria-hidden="true">
                <line x1="0" y1="5" x2="18" y2="5" stroke={MC_COLOR} strokeWidth="1.5" strokeDasharray="2 3" />
              </svg>
            </LegendKey>
          )}
        </div>
      )}
    </div>
  );
}

// Legend entry with a beginner-friendly hover/focus explanation of the line.
function LegendKey({
  label,
  explain,
  children,
}: {
  label: string;
  explain: string;
  children: ReactNode;
}) {
  return (
    <span className="relative group inline-flex items-center gap-1.5 cursor-help" tabIndex={0}>
      {children}
      <span className="text-[10.5px] uppercase tracking-[0.1em] text-ink-400">{label}</span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 mb-2 w-60 rounded-lg border border-white/[0.08] bg-ink-850 px-3 py-2 text-[11px] normal-case tracking-normal leading-relaxed text-ink-250 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 shadow-card z-10"
      >
        {explain}
      </span>
    </span>
  );
}
