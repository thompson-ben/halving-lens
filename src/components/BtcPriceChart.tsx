"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { PRICE_RANGES, priceSeries, type PricePoint, type PriceRangeKey } from "@/lib/btcPrice";
import { fmtUsd } from "@/lib/format";
import { SegmentedControl } from "./SegmentedControl";

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
  // 1D needs the live fetch; 1W falls back to the daily snapshot until hourly loads.
  const data = useMemo(() => {
    if (range === "1D") return liveData ?? [];
    if (range === "1W") return liveData ?? priceSeries("1W");
    return priceSeries(range);
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
            <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 8, left: 6 }}>
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
                formatter={(value: number) => [fmtUsd(value as number), "BTC price"]}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={stroke}
                strokeWidth={2}
                fill="url(#btc-price-fill)"
                dot={false}
                isAnimationActive
                animationDuration={700}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
